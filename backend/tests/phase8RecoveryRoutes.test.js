import test from "node:test";
import assert from "node:assert/strict";
import {
  getInfrastructureMetrics,
  getIncidents,
  getDlqJobs,
  retryDlqJob,
  discardDlqJob
} from "../controllers/infrastructure.controllers.js";
import { dlqManager, PermanentJobError } from "../services/dlqManager.service.js";
import { incidentLogger } from "../services/incidentLogger.service.js";

test("Phase 8: Fault Tolerance & Recovery API Endpoints", async (t) => {
  // Helper to create mock Express response object
  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
    return res;
  };

  await t.test("getInfrastructureMetrics returns faultTolerance telemetry structure", async () => {
    const req = {};
    const res = createMockRes();

    await getInfrastructureMetrics(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert(res.body.faultTolerance != null);
    assert(res.body.faultTolerance.incidentMetrics != null);
    assert(Array.isArray(res.body.faultTolerance.recentIncidents));
    assert(res.body.faultTolerance.recoveryStats != null);
    assert(res.body.faultTolerance.dlqStats != null);
    assert(res.body.faultTolerance.containerPolicy != null);
    assert.equal(res.body.faultTolerance.containerPolicy.restartPolicy, "unless-stopped");
  });

  await t.test("getIncidents returns formatted incidents and MTTR/MTTD metrics", async () => {
    incidentLogger.createIncident({
      componentName: "WORKER",
      failureType: "WORKER_CRASH",
      failureTimestamp: Date.now() - 50,
      failureReason: "Route test crash"
    });

    const req = { query: {} };
    const res = createMockRes();

    await getIncidents(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.incidents));
    assert(res.body.incidents.length > 0);
    assert(res.body.metrics.totalIncidents > 0);
  });

  await t.test("getDlqJobs returns paginated dead letter jobs and store statistics", async () => {
    dlqManager.recordFailedJob(
      {
        id: "job-dlq-route-1",
        data: { orderId: "ord-route-100" },
        attemptsMade: 3,
        opts: { attempts: 3 }
      },
      new Error("Timeout error")
    );

    const req = { query: {} };
    const res = createMockRes();

    await getDlqJobs(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert(Array.isArray(res.body.jobs));
    assert(res.body.jobs.some((j) => j.jobId === "job-dlq-route-1"));
    assert.equal(typeof res.body.stats.totalFailedInStore, "number");
  });

  await t.test("retryDlqJob validates permanent errors and rejects double retries", async () => {
    dlqManager.recordFailedJob(
      {
        id: "job-perm-route-1",
        data: { orderId: "ord-perm-1" },
        attemptsMade: 1,
        opts: { attempts: 3 }
      },
      new PermanentJobError("Invalid order payload")
    );

    // Unforced retry of permanent error must be rejected
    const req1 = { params: { jobId: "job-perm-route-1" }, body: { force: false } };
    const res1 = createMockRes();
    await retryDlqJob(req1, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.body.reason, /permanent validation failure/i);
  });

  await t.test("discardDlqJob removes or marks job discarded from DLQ", async () => {
    dlqManager.recordFailedJob(
      {
        id: "job-discard-route-1",
        data: { orderId: "ord-discard-1" },
        attemptsMade: 3,
        opts: { attempts: 3 }
      },
      new Error("Network fail")
    );

    const req = { params: { jobId: "job-discard-route-1" }, body: { reason: "Customer cancelled" } };
    const res = createMockRes();

    await discardDlqJob(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.discarded.status, "DISCARDED");
    assert.equal(res.body.discarded.eligibleForRetry, false);
  });
});

