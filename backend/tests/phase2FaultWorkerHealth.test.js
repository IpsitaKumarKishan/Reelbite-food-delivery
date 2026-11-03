import test from "node:test";
import assert from "node:assert/strict";
import { WorkerHealthService } from "../services/workerHealth.service.js";

test("Phase 2: Worker Heartbeat & Health Monitoring Service", async (t) => {
  const customConfig = {
    WORKER_HEARTBEAT_INTERVAL_MS: 100,
    WORKER_HEARTBEAT_TIMEOUT_MS: 300,
    WATCHDOG_CHECK_INTERVAL_MS: 100
  };

  const healthService = new WorkerHealthService(customConfig);

  await t.test("registers worker with process ID and initial active status", () => {
    const worker = healthService.registerWorker("worker-alpha-1", {
      pid: 12345,
      concurrency: 5,
      scalingType: "VERTICAL_DYNAMIC_CONCURRENCY"
    });

    assert.equal(worker.workerId, "worker-alpha-1");
    assert.equal(worker.pid, 12345);
    assert.equal(worker.status, "ACTIVE");
    assert.equal(worker.concurrency, 5);
    assert.equal(worker.missedHeartbeats, 0);
    assert(worker.lastHeartbeatMs > 0);
  });

  await t.test("records periodic heartbeats and resets missed heartbeat counter", () => {
    const updated = healthService.recordHeartbeat("worker-alpha-1", {
      concurrency: 8,
      activeJobs: 2
    });

    assert.equal(updated.concurrency, 8);
    assert.equal(updated.activeJobs, 2);
    assert.equal(updated.missedHeartbeats, 0);
    assert.equal(updated.unhealthyReason, null);

    const detail = healthService.getWorker("worker-alpha-1");
    assert(typeof detail.heartbeatAgeMs === "number");
    assert(detail.heartbeatAgeMs >= 0);
  });

  await t.test("detects heartbeat timeout and transitions worker to UNHEALTHY", async () => {
    let notifiedWorker = null;
    let notifiedReason = null;

    const unsubscribe = healthService.onWorkerUnhealthy((w, reason) => {
      notifiedWorker = w;
      notifiedReason = reason;
    });

    // Simulate elapsed time greater than timeout (300ms)
    const worker = healthService.workers.get("worker-alpha-1");
    worker.lastHeartbeatMs = Date.now() - 450; // 450ms ago

    const delinquentList = healthService.checkHeartbeats(300);
    assert.equal(delinquentList.length, 1);
    assert.equal(delinquentList[0].workerId, "worker-alpha-1");
    assert.equal(delinquentList[0].status, "UNHEALTHY");
    assert.match(delinquentList[0].unhealthyReason, /Heartbeat timeout/);
    assert(delinquentList[0].missedHeartbeats >= 4);

    assert.equal(notifiedWorker?.workerId, "worker-alpha-1");
    assert.equal(notifiedReason, "HEARTBEAT_TIMEOUT");

    unsubscribe();
  });

  await t.test("restores worker to healthy status upon receiving a fresh heartbeat", () => {
    const restored = healthService.recordHeartbeat("worker-alpha-1", { activeJobs: 0 });
    assert.equal(restored.status, "IDLE");
    assert.equal(restored.unhealthyReason, null);
    assert.equal(restored.unhealthySince, null);
  });

  await t.test("tracks job lifecycle and updates lastSuccessfulJobAt", () => {
    healthService.recordJobStart("worker-alpha-1");
    let w = healthService.getWorker("worker-alpha-1");
    assert.equal(w.activeJobs, 1);
    assert.equal(w.status, "ACTIVE");

    healthService.recordJobComplete("worker-alpha-1", 52);
    w = healthService.getWorker("worker-alpha-1");
    assert.equal(w.activeJobs, 0);
    assert.equal(w.completedJobs, 1);
    assert(w.lastSuccessfulJobAt !== null);
    assert.equal(w.avgJobDurationMs, 52);
  });

  await t.test("calculates fleet availability percentage accurately", () => {
    // Add a second unhealthy worker
    healthService.registerWorker("worker-beta-2", {
      status: "UNHEALTHY",
      concurrency: 5
    });

    const summary = healthService.getSummary();
    assert.equal(summary.totalWorkers, 2);
    assert.equal(summary.activeWorkers, 1); // alpha is IDLE (healthy)
    assert.equal(summary.unhealthyWorkers, 1); // beta is UNHEALTHY
    assert.equal(summary.availabilityPercent, 50.0);
    assert.equal(summary.health, "DEGRADED");
  });
});

