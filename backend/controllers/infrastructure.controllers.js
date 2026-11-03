import { queueMonitor } from "../services/queueMonitor.service.js";
import { resourceMonitor } from "../services/resourceMonitor.service.js";
import { adaptiveController } from "../services/adaptiveController.service.js";
import { workerHealthMonitor } from "../services/workerHealth.service.js";
import { getDeadLetterJobs, retryDeadLetterJob, enqueueOrderProcessing } from "../queues/order.queue.js";

/**
 * Controller providing comprehensive cloud infrastructure telemetry
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

