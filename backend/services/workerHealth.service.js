import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";

/**
 * Worker Health Monitoring Service
 * Tracks worker availability, heartbeats, process status, response time, and job throughput.
 * Detects missed heartbeats and notifies failure detection and recovery controllers.
 */
class WorkerHealthService {
  constructor(config = RECOVERY_CONFIG) {
    this.config = config;
    this.workers = new Map();
    this.unhealthyListeners = new Set();
    this.watchdogHandle = null;
  }

  /**
   * Subscribe to worker unhealthy state changes
   * @param {Function} callback (worker, reason) => void
   */
  onWorkerUnhealthy(callback) {
    this.unhealthyListeners.add(callback);
    return () => this.unhealthyListeners.delete(callback);
  }

  _notifyUnhealthy(worker, reason) {
    for (const listener of this.unhealthyListeners) {
      try {
        listener(worker, reason);
      } catch (err) {
        console.error("❌ [Worker Health Monitor] Error in unhealthy listener:", err.message);
      }
    }
  }

  /**
   * Register a worker instance in the fleet registry
   * @param {string} workerId 
   * @param {Object} metadata 
   */
  registerWorker(workerId, metadata = {}) {
    const now = Date.now();
    const existing = this.workers.get(workerId) || {};

    const workerRecord = {
      workerId,
      pid: metadata.pid || process.pid,
      status: metadata.status || "ACTIVE", // ACTIVE | IDLE | UNHEALTHY | RECOVERING | DRAINING | OFFLINE
      scalingType: metadata.scalingType || "VERTICAL_DYNAMIC_CONCURRENCY",
      concurrency: metadata.concurrency || 5,
      activeJobs: metadata.activeJobs || 0,
      completedJobs: existing.completedJobs || 0,
      failedJobs: existing.failedJobs || 0,
      startedAt: existing.startedAt || new Date(now).toISOString(),
      lastHeartbeat: new Date(now).toISOString(),
      lastHeartbeatMs: now,
      lastSuccessfulJobAt: existing.lastSuccessfulJobAt || null,
      lastJobFinishedAt: existing.lastJobFinishedAt || null,
      errorCount: existing.errorCount || 0,
      lastError: existing.lastError || null,
      missedHeartbeats: 0,
      unhealthyReason: null,
      unhealthySince: null,
      recentDurations: existing.recentDurations || []
    };

    this.workers.set(workerId, workerRecord);
    return workerRecord;
  }

  /**
   * Records a periodic liveness heartbeat emitted by a worker
   * @param {string} workerId 
   * @param {Object} metrics 
   */
  recordHeartbeat(workerId, metrics = {}) {
    const now = Date.now();
    let worker = this.workers.get(workerId);

    if (!worker) {
      worker = this.registerWorker(workerId, metrics);
    }

    const wasUnhealthy = worker.status === "UNHEALTHY" || worker.status === "TIMEOUT";

    worker.lastHeartbeat = new Date(now).toISOString();
    worker.lastHeartbeatMs = now;
    worker.missedHeartbeats = 0;
    worker.unhealthyReason = null;
    worker.unhealthySince = null;

    if (metrics.concurrency !== undefined) worker.concurrency = metrics.concurrency;
    if (metrics.activeJobs !== undefined) worker.activeJobs = metrics.activeJobs;
    if (metrics.pid !== undefined) worker.pid = metrics.pid;

    // Restore to healthy status if recovering from temporary heartbeat lapse
    if (wasUnhealthy && worker.status !== "OFFLINE" && worker.status !== "DRAINING") {
      worker.status = (worker.activeJobs || 0) > 0 ? "ACTIVE" : "IDLE";
      console.log(`💚 [Worker Health Monitor] Worker (${workerId}) restored to ${worker.status} after receiving heartbeat.`);
    }

    return worker;
  }

  /**
   * Update dynamic concurrency or status of a worker
   * @param {string} workerId 
   * @param {Object} updates 
   */
  updateWorker(workerId, updates = {}) {
    const worker = this.workers.get(workerId);
    if (!worker) return null;

    Object.assign(worker, updates, {
      lastHeartbeat: new Date().toISOString(),
      lastHeartbeatMs: Date.now()
    });

    this.workers.set(workerId, worker);
    return worker;
  }

  /**
   * Evaluates worker heartbeats and marks delinquent workers as UNHEALTHY
   * @param {number} timeoutMs 
   * @returns {Array<Object>} List of newly detected unhealthy workers
   */
  checkHeartbeats(timeoutMs = this.config.WORKER_HEARTBEAT_TIMEOUT_MS) {
    const now = Date.now();
    const newlyUnhealthy = [];

    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.status === "OFFLINE" || worker.status === "DRAINING" || worker.status === "RECOVERING") {
        continue;
      }

      const elapsedMs = now - (worker.lastHeartbeatMs || now);

      if (elapsedMs > timeoutMs) {
        worker.missedHeartbeats = Math.floor(elapsedMs / this.config.WORKER_HEARTBEAT_INTERVAL_MS);

        if (worker.status !== "UNHEALTHY") {
          worker.status = "UNHEALTHY";
          worker.unhealthySince = new Date(now).toISOString();
          worker.unhealthyReason = `Heartbeat timeout: No ping received for ${elapsedMs}ms (threshold: ${timeoutMs}ms)`;

          console.warn(`⚠️ [Worker Health Monitor] Worker (${workerId}) marked UNHEALTHY: ${worker.unhealthyReason}`);
          newlyUnhealthy.push(worker);
          this._notifyUnhealthy(worker, "HEARTBEAT_TIMEOUT");
        }
      }
    }

    return newlyUnhealthy;
  }

  /**
   * Explicitly set status of a worker (e.g. from Recovery Controller)
   */
  setWorkerStatus(workerId, status, reason = null) {
    const worker = this.workers.get(workerId);
    if (!worker) return null;

    worker.status = status;
    worker.lastHeartbeat = new Date().toISOString();
    worker.lastHeartbeatMs = Date.now();

    if (reason) {
      worker.unhealthyReason = reason;
      if (status === "UNHEALTHY") {
        worker.unhealthySince = new Date().toISOString();
      }
    } else if (status === "ACTIVE" || status === "IDLE") {
      worker.unhealthyReason = null;
      worker.unhealthySince = null;
      worker.missedHeartbeats = 0;
    }

    return worker;
  }

  /**
   * Record when a worker starts processing a job
   */
  recordJobStart(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = Math.max(0, (worker.activeJobs || 0) + 1);
      if (worker.status !== "UNHEALTHY" && worker.status !== "RECOVERING") {
        worker.status = "ACTIVE";
      }
      worker.lastHeartbeat = new Date().toISOString();
      worker.lastHeartbeatMs = Date.now();
    }
  }

  /**
   * Record successful job execution
   */
  recordJobComplete(workerId, durationMs = 0) {
    const now = Date.now();
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = Math.max(0, (worker.activeJobs || 1) - 1);
      worker.completedJobs = (worker.completedJobs || 0) + 1;
      worker.lastJobFinishedAt = new Date(now).toISOString();
      worker.lastSuccessfulJobAt = worker.lastJobFinishedAt;
      worker.lastHeartbeat = worker.lastJobFinishedAt;
      worker.lastHeartbeatMs = now;

      if (!worker.recentDurations) worker.recentDurations = [];
      if (durationMs > 0) {
        worker.recentDurations.push(durationMs);
        if (worker.recentDurations.length > 20) worker.recentDurations.shift();
      }

      if (worker.activeJobs === 0 && worker.status === "ACTIVE") {
        worker.status = "IDLE";
      }
    }
  }

  /**
   * Record job failure
   */
  recordJobFailure(workerId, errorMessage = "Job execution failed") {
    const now = Date.now();
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = Math.max(0, (worker.activeJobs || 1) - 1);
      worker.failedJobs = (worker.failedJobs || 0) + 1;
      worker.errorCount = (worker.errorCount || 0) + 1;
      worker.lastError = errorMessage;
      worker.lastHeartbeat = new Date(now).toISOString();
      worker.lastHeartbeatMs = now;

      if (worker.activeJobs === 0 && worker.status === "ACTIVE") {
        worker.status = "IDLE";
      }
    }
  }

  /**
   * Mark a worker as offline or deregistered
   */
  deregisterWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.status = "OFFLINE";
      worker.lastHeartbeat = new Date().toISOString();
      worker.lastHeartbeatMs = Date.now();
    }
  }

  /**
   * Get specific worker by ID
   */
  getWorker(workerId) {
    const worker = this.workers.get(workerId);
    if (!worker) return null;
    const now = Date.now();
    const started = new Date(worker.startedAt).getTime();
    const uptimeSeconds = Math.max(0, Math.floor((now - started) / 1000));
    const heartbeatAgeMs = Math.max(0, now - (worker.lastHeartbeatMs || now));
    const avgDuration = worker.recentDurations?.length > 0
      ? Math.round(worker.recentDurations.reduce((a, b) => a + b, 0) / worker.recentDurations.length)
      : 0;

    return {
      ...worker,
      uptimeSeconds,
      heartbeatAgeMs,
      avgJobDurationMs: avgDuration
    };
  }

  /**
   * Get all registered worker details with uptime and latency calculations
   */
  getWorkers() {
    const now = Date.now();
    return Array.from(this.workers.values()).map((w) => {
      const started = new Date(w.startedAt).getTime();
      const uptimeSeconds = Math.max(0, Math.floor((now - started) / 1000));
      const heartbeatAgeMs = Math.max(0, now - (w.lastHeartbeatMs || now));
      const avgDuration = w.recentDurations?.length > 0
        ? Math.round(w.recentDurations.reduce((a, b) => a + b, 0) / w.recentDurations.length)
        : 0;

      return {
        ...w,
        uptimeSeconds,
        heartbeatAgeMs,
        avgJobDurationMs: avgDuration
      };
    });
  }

  /**
   * Get aggregated worker health summary
   */
  getSummary() {
    const list = this.getWorkers();
    let totalConcurrency = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let healthyCount = 0;
    let unhealthyCount = 0;
    let recoveringCount = 0;

    for (const w of list) {
      totalConcurrency += w.concurrency || 0;
      totalActive += w.activeJobs || 0;
      totalCompleted += w.completedJobs || 0;
      totalFailed += w.failedJobs || 0;

      if (w.status === "ACTIVE" || w.status === "IDLE") {
        healthyCount++;
      } else if (w.status === "UNHEALTHY" || w.status === "TIMEOUT") {
        unhealthyCount++;
      } else if (w.status === "RECOVERING") {
        recoveringCount++;
      }
    }

    const availabilityPercent = list.length > 0
      ? parseFloat(((healthyCount / list.length) * 100).toFixed(1))
      : 0;

    const overallHealth = list.length === 0
      ? "UNAVAILABLE"
      : recoveringCount > 0
      ? "RECOVERING"
      : unhealthyCount > 0
      ? "DEGRADED"
      : healthyCount === list.length
      ? "HEALTHY"
      : "OFFLINE";

    return {
      totalWorkers: list.length,
      activeWorkers: healthyCount,
      unhealthyWorkers: unhealthyCount,
      recoveringWorkers: recoveringCount,
      availabilityPercent,
      totalConcurrency,
      totalActiveJobs: totalActive,
      totalCompletedJobs: totalCompleted,
      totalFailedJobs: totalFailed,
      health: overallHealth,
      scalingType: "VERTICAL_DYNAMIC_CONCURRENCY",
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Starts periodic background watchdog evaluating heartbeats
   */
  startHeartbeatWatchdog(intervalMs = this.config.WATCHDOG_CHECK_INTERVAL_MS) {
    if (this.watchdogHandle) return;

    this.watchdogHandle = setInterval(() => {
      this.checkHeartbeats();
    }, intervalMs);

    if (this.watchdogHandle.unref) {
      this.watchdogHandle.unref();
    }
  }

  /**
   * Stops background watchdog
   */
  stopHeartbeatWatchdog() {
    if (this.watchdogHandle) {
      clearInterval(this.watchdogHandle);
      this.watchdogHandle = null;
    }
  }
}

export { WorkerHealthService };
export const workerHealthMonitor = new WorkerHealthService();
export default workerHealthMonitor;
