import test from "node:test";
import assert from "node:assert/strict";
import { ADAPTIVE_CONFIG } from "../config/adaptiveConfig.js";
import { resourceMonitor } from "../services/resourceMonitor.service.js";
import { queueMonitor } from "../services/queueMonitor.service.js";

test("Phase 2: Adaptive Config Specification", async (t) => {
  await t.test("exports valid numeric bounds for concurrency and monitoring", () => {
    assert.ok(ADAPTIVE_CONFIG.MIN_CONCURRENCY >= 1, "MIN_CONCURRENCY must be at least 1");
    assert.ok(ADAPTIVE_CONFIG.MAX_CONCURRENCY >= ADAPTIVE_CONFIG.MIN_CONCURRENCY, "MAX must be >= MIN");
    assert.ok(ADAPTIVE_CONFIG.INITIAL_CONCURRENCY >= ADAPTIVE_CONFIG.MIN_CONCURRENCY, "INITIAL must be >= MIN");
    assert.ok(ADAPTIVE_CONFIG.INITIAL_CONCURRENCY <= ADAPTIVE_CONFIG.MAX_CONCURRENCY, "INITIAL must be <= MAX");
    assert.ok(ADAPTIVE_CONFIG.MONITORING_INTERVAL >= 1000, "Interval must be at least 1s");
    assert.ok(ADAPTIVE_CONFIG.CPU_HIGH_THRESHOLD > ADAPTIVE_CONFIG.CPU_LOW_THRESHOLD, "High CPU threshold must exceed low threshold");
    assert.ok(ADAPTIVE_CONFIG.MEMORY_HIGH_THRESHOLD <= 100, "Memory ceiling must be <= 100%");
  });
});

test("Phase 2: Resource Monitoring Service", async (t) => {
  await t.test("sample() returns complete CPU and memory metrics", () => {
    const snapshot = resourceMonitor.sample();

    assert.ok(snapshot.timestamp, "Must include timestamp");
    assert.ok(typeof snapshot.cpu.systemPercent === "number", "systemPercent must be number");
    assert.ok(snapshot.cpu.systemPercent >= 0 && snapshot.cpu.systemPercent <= 100, "systemPercent must be between 0 and 100");
    assert.ok(snapshot.cpu.cores >= 1, "Must detect at least 1 logical core");

    assert.ok(snapshot.memory.totalMB > 0, "totalMB must be positive");
    assert.ok(snapshot.memory.usedMB >= 0, "usedMB must be non-negative");
    assert.ok(snapshot.memory.systemPercent >= 0 && snapshot.memory.systemPercent <= 100, "systemPercent must be between 0 and 100");

    assert.ok(snapshot.memory.process.rssMB > 0, "Process RSS must be positive");
    assert.ok(typeof snapshot.status.isCpuHigh === "boolean", "isCpuHigh must be boolean");
    assert.ok(typeof snapshot.status.isMemoryCritical === "boolean", "isMemoryCritical must be boolean");
  });

  await t.test("maintains capped historical buffer", () => {
    // Generate multiple samples
    for (let i = 0; i < 5; i++) {
      resourceMonitor.sample();
    }
    const history = resourceMonitor.getHistory();
    assert.ok(Array.isArray(history), "History must be an array");
    assert.ok(history.length >= 5, "History should retain samples");
    assert.ok(history.length <= ADAPTIVE_CONFIG.HISTORY_WINDOW_SIZE, "History cannot exceed window size");
  });
});

test("Phase 2: Queue Monitoring Service", async (t) => {
  await t.test("gracefully returns structured metrics even if queue is offline/unavailable", async () => {
    const snapshot = await queueMonitor.sample();

    assert.ok(snapshot.queueName, "Must include queueName");
    assert.ok(snapshot.timestamp, "Must include timestamp");
    assert.ok(typeof snapshot.counts.waiting === "number", "waiting must be number");
    assert.ok(typeof snapshot.counts.active === "number", "active must be number");
    assert.ok(typeof snapshot.counts.completed === "number", "completed must be number");
    assert.ok(typeof snapshot.counts.failed === "number", "failed must be number");
    assert.ok(typeof snapshot.performance.jobsPerSecond === "number", "jobsPerSecond must be number");
    assert.ok(typeof snapshot.workload === "object", "workload state must be defined");
  });

  await t.test("mock queue produces correct latency and completion calculations", async () => {
    // Create a mock queue to verify metric calculations under controlled input
    const mockTimestamp = Date.now() - 2500; // 2.5s ago
    const mockQueue = {
      getJobCounts: async () => ({
        waiting: 4,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 0
      }),
      getJobs: async (types) => {
        if (types.includes("waiting")) {
          return [{ id: "mock-1", timestamp: mockTimestamp }];
        }
        if (types.includes("completed")) {
          return [
            { id: "c-1", processedOn: 1000, finishedOn: 1500 }, // 500ms
            { id: "c-2", processedOn: 2000, finishedOn: 2700 }  // 700ms
          ];
        }
        return [];
      }
    };

    queueMonitor.setQueue(mockQueue);
    const snapshot = await queueMonitor.sample();

    assert.equal(snapshot.counts.waiting, 4);
    assert.equal(snapshot.counts.active, 2);
    assert.equal(snapshot.counts.completed, 10);
    assert.equal(snapshot.counts.failed, 1);
    assert.equal(snapshot.counts.totalActiveAndWaiting, 6);

    assert.ok(snapshot.performance.oldestWaitTimeMs >= 2000, "Oldest wait time should be ~2500ms");
    assert.equal(snapshot.performance.avgProcessingDurationMs, 600, "Avg processing duration of 500ms & 700ms should be 600ms");
    assert.equal(snapshot.workload.isHigh, true, "Waiting 4 should be marked high workload");

    // Failure percent: 1 failed out of 11 finished = 9.09%
    assert.equal(snapshot.performance.failurePercent, 9.09);
  });
});

