import { queueMonitor } from "../services/queueMonitor.service.js";
import { resourceMonitor } from "../services/resourceMonitor.service.js";
import { adaptiveController } from "../services/adaptiveController.service.js";
import { workerHealthMonitor } from "../services/workerHealth.service.js";
import { getDeadLetterJobs, retryDeadLetterJob, enqueueOrderProcessing } from "../queues/order.queue.js";
import { incidentLogger } from "../services/incidentLogger.service.js";
import { recoveryController } from "../services/recoveryController.service.js";
import { dlqManager } from "../services/dlqManager.service.js";
import { redisConnectionMonitor } from "../services/redisConnectionMonitor.service.js";
import { dbConnectionMonitor } from "../services/dbConnectionMonitor.service.js";
import { failureSimulation } from "../services/failureSimulation.service.js";

/**
 * Controller providing comprehensive cloud infrastructure and fault tolerance telemetry
 */
export const getInfrastructureMetrics = async (req, res) => {
  try {
    // 1. Refresh real-time samples
    const [queueSnap, resourceSnap] = await Promise.all([
      queueMonitor.sample(),
      resourceMonitor.sample()
    ]);

    const controllerStatus = adaptiveController.getStatus();
    const adjustmentLogs = adaptiveController.getLogs(30);
    const workers = workerHealthMonitor.getWorkers();
    const workerSummary = workerHealthMonitor.getSummary();
    const dlqJobs = await getDeadLetterJobs(0, 10);

    // Fault Tolerance & Automated Recovery Telemetry
    const incidentMetrics = incidentLogger.getMetrics();
    const recentIncidents = incidentLogger.getIncidents({ limit: 15 });
    const recoveryStats = recoveryController.getRecoveryStats();
    const recoveryLogs = recoveryController.getRecoveryLogs(15);
    const dlqStats = dlqManager.getStats();
    const dlqDetailed = dlqManager.getDeadLetterJobs({ limit: 15 });
    const redisStatus = redisConnectionMonitor.getStatus();
    const dbStatus = dbConnectionMonitor.getStatus();
    const containerPolicy = recoveryController.getContainerRecoveryPolicy();

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      queue: queueSnap,
      resources: resourceSnap,
      controller: controllerStatus,
      workers,
      workerSummary,
      deadLetterQueue: {
        totalFailed: queueSnap.counts?.failed || 0,
        recentFailedJobs: dlqJobs
      },
      faultTolerance: {
        incidentMetrics,
        recentIncidents,
        recoveryStats,
        recoveryLogs,
        dlqStats,
        dlqJobs: dlqDetailed.jobs,
        redisStatus,
        dbStatus,
        containerPolicy
      },
      history: {
        queue: queueMonitor.getHistory(),
        resources: resourceMonitor.getHistory()
      },
      adjustmentLogs
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to collect infrastructure metrics",
      error: error.message
    });
  }
};

/**
 * Switch between Adaptive dynamic mode and Fixed concurrency benchmarking
 */
export const updateControllerMode = async (req, res) => {
  try {
    const { mode, fixedValue } = req.body;

    if (!["adaptive", "fixed"].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Must be 'adaptive' or 'fixed'"
      });
    }

    const updated = adaptiveController.setMode(mode, Number(fixedValue));

    // Force an immediate evaluation tick to apply change
    adaptiveController.evaluate();

    return res.status(200).json({
      success: true,
      message: `Controller mode updated to '${mode}'`,
      controller: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Simulate background workload spike for testing adaptive concurrency reactions
 */
export const simulateTrafficSpike = async (req, res) => {
  try {
    const count = Math.min(50, Math.max(1, parseInt(req.body.count || 10, 10)));
    const batchId = `burst-${Date.now().toString(36)}`;
    const results = [];

    for (let i = 0; i < count; i++) {
      const simOrder = {
        orderId: `sim-order-${batchId}-${i + 1}`,
        orderNumber: `RB-SIM-${i + 1}`,
        totalAmount: Math.floor(Math.random() * 500) + 150,
        isSyntheticBenchmark: true
      };
      const res = await enqueueOrderProcessing(simOrder);
      results.push(res);
    }

    // Immediate sample to capture the queued surge
    await queueMonitor.sample();

    return res.status(200).json({
      success: true,
      message: `Injected ${count} synthetic order tasks into BullMQ queue.`,
      batchId,
      enqueued: results.filter((r) => r.queued).length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to simulate workload spike",
      error: error.message
    });
  }
};

/**
 * Retry a failed job from the Dead Letter Queue
 */
export const retryFailedJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID is required" });
    }

    const result = await retryDeadLetterJob(jobId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: `Job ${jobId} successfully resubmitted to queue.`,
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error retrying failed job",
      error: error.message
    });
  }
};

/**
 * Get paginated list of failure incidents
 */
export const getIncidents = async (req, res) => {
  try {
    const incidents = incidentLogger.getIncidents(req.query);
    const metrics = incidentLogger.getMetrics();
    return res.status(200).json({
      success: true,
      incidents,
      metrics
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get paginated Dead Letter Queue items
 */
export const getDlqJobs = async (req, res) => {
  try {
    const data = dlqManager.getDeadLetterJobs(req.query);
    const stats = dlqManager.getStats();
    return res.status(200).json({
      success: true,
      ...data,
      stats
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controlled retry of a Dead Letter Queue item with deduplication safeguards
 */
export const retryDlqJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { force } = req.body || {};
    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID is required" });
    }

    const result = await dlqManager.retryJob(jobId, Boolean(force));
    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Discard an ineligible job from DLQ
 */
export const discardDlqJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { reason } = req.body || {};
    if (!jobId) {
      return res.status(400).json({ success: false, message: "Job ID is required" });
    }

    const discarded = dlqManager.discardJob(jobId, reason || "Admin manual discard");
    if (!discarded) {
      return res.status(404).json({ success: false, message: "Job not found in DLQ" });
    }

    return res.status(200).json({
      success: true,
      message: `Job #${jobId} discarded from DLQ.`,
      discarded
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Controlled Failure Simulation for Live Demonstration
 */
export const simulateFailureScenario = async (req, res) => {
  try {
    const { scenario, targetWorkerId, durationMs, orderId } = req.body || {};

    let result = null;
    switch (scenario) {
      case "WORKER_CRASH":
        result = await failureSimulation.simulateWorkerCrash(targetWorkerId);
        break;

      case "HEARTBEAT_TIMEOUT":
        result = await failureSimulation.simulateHeartbeatTimeout(targetWorkerId);
        break;

      case "REDIS_INTERRUPT":
        result = await failureSimulation.simulateRedisInterruption(Number(durationMs || 2000));
        break;

      case "DB_HICCUP":
        result = await failureSimulation.simulateDbHiccup(Number(durationMs || 2000));
        break;

      case "JOB_TRANSIENT":
        result = await failureSimulation.simulateJobException({
          orderId,
          isPermanent: false
        });
        break;

      case "JOB_PERMANENT":
        result = await failureSimulation.simulateJobException({
          orderId,
          isPermanent: true
        });
        break;

      case "JOB_DUPLICATE":
        result = await failureSimulation.simulateDuplicateJob(orderId);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown simulation scenario: '${scenario}'. Available: WORKER_CRASH, HEARTBEAT_TIMEOUT, REDIS_INTERRUPT, DB_HICCUP, JOB_TRANSIENT, JOB_PERMANENT, JOB_DUPLICATE`
        });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



