import test from "node:test";
import assert from "node:assert/strict";
import {
  getInfrastructureMetrics,
  updateControllerMode,
  simulateTrafficSpike,
  retryFailedJob
} from "../controllers/infrastructure.controllers.js";
import { adaptiveController } from "../services/adaptiveController.service.js";

test("Phase 6: Infrastructure API Controller", async (t) => {
  await t.test("getInfrastructureMetrics returns full telemetry payload", async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(j) {
        capturedJson = j;
        return this;
      }
    };

    await getInfrastructureMetrics({}, mockRes);

    assert.equal(capturedStatus, 200);
    assert.equal(capturedJson.success, true);
    assert(capturedJson.queue !== undefined, "Must contain queue telemetry");
    assert(capturedJson.resources !== undefined, "Must contain resource telemetry");
    assert(capturedJson.controller !== undefined, "Must contain adaptive controller telemetry");
    assert(Array.isArray(capturedJson.workers), "Must contain worker list");
    assert(Array.isArray(capturedJson.adjustmentLogs), "Must contain adjustment audit logs");
    assert(capturedJson.history?.queue !== undefined, "Must contain historical queue metrics");
    assert(capturedJson.history?.resources !== undefined, "Must contain historical resource metrics");
  });

  await t.test("updateControllerMode changes controller mode and rejects invalid mode", async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(j) {
        capturedJson = j;
        return this;
      }
    };

    // Test rejection of invalid mode
    await updateControllerMode({ body: { mode: "unknown-mode" } }, mockRes);
    assert.equal(capturedStatus, 400);

    // Test valid switch to fixed mode
    await updateControllerMode({ body: { mode: "fixed", fixedValue: 8 } }, mockRes);
    assert.equal(capturedStatus, 200);
    assert.equal(adaptiveController.mode, "fixed");
    assert.equal(adaptiveController.currentConcurrency, 8);

    // Test valid switch back to adaptive
    await updateControllerMode({ body: { mode: "adaptive" } }, mockRes);
    assert.equal(capturedStatus, 200);
    assert.equal(adaptiveController.mode, "adaptive");
  });

  await t.test("simulateTrafficSpike enqueues synthetic jobs safely", async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(j) {
        capturedJson = j;
        return this;
      }
    };

    await simulateTrafficSpike({ body: { count: 3 } }, mockRes);
    assert.equal(capturedStatus, 200);
    assert.equal(capturedJson.success, true);
    assert.match(capturedJson.message, /Injected 3 synthetic order tasks/);
  });

  await t.test("retryFailedJob rejects missing job ID", async () => {
    let capturedStatus = null;
    let capturedJson = null;

    const mockRes = {
      status(s) {
        capturedStatus = s;
        return this;
      },
      json(j) {
        capturedJson = j;
        return this;
      }
    };

    await retryFailedJob({ params: {} }, mockRes);
    assert.equal(capturedStatus, 400);
    assert.equal(capturedJson.success, false);
  });
});

