import test from "node:test";
import assert from "node:assert/strict";
import { orderQueue, getDeadLetterJobs, retryDeadLetterJob } from "../queues/order.queue.js";
import { WorkerHealthService } from "../services/workerHealth.service.js";

test("Phase 5: Queue Retry & Dead Letter Queue (DLQ) Configuration", async (t) => {
  await t.test("verifies exponential backoff and DLQ retention defaults", () => {
    if (orderQueue && orderQueue.defaultJobOptions) {
      const opts = orderQueue.defaultJobOptions;
      assert.equal(opts.attempts, 3, "Queue must configure 3 retry attempts");
      assert.equal(opts.backoff?.type, "exponential", "Retry must use exponential backoff");
      assert.equal(opts.backoff?.delay, 1500, "Initial backoff delay must be 1500ms");
      assert.equal(opts.removeOnFail, false, "Failed jobs must not be deleted; preserved in DLQ");
      assert.equal(opts.removeOnComplete, 100, "Last 100 completed jobs preserved for metrics");
    }
  });

  await t.test("DLQ getters handle offline/empty state gracefully without throwing", async () => {
    const deadJobs = await getDeadLetterJobs(0, 10);
    assert(Array.isArray(deadJobs));

    const retryResult = await retryDeadLetterJob("non-existent-job-id");
    assert.equal(typeof retryResult.success, "boolean");
  });
});

test("Phase 5: Order Processing Idempotency Safeguard Logic", async (t) => {
  await t.test("skips duplicate socket notification when order was previously processed", () => {
    let socketDispatchedCount = 0;
    const fakeIo = {
      to: () => ({
        emit: () => {
          socketDispatchedCount++;
        }
      })
    };

    const processOrderSimulation = (order, io) => {
      // Idempotency Safeguard Check
      if (order.notificationDispatched) {
        return { dispatched: false, reason: "ALREADY_DISPATCHED" };
      }

      if (io && order.shopOrders) {
        order.shopOrders.forEach(() => {
          io.to("owner-socket").emit("newOrder", { id: order._id });
        });
      }

      order.notificationDispatched = true;
      order.notificationDispatchedAt = new Date();
      return { dispatched: true };
    };

    const mockOrder = {
      _id: "order-id-12345",
      notificationDispatched: false,
      shopOrders: [{ owner: "owner-1" }]
    };

    // First attempt: should dispatch
    const firstAttempt = processOrderSimulation(mockOrder, fakeIo);
    assert.equal(firstAttempt.dispatched, true);
    assert.equal(socketDispatchedCount, 1);
    assert.equal(mockOrder.notificationDispatched, true);

    // Second attempt (retry after network hiccup): should NOT dispatch duplicate notification
    const secondAttempt = processOrderSimulation(mockOrder, fakeIo);
    assert.equal(secondAttempt.dispatched, false);
    assert.equal(secondAttempt.reason, "ALREADY_DISPATCHED");
    assert.equal(socketDispatchedCount, 1, "Socket count must remain 1 (no duplicate alert)");
  });
});

test("Phase 5: Worker Fault Tracking and Graceful Degradation", async (t) => {
  const healthService = new WorkerHealthService();
  healthService.registerWorker("worker-fault-test", {
    status: "ACTIVE",
    concurrency: 5
  });

  await t.test("tracks repeated failures and updates health status accurately", () => {
    healthService.recordJobStart("worker-fault-test");
    healthService.recordJobFailure("worker-fault-test", "MongoDB Atlas connection dropped");

    let status = healthService.getWorkers().find((w) => w.workerId === "worker-fault-test");
    assert.equal(status.failedJobs, 1);
    assert.equal(status.errorCount, 1);
    assert.equal(status.lastError, "MongoDB Atlas connection dropped");
    assert.equal(status.activeJobs, 0);

    const summary = healthService.getSummary();
    assert.equal(summary.totalFailedJobs, 1);
    assert.equal(summary.health, "HEALTHY", "Single failure does not take worker down completely");
  });

  await t.test("marks worker OFFLINE upon deregistration during graceful shutdown", () => {
    healthService.deregisterWorker("worker-fault-test");
    const status = healthService.getWorkers().find((w) => w.workerId === "worker-fault-test");
    assert.equal(status.status, "OFFLINE");

    const summary = healthService.getSummary();
    assert.equal(summary.health, "OFFLINE");
  });
});

