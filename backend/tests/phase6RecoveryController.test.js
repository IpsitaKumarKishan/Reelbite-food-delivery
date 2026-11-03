import test from "node:test";
import assert from "node:assert/strict";
import { RecoveryControllerService } from "../services/recoveryController.service.js";
import { IncidentLoggerService } from "../services/incidentLogger.service.js";

test("Phase 6: Worker & Container Recovery Controller", async (t) => {
  const customConfig = {
    RECOVERY_COOLDOWN_MS: 500, // Short cooldown for test speed
    MAX_RECOVERY_ATTEMPTS: 2,
    RECOVERY_VERIFY_GRACE_MS: 100
  };

  const createTestController = (options = {}) => {
    return new RecoveryControllerService(customConfig, {
      bindDetector: false,
      restartWorkerFn: async () => {},
      ...options
    });
  };

  await t.test("canAttemptRecovery allows initial attempt and enforces cooldown", () => {
    const controller = createTestController();
    const workerId = "worker-test-rec-1";

    const check1 = controller.canAttemptRecovery(workerId);
    assert.equal(check1.allowed, true);
    assert.equal(check1.attempts, 0);

    // Record an attempt
    const history = controller.recoveryHistory.get(workerId);
    history.attempts.push(Date.now());
    history.lastAttemptMs = Date.now();

    // Immediate second attempt should be blocked by cooldown
    const check2 = controller.canAttemptRecovery(workerId);
    assert.equal(check2.allowed, false);
    assert.match(check2.reason, /cooldown active/i);
  });

  await t.test("canAttemptRecovery blocks when max attempts threshold is reached", async () => {
    const controller = createTestController();
    const workerId = "worker-test-rec-2";

    const history = {
      attempts: [Date.now() - 2000, Date.now() - 1000],
      lastAttemptMs: Date.now() - 600 // Past 500ms cooldown
    };
    controller.recoveryHistory.set(workerId, history);

    const check = controller.canAttemptRecovery(workerId);
    assert.equal(check.allowed, false);
    assert.match(check.reason, /Maximum recovery attempts/i);
  });

  await t.test("prevents duplicate concurrent recoveries on the same worker", async () => {
    const controller = createTestController();
    const workerId = "worker-concurrent-1";

    controller.activeRecoveries.add(workerId);

    const result = await controller.recoverWorker(workerId);
    assert.equal(result.success, false);
    assert.equal(result.reason, "Recovery already active");
  });

  await t.test("executes successful worker recovery workflow and resolves incident ticket", async () => {
    const logger = new IncidentLoggerService();
    const controller = createTestController({ incidentLogger: logger });

    const incident = logger.createIncident({
      componentName: "WORKER",
      failureType: "WORKER_CRASH",
      failureTimestamp: Date.now() - 100,
      failureReason: "Uncaught test exception"
    });

    assert.equal(incident.finalStatus, "DETECTED");

    let eventFired = false;
    controller.once("recovered", (entry) => {
      eventFired = true;
      assert.equal(entry.workerId, "worker-success-1");
      assert.equal(entry.status, "SUCCESS");
    });

    const recoveryResult = await controller.recoverWorker(
      "worker-success-1",
      "Process crash simulation",
      incident.incidentId
    );

    assert.equal(recoveryResult.success, true);
    assert.equal(recoveryResult.workerId, "worker-success-1");
    assert.equal(eventFired, true);

    const updatedIncident = logger.getIncidents().find((i) => i.incidentId === incident.incidentId);
    assert.equal(updatedIncident.finalStatus, "RESOLVED");
    assert.equal(updatedIncident.recoveryAttempts, 1);
    assert(updatedIncident.recoveryTimeMs >= 0);
  });

  await t.test("getRecoveryStats aggregates recovery counts and average MTTR accurately", () => {
    const controller = createTestController();

    controller._recordLog({
      workerId: "w1",
      action: "WORKER_RECOVERED",
      status: "SUCCESS",
      recoveryTimeMs: 120,
      timestamp: new Date().toISOString()
    });
    controller._recordLog({
      workerId: "w2",
      action: "WORKER_RECOVERED",
      status: "SUCCESS",
      recoveryTimeMs: 180,
      timestamp: new Date().toISOString()
    });
    controller._recordLog({
      workerId: "w3",
      action: "RECOVERY_BLOCKED",
      status: "BLOCKED",
      timestamp: new Date().toISOString()
    });

    const stats = controller.getRecoveryStats();
    assert.equal(stats.totalRecoveriesInitiated, 3);
    assert.equal(stats.successCount, 2);
    assert.equal(stats.blockedCount, 1);
    assert.equal(stats.avgRecoveryTimeMs, 150); // (120 + 180) / 2
  });

  await t.test("getContainerRecoveryPolicy provides structured infrastructure documentation", () => {
    const controller = new RecoveryControllerService(customConfig);
    const policy = controller.getContainerRecoveryPolicy();

    assert.equal(policy.orchestrator, "Docker / Docker Compose");
    assert.equal(policy.restartPolicy, "unless-stopped");
    assert.equal(policy.healthCheck.endpoint, "/api/health");
    assert.equal(policy.shutdownGracePeriodSeconds, 15);
  });
});
