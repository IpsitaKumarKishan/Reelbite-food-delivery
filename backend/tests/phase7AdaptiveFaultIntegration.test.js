import test from "node:test";
import assert from "node:assert/strict";
import { AdaptiveControllerService } from "../services/adaptiveController.service.js";

test("Phase 7: Adaptive Concurrency & Fault Recovery Integration", async (t) => {
  const customConfig = {
    MIN_CONCURRENCY: 1,
    MAX_CONCURRENCY: 20,
    INITIAL_CONCURRENCY: 5,
    MONITORING_INTERVAL: 1000,
    CPU_HIGH_THRESHOLD: 80,
    CPU_LOW_THRESHOLD: 50,
    MEMORY_HIGH_THRESHOLD: 85,
    COOLDOWN_PERIOD: 0, // 0ms cooldown for deterministic testing
    MAX_SCALE_UP_STEP: 2,
    MAX_SCALE_DOWN_STEP: 1,
    QUEUE_HIGH_THRESHOLD: 3
  };

  const surgeQueueSnap = { counts: { waiting: 25, active: 5 } };
  const healthyResourceSnap = {
    cpu: { systemPercent: 20 },
    memory: { systemPercent: 35 }
  };

  await t.test("FAULT_RECOVERY_CLAMP: scales down to MIN_CONCURRENCY despite high queue when worker is unhealthy", () => {
    const controller = new AdaptiveControllerService(customConfig);
    assert.equal(controller.currentConcurrency, 5);

    const degradedHealthSnap = {
      totalWorkers: 1,
      activeWorkers: 0,
      unhealthyWorkers: 1,
      recoveringWorkers: 0,
      health: "DEGRADED"
    };

    let listenerCaptured = null;
    controller.onConcurrencyChange((newVal, log) => {
      listenerCaptured = { newVal, log };
    });

    const decision = controller.evaluate(surgeQueueSnap, healthyResourceSnap, degradedHealthSnap);

    assert.equal(decision.adjusted, true);
    assert.equal(decision.rule, "FAULT_RECOVERY_CLAMP");
    assert.equal(decision.newConcurrency, 1);
    assert.equal(controller.currentConcurrency, 1);
    assert.equal(listenerCaptured?.newVal, 1);
    assert.equal(listenerCaptured?.log.rule, "FAULT_RECOVERY_CLAMP");
  });

  await t.test("FAULT_RECOVERY_HOLD: holds at MIN_CONCURRENCY when worker is recovering", () => {
    const controller = new AdaptiveControllerService(customConfig);
    controller.currentConcurrency = 1;

    const recoveringHealthSnap = {
      totalWorkers: 1,
      activeWorkers: 0,
      unhealthyWorkers: 0,
      recoveringWorkers: 1,
      health: "RECOVERING"
    };

    const decision = controller.evaluate(surgeQueueSnap, healthyResourceSnap, recoveringHealthSnap);

    assert.equal(decision.adjusted, false);
    assert.equal(decision.rule, "FAULT_RECOVERY_HOLD");
    assert.equal(decision.currentConcurrency, 1);
    assert.match(decision.reason, /Scale-up frozen at minimum concurrency/i);
  });

  await t.test("Resumes normal resource-aware auto-tuning once worker health is restored", () => {
    const controller = new AdaptiveControllerService(customConfig);
    controller.currentConcurrency = 1;

    const restoredHealthSnap = {
      totalWorkers: 1,
      activeWorkers: 1,
      unhealthyWorkers: 0,
      recoveringWorkers: 0,
      health: "HEALTHY"
    };

    // Surging backlog with healthy worker and low CPU (< 50%) should trigger CASE 1 scale-up (+2)
    const decision = controller.evaluate(surgeQueueSnap, healthyResourceSnap, restoredHealthSnap);

    assert.equal(decision.adjusted, true);
    assert.equal(decision.rule, "CASE_1_HIGH_HEADROOM");
    assert.equal(decision.newConcurrency, 3); // 1 + 2
    assert.equal(controller.currentConcurrency, 3);
  });
});

