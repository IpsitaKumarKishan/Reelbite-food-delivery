import test from "node:test";
import assert from "node:assert/strict";
import { WorkerHealthService } from "../services/workerHealth.service.js";
import { QueueMonitorService } from "../services/queueMonitor.service.js";
import { AdaptiveControllerService } from "../services/adaptiveController.service.js";

test("Phase 4: Worker Health and Observability Service", async (t) => {
  const healthService = new WorkerHealthService();

  await t.test("registers worker with vertical concurrency metadata", () => {
    const worker = healthService.registerWorker("worker-test-1", {
      status: "ACTIVE",
      concurrency: 5,
      scalingType: "VERTICAL_DYNAMIC_CONCURRENCY"
    });

    assert.equal(worker.workerId, "worker-test-1");
    assert.equal(worker.concurrency, 5);
    assert.equal(worker.status, "ACTIVE");
    assert.equal(worker.scalingType, "VERTICAL_DYNAMIC_CONCURRENCY");
    assert.equal(worker.completedJobs, 0);
    assert.equal(worker.failedJobs, 0);
  });

  await t.test("tracks job lifecycle: start, complete, and execution duration", () => {
    healthService.recordJobStart("worker-test-1");
    let workers = healthService.getWorkers();
    let worker = workers.find((w) => w.workerId === "worker-test-1");
    assert.equal(worker.activeJobs, 1);

    healthService.recordJobComplete("worker-test-1", 45);
    workers = healthService.getWorkers();
    worker = workers.find((w) => w.workerId === "worker-test-1");
    assert.equal(worker.activeJobs, 0);
    assert.equal(worker.completedJobs, 1);
    assert.equal(worker.status, "IDLE");
  });

  await t.test("tracks job failure without crashing worker state", () => {
    healthService.recordJobStart("worker-test-1");
    healthService.recordJobFailure("worker-test-1", "Database timeout");

    const worker = healthService.getWorkers().find((w) => w.workerId === "worker-test-1");
    assert.equal(worker.failedJobs, 1);
    assert.equal(worker.errorCount, 1);
    assert.equal(worker.lastError, "Database timeout");
  });

  await t.test("generates aggregated health summary", () => {
    const summary = healthService.getSummary();
    assert.equal(summary.totalWorkers, 1);
    assert.equal(summary.activeWorkers, 1);
    assert.equal(summary.totalCompletedJobs, 1);
    assert.equal(summary.totalFailedJobs, 1);
    assert.equal(summary.scalingType, "VERTICAL_DYNAMIC_CONCURRENCY");
  });
});

test("Phase 4: Dynamic Vertical Concurrency Integration", async (t) => {
  const customConfig = {
    MIN_CONCURRENCY: 1,
    MAX_CONCURRENCY: 20,
    INITIAL_CONCURRENCY: 5,
    MONITORING_INTERVAL: 1000,
    CPU_HIGH_THRESHOLD: 80,
    CPU_LOW_THRESHOLD: 50,
    MEMORY_HIGH_THRESHOLD: 85,
    COOLDOWN_PERIOD: 0,
    MAX_SCALE_UP_STEP: 2,
    MAX_SCALE_DOWN_STEP: 1,
    QUEUE_HIGH_THRESHOLD: 3
  };

  const controller = new AdaptiveControllerService(customConfig);
  const healthService = new WorkerHealthService();

  // Simulated worker representation mirroring BullMQ Worker
  const mockBullMqWorker = {
    _concurrency: 5,
    get concurrency() {
      return this._concurrency;
    },
    set concurrency(val) {
      this._concurrency = val;
    }
  };

  healthService.registerWorker("worker-order-test", {
    status: "ACTIVE",
    concurrency: mockBullMqWorker.concurrency,
    scalingType: "VERTICAL_DYNAMIC_CONCURRENCY"
  });

  // Subscribe to controller changes (identical to order.worker.js)
  controller.onConcurrencyChange((newConcurrency, logEntry) => {
    mockBullMqWorker.concurrency = newConcurrency;
    healthService.updateWorker("worker-order-test", { concurrency: newConcurrency });
  });

  await t.test("worker starts with controller's initial concurrency", () => {
    assert.equal(mockBullMqWorker.concurrency, 5);
  });

  await t.test("dynamically adjusts worker concurrency upwards without restart", () => {
    const queueSurge = { counts: { waiting: 10, active: 2 } };
    const healthyResource = { cpu: { systemPercent: 20 }, memory: { systemPercent: 40 } };

    const decision = controller.evaluate(queueSurge, healthyResource);
    assert.equal(decision.adjusted, true);
    assert.equal(decision.newConcurrency, 7);

    // Verify worker in-memory concurrency updated directly
    assert.equal(mockBullMqWorker.concurrency, 7);

    const workerStatus = healthService.getWorkers().find((w) => w.workerId === "worker-order-test");
    assert.equal(workerStatus.concurrency, 7);
  });

  await t.test("dynamically scales down worker concurrency when queue drains", () => {
    const drainedQueue = { counts: { waiting: 0, active: 0 } };
    const normalResource = { cpu: { systemPercent: 30 }, memory: { systemPercent: 45 } };

    const decision = controller.evaluate(drainedQueue, normalResource);
    assert.equal(decision.adjusted, true);
    assert.equal(decision.newConcurrency, 6);

    // Verify worker updated directly
    assert.equal(mockBullMqWorker.concurrency, 6);
  });
});

test("Phase 4: Real-time Job Duration Telemetry in Queue Monitor", async (t) => {
  const queueMon = new QueueMonitorService(null);

  await t.test("records job duration and calculates moving average latency", () => {
    queueMon.recordJobDuration(120);
    queueMon.recordJobDuration(80);
    queueMon.recordJobDuration(100);

    assert.equal(queueMon.currentAvgDurationMs, 100);
  });

  await t.test("gracefully ignores negative or invalid job durations", () => {
    queueMon.recordJobDuration(-50);
    queueMon.recordJobDuration("invalid");
    assert.equal(queueMon.currentAvgDurationMs, 100);
  });
});

