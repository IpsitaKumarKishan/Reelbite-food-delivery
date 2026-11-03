import { EventEmitter } from "events";
import { workerHealthMonitor } from "./workerHealth.service.js";
import { redisConnectionMonitor } from "./redisConnectionMonitor.service.js";
import { dbConnectionMonitor } from "./dbConnectionMonitor.service.js";
import { incidentLogger } from "./incidentLogger.service.js";
import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";

/**
 * Autonomous Failure Detection Service
 * Detects component failures across workers, Redis broker, MongoDB Atlas, and container lifecycle.
 * Coordinates incident logging and dispatches recovery alerts.
 */
class FailureDetectionService extends EventEmitter {
  constructor(config = RECOVERY_CONFIG) {
    super();
    this.config = config;
    this.isRunning = false;
    this.watchdogInterval = null;

    this._bindSubsystemMonitors();
  }

  _bindSubsystemMonitors() {
    // ─────────────────────────────────────────────────────────────────────────
    // CASE 2: Worker Heartbeat Timeout (Unresponsive / Zombie Worker)
    // ─────────────────────────────────────────────────────────────────────────
    workerHealthMonitor.onWorkerUnhealthy((worker, reason) => {
      this.detectHeartbeatTimeout(worker, reason);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 3: Redis Connection Interruption
    // ─────────────────────────────────────────────────────────────────────────
    redisConnectionMonitor.on("disconnected", ({ timestamp, reason }) => {
      this.detectRedisDisconnect(timestamp, reason);
    });

    redisConnectionMonitor.on("ready", ({ timestamp }) => {
      this.handleRedisRestored(timestamp);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CASE 4: MongoDB Atlas Disconnection
    // ─────────────────────────────────────────────────────────────────────────
    dbConnectionMonitor.on("disconnected", ({ timestamp, reason }) => {
      this.detectDbDisconnect(timestamp, reason);
    });

    dbConnectionMonitor.on("reconnected", ({ timestamp }) => {
      this.handleDbRestored(timestamp);
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FAILURE DETECTION HANDLERS (CASE 1 - CASE 5)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * CASE 1: Detect unexpected worker crash
   */
  detectWorkerCrash(workerId, reason = "Worker process terminated abruptly") {
    const worker = workerHealthMonitor.getWorker(workerId);
    const failureTimestamp = worker?.lastHeartbeatMs || Date.now() - 100;

    workerHealthMonitor.setWorkerStatus(workerId, "UNHEALTHY", reason);

    const incident = incidentLogger.createIncident({
      componentName: "WORKER",
      failureType: "WORKER_CRASH",
      failureTimestamp,
      failureReason: reason,
      metadata: {
        workerId,
        pid: worker?.pid,
        activeJobs: worker?.activeJobs || 0
      }
    });

    this.emit("failure", {
      caseType: "CASE_1_WORKER_CRASH",
      incident,
      workerId,
      worker
    });

    return incident;
  }

  /**
   * CASE 2: Detect worker heartbeat timeout
   */
  detectHeartbeatTimeout(worker, reason) {
    const failureTimestamp = worker.lastHeartbeatMs || Date.now() - this.config.WORKER_HEARTBEAT_TIMEOUT_MS;

    const incident = incidentLogger.createIncident({
      componentName: "WORKER",
      failureType: "HEARTBEAT_TIMEOUT",
      failureTimestamp,
      failureReason: reason || `Worker heartbeat lapsed for ${worker.heartbeatAgeMs || 0}ms`,
      metadata: {
        workerId: worker.workerId,
        pid: worker.pid,
        missedHeartbeats: worker.missedHeartbeats,
        activeJobs: worker.activeJobs
      }
    });

    this.emit("failure", {
      caseType: "CASE_2_HEARTBEAT_TIMEOUT",
      incident,
      workerId: worker.workerId,
      worker
    });

    return incident;
  }

  /**
   * CASE 3: Detect Redis connection interruption
   */
  detectRedisDisconnect(timestamp, reason) {
    const incident = incidentLogger.createIncident({
      componentName: "REDIS",
      failureType: "REDIS_DISCONNECTED",
      failureTimestamp: timestamp,
      failureReason: `Redis message broker disconnected: ${reason}`,
      metadata: { reason }
    });

    redisConnectionMonitor.setActiveIncidentId(incident.incidentId);

    this.emit("failure", {
      caseType: "CASE_3_REDIS_DISCONNECTED",
      incident,
      component: "REDIS"
    });

    return incident;
  }

  handleRedisRestored(timestamp) {
    const activeId = redisConnectionMonitor.getActiveIncidentId();
    if (activeId) {
      incidentLogger.resolveIncident(activeId, {
        resolutionNotes: "Redis connection re-established and authenticated."
      });
      redisConnectionMonitor.setActiveIncidentId(null);
    }
  }

  /**
   * CASE 4: Detect MongoDB connection interruption
   */
  detectDbDisconnect(timestamp, reason) {
    const incident = incidentLogger.createIncident({
      componentName: "MONGODB",
      failureType: "DB_DISCONNECTED",
      failureTimestamp: timestamp,
      failureReason: `MongoDB Atlas connection lost: ${reason}`,
      metadata: { reason }
    });

    dbConnectionMonitor.setActiveIncidentId(incident.incidentId);

    this.emit("failure", {
      caseType: "CASE_4_DB_DISCONNECTED",
      incident,
      component: "MONGODB"
    });

    return incident;
  }

  handleDbRestored(timestamp) {
    const activeId = dbConnectionMonitor.getActiveIncidentId();
    if (activeId) {
      incidentLogger.resolveIncident(activeId, {
        resolutionNotes: "MongoDB Atlas connection re-established."
      });
      dbConnectionMonitor.setActiveIncidentId(null);
    }
  }

  /**
   * CASE 5: Detect Container / Process Termination
   */
  detectContainerShutdown(signal = "SIGTERM") {
    const incident = incidentLogger.createIncident({
      componentName: "CONTAINER",
      failureType: "CONTAINER_SHUTDOWN",
      failureTimestamp: new Date().toISOString(),
      failureReason: `Container received termination signal (${signal}). Docker restart policy engaged.`,
      metadata: { signal, pid: process.pid }
    });

    this.emit("failure", {
      caseType: "CASE_5_CONTAINER_SHUTDOWN",
      incident,
      component: "CONTAINER"
    });

    return incident;
  }

  /**
   * Start continuous background watchdog monitoring
   */
  startMonitoring(intervalMs = this.config.WATCHDOG_CHECK_INTERVAL_MS) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start worker health watchdog
    workerHealthMonitor.startHeartbeatWatchdog(intervalMs);

    this.watchdogInterval = setInterval(() => {
      workerHealthMonitor.checkHeartbeats();
    }, intervalMs);

    if (this.watchdogInterval.unref) {
      this.watchdogInterval.unref();
    }

    console.log(`🛡️ [Failure Detection Service] Continuous failure monitoring started (Watchdog Interval: ${intervalMs}ms)`);
  }

  /**
   * Stop background watchdog monitoring
   */
  stopMonitoring() {
    this.isRunning = false;
    workerHealthMonitor.stopHeartbeatWatchdog();

    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  /**
   * Subscribe to detected failure events
   * @param {Function} callback (failureEvent) => void
   */
  onFailure(callback) {
    this.on("failure", callback);
    return () => this.off("failure", callback);
  }

  /**
   * Get system reliability overview
   */
  getStatus() {
    return {
      monitoringActive: this.isRunning,
      metrics: incidentLogger.getMetrics(),
      redis: redisConnectionMonitor.getStatus(),
      db: dbConnectionMonitor.getStatus(),
      workerFleet: workerHealthMonitor.getSummary()
    };
  }
}

export { FailureDetectionService };
export const failureDetectionService = new FailureDetectionService();
export default failureDetectionService;

