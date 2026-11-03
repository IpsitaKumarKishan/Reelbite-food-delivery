import { failureDetectionService } from "./failureDetection.service.js";
import { recoveryController } from "./recoveryController.service.js";
import { workerHealthMonitor } from "./workerHealth.service.js";
import { redisConnectionMonitor } from "./redisConnectionMonitor.service.js";
import { dbConnectionMonitor } from "./dbConnectionMonitor.service.js";
import { enqueueOrderProcessing } from "../queues/order.queue.js";
import { getWorkerId, setHeartbeatActive } from "../workers/order.worker.js";

/**
 * Controlled Failure Simulation Service
 * Provides safe, non-destructive administrative hooks to trigger and demonstrate
 * the 5 fault tolerance scenarios for presentations and defense evaluations.
 */
class FailureSimulationService {
  constructor() {
    this.activeSimulations = new Map();
  }

  /**
   * CASE 1: Simulate background worker crash
   * @param {string} targetWorkerId 
   */
  async simulateWorkerCrash(targetWorkerId = null) {
    const workerId = targetWorkerId || getWorkerId();
    console.warn(`🧪 [Simulation] Injecting CASE 1 (Worker Crash) on ${workerId}`);

    const incident = failureDetectionService.detectWorkerCrash(
      workerId,
      "Simulated Crash: SIGSEGV process fault injection"
    );

    return {
      success: true,
      caseType: "CASE_1_WORKER_CRASH",
      message: `Worker crash simulated on ${workerId}. Autonomous recovery initiated.`,
      workerId,
      incidentId: incident.incidentId
    };
  }

  /**
   * CASE 2: Simulate unresponsive worker / missed heartbeats (Zombie worker)
   * @param {string} targetWorkerId 
   */
  async simulateHeartbeatTimeout(targetWorkerId = null) {
    const workerId = targetWorkerId || getWorkerId();
    console.warn(`🧪 [Simulation] Injecting CASE 2 (Heartbeat Dropout) on ${workerId}`);

    setHeartbeatActive(false);

    // Directly notify health monitor of missed heartbeat threshold for instant interactive UI feedback
    const worker = workerHealthMonitor.getWorker(workerId) || {
      workerId,
      pid: process.pid,
      missedHeartbeats: 4,
      heartbeatAgeMs: 12000
    };

    workerHealthMonitor.setWorkerStatus(
      workerId,
      "UNHEALTHY",
      "Simulated Zombie: Heartbeat lapsed beyond 10,000ms threshold"
    );

    const incident = failureDetectionService.detectHeartbeatTimeout(
      worker,
      "Simulated Zombie: Heartbeat stopped emitting"
    );

    return {
      success: true,
      caseType: "CASE_2_HEARTBEAT_TIMEOUT",
      message: `Heartbeat emission suspended on ${workerId}. Watchdog timeout triggered.`,
      workerId,
      incidentId: incident.incidentId
    };
  }

  /**
   * CASE 3: Simulate Redis broker network partition / disconnect
   * @param {number} durationMs 
   */
  async simulateRedisInterruption(durationMs = 2000) {
    console.warn(`🧪 [Simulation] Injecting CASE 3 (Redis Interruption) for ${durationMs}ms`);

    const incident = failureDetectionService.detectRedisDisconnect(
      Date.now(),
      "Simulated Network Partition: Redis socket closed"
    );

    const timer = setTimeout(() => {
      failureDetectionService.handleRedisRestored(Date.now());
      console.log("🧪 [Simulation] Redis connection simulated restored.");
    }, durationMs);
    if (timer.unref) timer.unref();

    return {
      success: true,
      caseType: "CASE_3_REDIS_DISCONNECTED",
      message: `Redis broker disconnection simulated for ${durationMs}ms.`,
      incidentId: incident.incidentId,
      durationMs
    };
  }

  /**
   * CASE 4: Simulate MongoDB Atlas transient database failure
   * @param {number} durationMs 
   */
  async simulateDbHiccup(durationMs = 2000) {
    console.warn(`🧪 [Simulation] Injecting CASE 4 (MongoDB Atlas Hiccup) for ${durationMs}ms`);

    const incident = failureDetectionService.detectDbDisconnect(
      Date.now(),
      "Simulated Failover: Primary replica stepdown"
    );

    const timer = setTimeout(() => {
      failureDetectionService.handleDbRestored(Date.now());
      console.log("🧪 [Simulation] MongoDB Atlas connection simulated restored.");
    }, durationMs);
    if (timer.unref) timer.unref();

    return {
      success: true,
      caseType: "CASE_4_DB_DISCONNECTED",
      message: `MongoDB Atlas disconnect simulated for ${durationMs}ms. Operations will retry with backoff.`,
      incidentId: incident.incidentId,
      durationMs
    };
  }

  /**
   * Simulate Job Processing Exception (Transient vs Permanent DLQ)
   * @param {Object} options { orderId, isPermanent, errorMessage }
   */
  async simulateJobException({ orderId = null, isPermanent = false, errorMessage = null } = {}) {
    const id = orderId || `sim-err-${Date.now().toString(36)}`;
    const failureType = isPermanent ? "PERMANENT_VALIDATION" : "TRANSIENT_EXHAUSTED";
    console.warn(`🧪 [Simulation] Injecting Job Exception (${failureType}) for Order #${id}`);

    const result = await enqueueOrderProcessing({
      orderId: id,
      orderNumber: `RB-SIM-FAIL-${Date.now().toString().slice(-4)}`,
      totalAmount: 250,
      simulationError: true,
      isPermanent: Boolean(isPermanent),
      errorMessage:
        errorMessage ||
        (isPermanent
          ? "Simulated corrupt schema: Non-retryable permanent error"
          : "Simulated payment gateway timeout: Transient retry error")
    });

    return {
      success: true,
      failureType,
      message: isPermanent
        ? `Permanent failure job #${result.jobId} injected. BullMQ will discard and commit directly to DLQ.`
        : `Transient failure job #${result.jobId} injected. BullMQ will retry 3 times with exponential backoff.`,
      jobId: result.jobId,
      orderId: id
    };
  }

  /**
   * Simulate Duplicate Job Execution (Testing Atomic Distributed Idempotency)
   * @param {string} orderId 
   */
  async simulateDuplicateJob(orderId = null) {
    const id = orderId || `sim-dup-${Date.now().toString(36)}`;
    console.warn(`🧪 [Simulation] Injecting Duplicate Job Pair for Order #${id}`);

    const [job1, job2] = await Promise.all([
      enqueueOrderProcessing({
        orderId: id,
        orderNumber: `RB-DUP-1`,
        totalAmount: 180,
        isDuplicateTest: true
      }),
      enqueueOrderProcessing({
        orderId: id,
        orderNumber: `RB-DUP-2`,
        totalAmount: 180,
        isDuplicateTest: true
      })
    ]);

    return {
      success: true,
      message: `Concurrent dual jobs submitted for Order #${id}. Atomic distributed lock and notification suppression active.`,
      orderId: id,
      job1Id: job1.jobId,
      job2Id: job2.jobId
    };
  }
}

export { FailureSimulationService };
export const failureSimulation = new FailureSimulationService();
export default failureSimulation;
