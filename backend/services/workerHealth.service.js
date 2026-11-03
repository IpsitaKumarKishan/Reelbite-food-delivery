/**
 * Worker Health Monitoring Service
 * Tracks status, concurrency, health, and throughput of background workers.
 * Supports observability for single-worker vertical scaling and multi-process horizontal worker tracking.
 */
class WorkerHealthService {
  constructor() {
    this.workers = new Map();
  }

  /**
   * Register or update a worker instance
   * @param {string} workerId 
   * @param {Object} metadata 
   */
  registerWorker(workerId, metadata = {}) {
    const now = Date.now();
    const existing = this.workers.get(workerId) || {};

    const workerRecord = {
      workerId,
      status: metadata.status || "ACTIVE", // ACTIVE | IDLE | DRAINING | OFFLINE
      scalingType: metadata.scalingType || "VERTICAL_DYNAMIC_CONCURRENCY",
      concurrency: metadata.concurrency || 5,
      activeJobs: metadata.activeJobs || 0,
      completedJobs: existing.completedJobs || 0,
      failedJobs: existing.failedJobs || 0,
      startedAt: existing.startedAt || new Date(now).toISOString(),
      lastHeartbeat: new Date(now).toISOString(),
      lastJobFinishedAt: existing.lastJobFinishedAt || null,
      errorCount: existing.errorCount || 0,
      lastError: existing.lastError || null
    };

    this.workers.set(workerId, workerRecord);
    return workerRecord;
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
      lastHeartbeat: new Date().toISOString()
    });

    this.workers.set(workerId, worker);
    return worker;
  }

  /**
   * Record when a worker starts processing a job
   */
  recordJobStart(workerId) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = Math.max(0, (worker.activeJobs || 0) + 1);
      worker.status = "ACTIVE";
      worker.lastHeartbeat = new Date().toISOString();
    }
  }

  /**
   * Record successful job execution
   */
  recordJobComplete(workerId, durationMs = 0) {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = Math.max(0, (worker.activeJobs || 1) - 1);
      worker.completedJobs = (worker.completedJobs || 0) + 1;
      worker.lastJobFinishedAt = new Date().toISOString();
      worker.lastHeartbeat = worker.lastJobFinishedAt;
      if (worker.activeJobs === 0) {
        worker.status = "IDLE";
      }
    }
  }

  /**
   * Record job failure
   */
  recordJobFailure(workerId, errorMessage = "Job execution failed") {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.activeJobs = Math.max(0, (worker.activeJobs || 1) - 1);
      worker.failedJobs = (worker.failedJobs || 0) + 1;
      worker.errorCount = (worker.errorCount || 0) + 1;
      worker.lastError = errorMessage;
      worker.lastHeartbeat = new Date().toISOString();
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
    }
  }

  /**
   * Get all registered worker details with uptime calculations
   */
  getWorkers() {
    const now = Date.now();
    return Array.from(this.workers.values()).map((w) => {
      const started = new Date(w.startedAt).getTime();
      const uptimeSeconds = Math.max(0, Math.floor((now - started) / 1000));
      return {
        ...w,
        uptimeSeconds
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

    for (const w of list) {
      totalConcurrency += w.concurrency || 0;
      totalActive += w.activeJobs || 0;
      totalCompleted += w.completedJobs || 0;
      totalFailed += w.failedJobs || 0;
      if (w.status === "ACTIVE" || w.status === "IDLE") {
        healthyCount++;
      }
    }

    const overallHealth = list.length === 0
      ? "UNAVAILABLE"
      : healthyCount === list.length
      ? "HEALTHY"
      : healthyCount > 0
      ? "DEGRADED"
      : "OFFLINE";

    return {
      totalWorkers: list.length,
      activeWorkers: healthyCount,
      totalConcurrency,
      totalActiveJobs: totalActive,
      totalCompletedJobs: totalCompleted,
      totalFailedJobs: totalFailed,
      health: overallHealth,
      scalingType: "VERTICAL_DYNAMIC_CONCURRENCY",
      timestamp: new Date().toISOString()
    };
  }
}

export { WorkerHealthService };
export const workerHealthMonitor = new WorkerHealthService();
export default workerHealthMonitor;

