import test from "node:test";
import assert from "node:assert/strict";
import { IncidentLoggerService } from "../services/incidentLogger.service.js";
import { FailureDetectionService } from "../services/failureDetection.service.js";
import { WorkerHealthService } from "../services/workerHealth.service.js";
import { DbConnectionMonitorService } from "../services/dbConnectionMonitor.service.js";

test("Phase 3: Incident Logger & MTTR / MTTD Mathematics", async (t) => {
  const logger = new IncidentLoggerService();

  await t.test("creates structured incident ticket with accurate detection latency", () => {
    const failTime = Date.now() - 250; // Failed 250ms ago
    const incident = logger.createIncident({
      componentName: "WORKER",
      failureType: "WORKER_CRASH",
      failureTimestamp: failTime,
      failureReason: "Process SIGSEGV"
    });

    assert.match(incident.incidentId, /^INC-WORKER-/);
    assert.equal(incident.finalStatus, "DETECTED");
    assert(incident.detectionTimeMs >= 240, "Detection latency must reflect elapsed time");
    assert.equal(incident.recoveryTimestamp, null);
    assert.equal(incident.recoveryTimeMs, null);
  });

  await t.test("transitions incident to RECOVERING and calculates Recovery Time on RESOLVED", async () => {
    const failTime = Date.now() - 300;
    const inc = logger.createIncident({
      componentName: "REDIS",
      failureType: "REDIS_DISCONNECTED",
      failureTimestamp: failTime
    });

    logger.markRecovering(inc.incidentId, 2);
    let updated = logger.getIncidents({ componentName: "REDIS" }).find((i) => i.incidentId === inc.incidentId);
    assert.equal(updated.finalStatus, "RECOVERING");
    assert.equal(updated.recoveryAttempts, 2);

    await new Promise((r) => setTimeout(r, 50));
    logger.resolveIncident(inc.incidentId, { resolutionNotes: "Socket reconnected" });

    updated = logger.getIncidents({ componentName: "REDIS" }).find((i) => i.incidentId === inc.incidentId);
    assert.equal(updated.finalStatus, "RESOLVED");
    assert(updated.recoveryTimeMs >= 350, "Recovery latency must exceed failure duration");
  });

  await t.test("computes MTTR and MTTD analytics accurately", () => {
    const metrics = logger.getMetrics();
    assert.equal(metrics.totalIncidents, 2);
    assert.equal(metrics.resolvedIncidents, 1);
    assert.equal(metrics.activeIncidents, 1);
    assert(metrics.mttdMs > 0);
    assert(metrics.mttrMs > 0);
    assert.equal(metrics.byComponent.WORKER, 1);
    assert.equal(metrics.byComponent.REDIS, 1);
  });
});

test("Phase 3: Automated Failure Detection Service (CASE 1 - CASE 5)", async (t) => {
  const detector = new FailureDetectionService();

  let capturedEvent = null;
  const unsubscribe = detector.onFailure((e) => {
    capturedEvent = e;
  });

  await t.test("CASE 1: Detects worker crash abruptly and marks worker UNHEALTHY", () => {
    const inc = detector.detectWorkerCrash("worker-crash-unit", "OOM Killer terminated child process");
    assert.equal(inc.componentName, "WORKER");
    assert.equal(inc.failureType, "WORKER_CRASH");
    assert.equal(capturedEvent?.caseType, "CASE_1_WORKER_CRASH");
    assert.equal(capturedEvent?.workerId, "worker-crash-unit");
  });

  await t.test("CASE 2: Detects worker heartbeat timeout (zombie state)", () => {
    const mockWorker = {
      workerId: "worker-zombie-1",
      pid: 9999,
      missedHeartbeats: 4,
      activeJobs: 1,
      lastHeartbeatMs: Date.now() - 12000
    };

    const inc = detector.detectHeartbeatTimeout(mockWorker, "Heartbeat lapsed for 12000ms");
    assert.equal(inc.componentName, "WORKER");
    assert.equal(inc.failureType, "HEARTBEAT_TIMEOUT");
    assert.equal(capturedEvent?.caseType, "CASE_2_HEARTBEAT_TIMEOUT");
  });

  await t.test("CASE 3: Detects Redis disconnection and handles resolution upon reconnection", () => {
    const inc = detector.detectRedisDisconnect(new Date().toISOString(), "Connection reset by peer");
    assert.equal(inc.componentName, "REDIS");
    assert.equal(inc.failureType, "REDIS_DISCONNECTED");
    assert.equal(capturedEvent?.caseType, "CASE_3_REDIS_DISCONNECTED");

    detector.handleRedisRestored(new Date().toISOString());
  });

  await t.test("CASE 4: Detects MongoDB disconnection", () => {
    const inc = detector.detectDbDisconnect(new Date().toISOString(), "Topology was destroyed");
    assert.equal(inc.componentName, "MONGODB");
    assert.equal(inc.failureType, "DB_DISCONNECTED");
    assert.equal(capturedEvent?.caseType, "CASE_4_DB_DISCONNECTED");

    detector.handleDbRestored(new Date().toISOString());
  });

  await t.test("CASE 5: Detects container shutdown on SIGTERM", () => {
    const inc = detector.detectContainerShutdown("SIGTERM");
    assert.equal(inc.componentName, "CONTAINER");
    assert.equal(inc.failureType, "CONTAINER_SHUTDOWN");
    assert.equal(capturedEvent?.caseType, "CASE_5_CONTAINER_SHUTDOWN");
  });

  unsubscribe();
});

test("Phase 3: MongoDB Atlas Transient Retry Wrapper", async (t) => {
  const dbMonitor = new DbConnectionMonitorService();

  await t.test("retries transient database errors with exponential backoff and succeeds", async () => {
    let callCount = 0;
    const transientOperation = async () => {
      callCount++;
      if (callCount < 3) {
        const transientErr = new Error("connection closed");
        transientErr.name = "MongoNetworkError";
        throw transientErr;
      }
      return { success: true, count: callCount };
    };

    const result = await dbMonitor.executeWithRetry(transientOperation, 3, 20);
    assert.equal(result.success, true);
    assert.equal(callCount, 3, "Operation should have succeeded on attempt 3");
  });

  await t.test("immediately fails permanent validation errors without retrying", async () => {
    let callCount = 0;
    const permanentOperation = async () => {
      callCount++;
      const valErr = new Error("Invalid ObjectId format");
      valErr.name = "ValidationError";
      throw valErr;
    };

    await assert.rejects(async () => {
      await dbMonitor.executeWithRetry(permanentOperation, 3, 20);
    }, /Invalid ObjectId format/);

    assert.equal(callCount, 1, "Permanent errors must not be retried");
  });
});

