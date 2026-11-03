import test from "node:test";
import assert from "node:assert/strict";
import { ADAPTIVE_CONFIG } from "../config/adaptiveConfig.js";
import { AdaptiveControllerService } from "../services/adaptiveController.service.js";

test("Phase 3: Adaptive Concurrency Controller Decision Logic", async (t) => {
  // Use a custom test config with 0ms cooldown for fast discrete rule testing
  const testConfig = {
    ...ADAPTIVE_CONFIG,
    MIN_CONCURRENCY: 1,
    MAX_CONCURRENCY: 20,
    INITIAL_CONCURRENCY: 5,
    COOLDOWN_PERIOD: 0, // Disabled cooldown for immediate transition testing
    CPU_HIGH_THRESHOLD: 80,
    CPU_LOW_THRESHOLD: 50,
    MEMORY_HIGH_THRESHOLD: 85,
    QUEUE_HIGH_THRESHOLD: 3,
    MAX_SCALE_UP_STEP: 2,
    MAX_SCALE_DOWN_STEP: 1,
    EMERGENCY_SCALE_DOWN_STEP: 2
  };

  await t.test("CASE 1: High workload + Low CPU/Mem scales up concurrency by +2", () => {
    const controller = new AdaptiveControllerService(testConfig);
    assert.equal(controller.currentConcurrency, 5);

    const queueSnap = { counts: { waiting: 8, active: 5 } };
    const resourceSnap = { cpu: { systemPercent: 30 }, memory: { systemPercent: 45 } };

    const result = controller.evaluate(queueSnap, resourceSnap);

    assert.equal(result.adjusted, true);
    assert.equal(result.previousConcurrency, 5);
    assert.equal(result.newConcurrency, 7);
    assert.equal(result.rule, "CASE_1_HIGH_HEADROOM");
    assert.equal(controller.currentConcurrency, 7);

    // Verify structured log entry
    assert.ok(result.logEntry);
    assert.equal(result.logEntry.delta, 2);
    assert.equal(result.logEntry.waitingJobs, 8);
    assert.equal(result.logEntry.cpuPercent, 30);
  });

  await t.test("CASE 2: Drained / Low workload scales down concurrency gradually by -1", () => {
    const controller = new AdaptiveControllerService(testConfig);
    controller.currentConcurrency = 6;

    const queueSnap = { counts: { waiting: 0, active: 0 } };
    const resourceSnap = { cpu: { systemPercent: 15 }, memory: { systemPercent: 40 } };

    const result = controller.evaluate(queueSnap, resourceSnap);

    assert.equal(result.adjusted, true);
    assert.equal(result.previousConcurrency, 6);
    assert.equal(result.newConcurrency, 5);
    assert.equal(result.rule, "CASE_2_IDLE_DRAIN");
    assert.equal(controller.currentConcurrency, 5);
  });

  await t.test("CASE 2: Respects MIN_CONCURRENCY lower bound", () => {
    const controller = new AdaptiveControllerService(testConfig);
    controller.currentConcurrency = 1; // Already at minimum

    const queueSnap = { counts: { waiting: 0, active: 0 } };
    const resourceSnap = { cpu: { systemPercent: 10 }, memory: { systemPercent: 30 } };

    const result = controller.evaluate(queueSnap, resourceSnap);

    assert.equal(result.adjusted, false);
    assert.equal(result.currentConcurrency, 1);
  });

  await t.test("CASE 3: High workload + High CPU (>=80%) holds concurrency (does not increase)", () => {
    const controller = new AdaptiveControllerService(testConfig);
    controller.currentConcurrency = 5;

    const queueSnap = { counts: { waiting: 15, active: 5 } };
    const resourceSnap = { cpu: { systemPercent: 88 }, memory: { systemPercent: 50 } }; // 88% CPU

    const result = controller.evaluate(queueSnap, resourceSnap);

    assert.equal(result.adjusted, false);
    assert.equal(result.currentConcurrency, 5);
    assert.equal(result.rule, "CASE_3_CPU_SATURATED");
  });

  await t.test("CASE 4: Memory critical (>=85%) emergency downscales by 2 immediately", () => {
    const controller = new AdaptiveControllerService(testConfig);
    controller.currentConcurrency = 8;

    const queueSnap = { counts: { waiting: 20, active: 8 } };
    const resourceSnap = { cpu: { systemPercent: 40 }, memory: { systemPercent: 91 } }; // 91% RAM!

    const result = controller.evaluate(queueSnap, resourceSnap);

    assert.equal(result.adjusted, true);
    assert.equal(result.previousConcurrency, 8);
    assert.equal(result.newConcurrency, 6);
    assert.equal(result.rule, "CASE_4_EMERGENCY_MEMORY");
    assert.equal(controller.currentConcurrency, 6);
  });

  await t.test("CASE 5: Continuous queue growth triggers cautious +1 scale-up", () => {
    const controller = new AdaptiveControllerService(testConfig);
    controller.currentConcurrency = 4;

    // Simulate queue growing across consecutive intervals: 2 -> 5 -> 9
    controller.evaluate({ counts: { waiting: 2, active: 2 } }, { cpu: { systemPercent: 60 }, memory: { systemPercent: 50 } });
    controller.evaluate({ counts: { waiting: 5, active: 2 } }, { cpu: { systemPercent: 60 }, memory: { systemPercent: 50 } });
    const result = controller.evaluate({ counts: { waiting: 9, active: 2 } }, { cpu: { systemPercent: 60 }, memory: { systemPercent: 50 } });

    assert.equal(result.adjusted, true);
    assert.equal(result.newConcurrency, 6);
    assert.equal(result.rule, "CASE_5_TRENDING_GROWTH");
  });

  await t.test("Hysteresis & Cooldown: Non-emergency adjustments blocked within cooldown period", () => {
    const controllerWithCooldown = new AdaptiveControllerService({
      ...testConfig,
      COOLDOWN_PERIOD: 10000 // 10 second cooldown
    });

    // 1st adjustment succeeds
    const res1 = controllerWithCooldown.evaluate(
      { counts: { waiting: 8, active: 4 } },
      { cpu: { systemPercent: 25 }, memory: { systemPercent: 40 } }
    );
    assert.equal(res1.adjusted, true);
    assert.equal(res1.newConcurrency, 7);

    // 2nd immediate check within cooldown window must HOLD
    const res2 = controllerWithCooldown.evaluate(
      { counts: { waiting: 12, active: 7 } },
      { cpu: { systemPercent: 25 }, memory: { systemPercent: 40 } }
    );
    assert.equal(res2.adjusted, false);
    assert.equal(res2.rule, "COOLDOWN_ACTIVE");
    assert.equal(controllerWithCooldown.currentConcurrency, 7);

    // Emergency memory still bypasses cooldown!
    const res3 = controllerWithCooldown.evaluate(
      { counts: { waiting: 12, active: 7 } },
      { cpu: { systemPercent: 25 }, memory: { systemPercent: 92 } } // Critical RAM
    );
    assert.equal(res3.adjusted, true);
    assert.equal(res3.rule, "CASE_4_EMERGENCY_MEMORY");
    assert.equal(controllerWithCooldown.currentConcurrency, 5);
  });

  await t.test("Fixed Mode locks concurrency for experimental benchmarking", () => {
    const controller = new AdaptiveControllerService(testConfig);
    controller.setMode("fixed", 3);

    const result = controller.evaluate(
      { counts: { waiting: 50, active: 3 } },
      { cpu: { systemPercent: 10 }, memory: { systemPercent: 20 } }
    );

    assert.equal(controller.currentConcurrency, 3);
    assert.equal(controller.mode, "fixed");
  });
});
