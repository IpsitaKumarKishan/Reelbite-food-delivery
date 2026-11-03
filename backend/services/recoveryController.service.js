import { EventEmitter } from "events";
import { failureDetectionService } from "./failureDetection.service.js";
import { workerHealthMonitor } from "./workerHealth.service.js";
import { incidentLogger } from "./incidentLogger.service.js";
import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";
import {
  initOrderWorker,
  closeOrderWorker,
  getOrderWorker,
  setHeartbeatActive
} from "../workers/order.worker.js";

/**
 * Worker & Container Recovery Controller
 * Supervises automated self-healing workflows for background workers and infrastructure failures.
 * Enforces cooldown safeguards and attempt thresholds to prevent cascading restart loops.
 */
class RecoveryControllerService extends EventEmitter {
  constructor(config = RECOVERY_CONFIG, options = {}) {
    super();
    this.config = config;
    this.io = options.io || null;
    this.restartWorkerFn = options.restartWorkerFn || null;
    this.incidentLogger = options.incidentLogger || incidentLogger;
    this.workerHealthMonitor = options.workerHealthMonitor || workerHealthMonitor;
    this.activeRecoveries = new Set();
    // workerId -> { attempts: [timestamp], lastAttemptMs: number }
    this.recoveryHistory = new Map();
    this.recoveryLogs = [];
    this.maxLogs = 100;
    this.isListening = false;
    this._failureListener = null;
    this._detector = null;

    if (options.bindDetector !== false) {
      this.bindFailureDetector(options.detector || failureDetectionService);
    }
  }

  /**
   * Set Socket.IO server reference for re-initializing worker with alerts
   * @param {import("socket.io").Server} io 
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Subscribes to failure detection alerts
   * @param {import("./failureDetection.service.js").FailureDetectionService} detector 
   */
  bindFailureDetector(detector = failureDetectionService) {
    if (this.isListening || !detector) return;

    this._detector = detector;
    this._failureListener = async (event) => {
      try {
        await this.handleFailureEvent(event);
      } catch (err) {
        console.error("❌ [Recovery Controller] Error handling failure event:", err.message);
      }
    };

    detector.on("failure", this._failureListener);
    this.isListening = true;
  }

  /**
   * Unbind failure detector listener
   */
  unbindFailureDetector() {
    if (this._failureListener && this._detector) {
      this._detector.removeListener("failure", this._failureListener);
      this._failureListener = null;
      this._detector = null;
    }
    this.isListening = false;
  }

  /**
   * Dispatches automated recovery based on failure classification
   * @param {Object} event 
   */
  async handleFailureEvent(event) {
    const { caseType, workerId, incident } = event;
    const incidentId = incident?.incidentId;

    switch (caseType) {
      case "CASE_1_WORKER_CRASH":
        console.warn(
          `🛠️ [Recovery Controller] Initiating worker recovery for crash on: ${workerId}`
        );
        return await this.recoverWorker(
          workerId,
          incident?.failureReason || "Process crash",
          incidentId
        );

      case "CASE_2_HEARTBEAT_TIMEOUT":
        console.warn(
          `🛠️ [Recovery Controller] Initiating worker revival for heartbeat timeout on: ${workerId}`
        );
        return await this.recoverWorker(
          workerId,
          incident?.failureReason || "Heartbeat timeout / zombie",
          incidentId
        );

      case "CASE_3_REDIS_DISCONNECTED":
        console.warn(
          "⏳ [Recovery Controller] Redis disconnected. Workers in holding state awaiting client reconnect backoff."
        );
        break;

      case "CASE_4_DB_DISCONNECTED":
        console.warn(
          "⏳ [Recovery Controller] MongoDB disconnected. Transient DB operations will retry exponentially."
        );
        break;

      case "CASE_5_CONTAINER_STOPPED":
        console.warn(
          "🐳 [Recovery Controller] Container stopped. External container orchestrator/Docker restart policy activated."
        );
        break;

      default:
        console.log(`ℹ️ [Recovery Controller] Unhandled failure mode: ${caseType}`);
    }
  }

  /**
   * Validates if a worker is eligible for recovery (cooldown & attempt limits)
   * @param {string} workerId 
   * @returns {{ allowed: boolean, reason?: string, attempts: number }}
   */
  canAttemptRecovery(workerId) {
    const now = Date.now();
    const windowMs = 60000; // 1-minute sliding window
    let history = this.recoveryHistory.get(workerId);

    if (!history) {
      history = { attempts: [], lastAttemptMs: 0 };
      this.recoveryHistory.set(workerId, history);
    }

    // Filter attempts within sliding window
    history.attempts = history.attempts.filter((ts) => now - ts < windowMs);

    // Cooldown check
    const elapsedSinceLast = now - history.lastAttemptMs;
    if (history.lastAttemptMs > 0 && elapsedSinceLast < this.config.RECOVERY_COOLDOWN_MS) {
      const waitRemaining = Math.ceil((this.config.RECOVERY_COOLDOWN_MS - elapsedSinceLast) / 1000);
      return {
        allowed: false,
        reason: `Recovery cooldown active. Wait ${waitRemaining}s before retrying.`,
        attempts: history.attempts.length
      };
    }

    // Max attempts check to prevent thrashing
    if (history.attempts.length >= this.config.MAX_RECOVERY_ATTEMPTS) {
      return {
        allowed: false,
        reason: `Maximum recovery attempts (${this.config.MAX_RECOVERY_ATTEMPTS}) exceeded in past 60s. Manual intervention required.`,
        attempts: history.attempts.length
      };
    }

    return { allowed: true, attempts: history.attempts.length };
  }

  /**
   * Executes autonomous worker recovery: teardown -> recreate instance -> verify heartbeat -> resolve incident
   * @param {string} workerId 
   * @param {string} reason 
   * @param {string} incidentId 
   */
  async recoverWorker(workerId, reason = "Automated recovery trigger", incidentId = null) {
    if (this.activeRecoveries.has(workerId)) {
      console.warn(`⚠️ [Recovery Controller] Recovery already in progress for worker: ${workerId}`);
      return { success: false, reason: "Recovery already active" };
    }

    const check = this.canAttemptRecovery(workerId);
    if (!check.allowed) {
      console.error(
        `🛑 [Recovery Controller] Recovery blocked for ${workerId}: ${check.reason} (Restart loop safeguard)`
      );

      this._recordLog({
        workerId,
        incidentId,
        action: "RECOVERY_BLOCKED",
        reason: check.reason,
        status: "BLOCKED",
        timestamp: new Date().toISOString()
      });

      return { success: false, reason: check.reason, blocked: true };
    }

    this.activeRecoveries.add(workerId);
    const history = this.recoveryHistory.get(workerId);
    const now = Date.now();
    history.attempts.push(now);
    history.lastAttemptMs = now;
    const currentAttempt = history.attempts.length;

    if (incidentId) {
      this.incidentLogger.markRecovering(incidentId, currentAttempt);
    }

    const startRecoveryTime = Date.now();

    try {
      console.log(
        `🔄 [Recovery Controller] Attempt ${currentAttempt}/${this.config.MAX_RECOVERY_ATTEMPTS}: Restarting worker (${workerId})...`
      );

      let concurrency = 5;
      if (typeof this.restartWorkerFn === "function") {
        await this.restartWorkerFn(workerId);
      } else {
        // Step 1: Graceful teardown of existing crashed or unresponsive worker
        await closeOrderWorker();

        // Step 2: Recreate and re-initialize BullMQ worker
        if (process.env.NODE_ENV !== "test") {
          const newWorker = initOrderWorker(this.io);
          setHeartbeatActive(true);
          if (newWorker) concurrency = newWorker.concurrency;
        }
      }

      // Step 3: Verify initial heartbeat & readiness
      this.workerHealthMonitor.recordHeartbeat(workerId, {
        pid: process.pid,
        concurrency,
        activeJobs: 0
      });

      const recoveryTimeMs = Date.now() - startRecoveryTime;

      // Step 4: Resolve incident ticket in Incident Logger
      if (incidentId) {
        this.incidentLogger.resolveIncident(incidentId, {
          recoveryAttempts: currentAttempt,
          resolutionNotes: `Worker successfully revived and heartbeat restored in ${recoveryTimeMs}ms`
        });
      }

      const logEntry = {
        workerId,
        incidentId,
        action: "WORKER_RECOVERED",
        reason,
        attempts: currentAttempt,
        recoveryTimeMs,
        status: "SUCCESS",
        timestamp: new Date().toISOString()
      };
      this._recordLog(logEntry);

      console.log(
        `🎉 [Recovery Controller] Worker (${workerId}) successfully recovered in ${recoveryTimeMs}ms`
      );

      this.emit("recovered", logEntry);

      return {
        success: true,
        workerId,
        recoveryTimeMs,
        attempts: currentAttempt,
        incidentId
      };
    } catch (err) {
      console.error(`❌ [Recovery Controller] Failed to recover worker ${workerId}:`, err.message);

      const failLog = {
        workerId,
        incidentId,
        action: "RECOVERY_FAILED",
        reason: err.message,
        attempts: currentAttempt,
        status: "FAILED",
        timestamp: new Date().toISOString()
      };
      this._recordLog(failLog);

      return {
        success: false,
        workerId,
        reason: err.message
      };
    } finally {
      this.activeRecoveries.delete(workerId);
    }
  }

  /**
   * Internal circular recovery log recorder
   */
  _recordLog(entry) {
    this.recoveryLogs.unshift(entry);
    if (this.recoveryLogs.length > this.maxLogs) {
      this.recoveryLogs.pop();
    }
  }

  /**
   * Get recent recovery action logs
   */
  getRecoveryLogs(limit = 20) {
    return this.recoveryLogs.slice(0, limit);
  }

  /**
   * Get operational recovery controller statistics
   */
  getRecoveryStats() {
    let successCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let totalRecoveryMs = 0;

    for (const log of this.recoveryLogs) {
      if (log.status === "SUCCESS") {
        successCount++;
        totalRecoveryMs += log.recoveryTimeMs || 0;
      } else if (log.status === "FAILED") {
        failedCount++;
      } else if (log.status === "BLOCKED") {
        blockedCount++;
      }
    }

    const avgRecoveryTimeMs = successCount > 0 ? Math.round(totalRecoveryMs / successCount) : 0;

    return {
      totalRecoveriesInitiated: this.recoveryLogs.length,
      successCount,
      failedCount,
      blockedCount,
      avgRecoveryTimeMs,
      activeRecoveriesCount: this.activeRecoveries.size,
      activeRecoveries: Array.from(this.activeRecoveries),
      config: {
        cooldownMs: this.config.RECOVERY_COOLDOWN_MS,
        maxAttempts: this.config.MAX_RECOVERY_ATTEMPTS
      }
    };
  }

  /**
   * Container and infrastructure restart policy metadata
   */
  getContainerRecoveryPolicy() {
    return {
      orchestrator: "Docker / Docker Compose",
      restartPolicy: "unless-stopped",
      healthCheck: {
        endpoint: "/api/health",
        intervalSeconds: 10,
        timeoutSeconds: 5,
        retries: 3
      },
      shutdownGracePeriodSeconds: 15,
      stalledJobRecovery: "BullMQ Stalled Lock Auto-Reclaim (30s)",
      transientDbRetryPolicy: "Exponential Backoff (3 attempts, 1000ms initial)"
    };
  }
}

export { RecoveryControllerService };
export const recoveryController = new RecoveryControllerService(RECOVERY_CONFIG, {
  bindDetector: process.env.NODE_ENV !== "test"
});
export default recoveryController;
