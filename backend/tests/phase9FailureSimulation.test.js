process.env.NODE_ENV = "test";

import test from "node:test";
import assert from "node:assert/strict";
import { failureSimulation } from "../services/failureSimulation.service.js";
import { simulateFailureScenario } from "../controllers/infrastructure.controllers.js";
import { closeOrderWorker } from "../workers/order.worker.js";

test("Phase 9: Controlled Failure Simulation Module", async (t) => {
  t.after(async () => {
    await closeOrderWorker();
  });
  await t.test("CASE 1: simulateWorkerCrash creates structured crash incident", async () => {
    const res = await failureSimulation.simulateWorkerCrash("worker-unit-sim-1");
    assert.equal(res.success, true);
    assert.equal(res.caseType, "CASE_1_WORKER_CRASH");
    assert.equal(res.workerId, "worker-unit-sim-1");
    assert.match(res.incidentId, /^INC-WORKER-/);
  });

  await t.test("CASE 2: simulateHeartbeatTimeout marks worker UNHEALTHY and logs incident", async () => {
    const res = await failureSimulation.simulateHeartbeatTimeout("worker-unit-sim-2");
    assert.equal(res.success, true);
    assert.equal(res.caseType, "CASE_2_HEARTBEAT_TIMEOUT");
    assert.equal(res.workerId, "worker-unit-sim-2");
    assert.match(res.incidentId, /^INC-WORKER-/);
  });

  await t.test("CASE 3: simulateRedisInterruption logs disconnect incident and schedules restore", async () => {
    const res = await failureSimulation.simulateRedisInterruption(50);
    assert.equal(res.success, true);
    assert.equal(res.caseType, "CASE_3_REDIS_DISCONNECTED");
    assert.match(res.incidentId, /^INC-REDIS-/);
    assert.equal(res.durationMs, 50);
  });

  await t.test("CASE 4: simulateDbHiccup logs DB disconnect incident and schedules restore", async () => {
    const res = await failureSimulation.simulateDbHiccup(50);
    assert.equal(res.success, true);
    assert.equal(res.caseType, "CASE_4_DB_DISCONNECTED");
    assert.match(res.incidentId, /^INC-MONGODB-/);
    assert.equal(res.durationMs, 50);
  });

  await t.test("simulateJobException enqueues transient retry and permanent DLQ jobs", async () => {
    const transientRes = await failureSimulation.simulateJobException({
      orderId: "ord-test-transient",
      isPermanent: false
    });
    assert.equal(transientRes.success, true);
    assert.equal(transientRes.failureType, "TRANSIENT_EXHAUSTED");
    assert.equal(transientRes.orderId, "ord-test-transient");

    const permRes = await failureSimulation.simulateJobException({
      orderId: "ord-test-perm",
      isPermanent: true
    });
    assert.equal(permRes.success, true);
    assert.equal(permRes.failureType, "PERMANENT_VALIDATION");
    assert.equal(permRes.orderId, "ord-test-perm");
  });

  await t.test("simulateDuplicateJob submits dual jobs for idempotency testing", async () => {
    const res = await failureSimulation.simulateDuplicateJob("ord-test-dup");
    assert.equal(res.success, true);
    assert.equal(res.orderId, "ord-test-dup");
    assert(res.message.includes("Concurrent dual jobs"));
  });

  await t.test("simulateFailureScenario controller endpoint handles scenarios and rejects invalid input", async () => {
    const mockRes = () => {
      const r = {
        statusCode: 200,
        body: null,
        status(c) {
          this.statusCode = c;
          return this;
        },
        json(d) {
          this.body = d;
          return this;
        }
      };
      return r;
    };

    // Valid scenario
    const req1 = { body: { scenario: "WORKER_CRASH", targetWorkerId: "worker-ctl-sim" } };
    const res1 = mockRes();
    await simulateFailureScenario(req1, res1);
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.caseType, "CASE_1_WORKER_CRASH");

    // Invalid scenario
    const req2 = { body: { scenario: "UNKNOWN_CHAOS" } };
    const res2 = mockRes();
    await simulateFailureScenario(req2, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.body.message, /Unknown simulation scenario/);
  });
});
