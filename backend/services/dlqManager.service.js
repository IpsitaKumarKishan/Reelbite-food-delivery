import { incidentLogger } from "./incidentLogger.service.js";
import { orderQueue } from "../queues/order.queue.js";

/**
 * Custom Error for Permanent Business Validation Failures
 * Prevents useless repeated retries of non-recoverable errors.
 */
export class PermanentJobError extends Error {
  constructor(message, metadata = {}) {
    super(message);
    this.name = "PermanentJobError";
    this.isPermanent = true;
    this.metadata = metadata;
  }
}

/**
 * Dead Letter Queue (DLQ) Management Service
 * Tracks, inspects, and manages jobs that permanently failed or were discarded.
 * Provides safe, controlled manual retry operations preventing duplicate job submission.
 */
class DlqManagerService {
  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
    this.dlqStore = new Map();
  }

  /**
   * Registers a permanently failed or discarded job in the Dead Letter Queue
   * @param {Object} job - BullMQ job object
   * @param {Error} err - Error that caused the failure
   */
  recordFailedJob(job, err) {
    if (!job) return null;

    const now = Date.now();
    const jobId = job.id || `failed-${now}`;
    const orderId = job.data?.orderId || "UNKNOWN_ORDER";
    const isPermanent = Boolean(err?.isPermanent || err instanceof PermanentJobError);
    const failureType = isPermanent ? "PERMANENT_VALIDATION" : "TRANSIENT_EXHAUSTED";

    const stacktrace = err?.stack
      ? err.stack.split("\n").slice(0, 3).map((s) => s.trim())
      : [];

    const dlqEntry = {
      jobId,
      orderId,
      name: job.name || "process-order",
      payload: { ...job.data },
      attemptsMade: job.attemptsMade || 1,
      maxAttempts: job.opts?.attempts || 3,
      failedReason: err?.message || "Unknown job failure",
      failureType,
      stacktrace,
      failedAt: new Date(now).toISOString(),
      status: "FAILED", // FAILED | RETRIED | DISCARDED
      eligibleForRetry: !isPermanent, // Permanent validation failures require manual fix first
      retryHistory: []
    };

    this.dlqStore.set(jobId, dlqEntry);

    // Maintain max history bound
    if (this.dlqStore.size > this.maxEntries) {
      const oldestKey = this.dlqStore.keys().next().value;
      this.dlqStore.delete(oldestKey);
    }

    console.error(
      `💀 [DLQ Manager] Job #${jobId} (Order #${orderId}) committed to DLQ | Type: ${failureType} | Reason: ${dlqEntry.failedReason}`
    );

    // Create structured incident ticket in Incident Logger
    incidentLogger.createIncident({
      componentName: "QUEUE",
      failureType: "JOB_DLQ_MOVED",
      failureTimestamp: now,
      failureReason: `Job #${jobId} (Order #${orderId}) failed: ${dlqEntry.failedReason}`,
      metadata: {
        jobId,
        orderId,
        failureType,
        attemptsMade: dlqEntry.attemptsMade
      }
    });

    return dlqEntry;
  }

  /**
   * Get all registered Dead Letter Queue jobs with optional filtering
   * @param {Object} options { status, failureType, page, limit }
   */
  getDeadLetterJobs(options = {}) {
    let list = Array.from(this.dlqStore.values());

    if (options.status) {
      list = list.filter((j) => j.status === options.status);
    }
    if (options.failureType) {
      list = list.filter((j) => j.failureType === options.failureType);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.failedAt) - new Date(a.failedAt));

    const page = Math.max(1, parseInt(options.page || 1, 10));
    const limit = Math.min(50, Math.max(1, parseInt(options.limit || 20, 10)));
    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      jobs: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Inspect a specific failed job
   * @param {string} jobId 
   */
  getJobDetails(jobId) {
    return this.dlqStore.get(jobId) || null;
  }

  /**
   * Controlled manual retry of a failed job from the DLQ
   * @param {string} jobId 
   * @param {boolean} force - Force retry even if marked permanent
   */
  async retryJob(jobId, force = false) {
    const entry = this.dlqStore.get(jobId);
    if (!entry) {
      return { success: false, reason: `Job #${jobId} not found in DLQ` };
    }

    if (!entry.eligibleForRetry && !force) {
      return {
        success: false,
        reason: `Job #${jobId} is marked as permanent validation failure and cannot be auto-retried. Use force=true to override.`
      };
    }

    if (entry.status === "RETRIED") {
      return {
        success: false,
        reason: `Job #${jobId} has already been retried.`
      };
    }

    if (!orderQueue) {
      return { success: false, reason: "Order queue is unavailable" };
    }

    try {
      const retryJobId = `order-${entry.orderId}-retry-${Date.now()}`;
      const newJob = await orderQueue.add("process-order", entry.payload, {
        jobId: retryJobId,
        attempts: 3
      });

      entry.status = "RETRIED";
      entry.retryHistory.push({
        retriedAt: new Date().toISOString(),
        retryJobId: newJob.id
      });

      console.log(`♻️ [DLQ Manager] Job #${jobId} (Order #${entry.orderId}) resubmitted as #${newJob.id}`);

      return {
        success: true,
        message: `Job #${jobId} successfully resubmitted to queue as #${newJob.id}`,
        previousJobId: jobId,
        newJobId: newJob.id,
        orderId: entry.orderId
      };
    } catch (err) {
      return { success: false, reason: `Failed to resubmit job: ${err.message}` };
    }
  }

  /**
   * Permanently discard a failed job from DLQ
   */
  discardJob(jobId, reason = "Admin discarded") {
    const entry = this.dlqStore.get(jobId);
    if (!entry) return null;

    entry.status = "DISCARDED";
    entry.eligibleForRetry = false;
    entry.discardReason = reason;
    return entry;
  }

  /**
   * Get DLQ aggregated statistics
   */
  getStats() {
    const list = Array.from(this.dlqStore.values());
    let permanentCount = 0;
    let transientCount = 0;
    let retriedCount = 0;
    let pendingCount = 0;

    for (const j of list) {
      if (j.status === "FAILED") pendingCount++;
      if (j.status === "RETRIED") retriedCount++;
      if (j.failureType === "PERMANENT_VALIDATION") permanentCount++;
      if (j.failureType === "TRANSIENT_EXHAUSTED") transientCount++;
    }

    return {
      totalFailedInStore: list.length,
      pendingCount,
      retriedCount,
      permanentCount,
      transientCount,
      timestamp: new Date().toISOString()
    };
  }
}

export { DlqManagerService };
export const dlqManager = new DlqManagerService();
export default dlqManager;

