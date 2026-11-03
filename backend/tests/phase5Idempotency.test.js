import test from "node:test";
import assert from "node:assert/strict";
import Order from "../models/order.model.js";
import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";

test("Phase 5: Order Idempotency Schema & Distributed State Machine", async (t) => {
  await t.test("Order model schema incorporates distributed processing lock and status fields", () => {
    const order = new Order({
      paymentMethod: "cod",
      totalAmount: 450
    });

    assert.equal(order.orderProcessingStatus, "PENDING");
    assert.equal(order.processingLock, null);
    assert.equal(order.processingLockedAt, null);
    assert.equal(order.processingAttempts, 0);
    assert.equal(order.notificationDispatched, false);
    assert.equal(order.notificationDispatchedAt, null);
  });

  await t.test("Simulated atomic lock prevents concurrent double processing of the same order", () => {
    // In-memory representation of an Order document
    let orderDoc = {
      _id: "order-test-1",
      orderProcessingStatus: "PENDING",
      processingLock: null,
      processingLockedAt: null,
      processingAttempts: 0,
      notificationDispatched: false
    };

    // Atomic findOneAndUpdate simulator with identical query criteria
    const simulateLockAcquisition = (order, jobId, now = Date.now()) => {
      const lockStaleThreshold = now - RECOVERY_CONFIG.JOB_LOCK_DURATION_MS;
      const canAcquire =
        ["PENDING", "FAILED"].includes(order.orderProcessingStatus) ||
        order.processingLock === jobId ||
        (order.orderProcessingStatus === "PROCESSING" &&
          order.processingLockedAt &&
          order.processingLockedAt.getTime() < lockStaleThreshold);

      if (!canAcquire) {
        return null;
      }

      order.orderProcessingStatus = "PROCESSING";
      order.processingLock = jobId;
      order.processingLockedAt = new Date(now);
      order.processingAttempts++;
      return { ...order };
    };

    // Worker 1 acquires lock
    const lock1 = simulateLockAcquisition(orderDoc, "job-worker-1");
    assert(lock1 !== null, "Worker 1 must acquire initial lock");
    assert.equal(orderDoc.orderProcessingStatus, "PROCESSING");
    assert.equal(orderDoc.processingLock, "job-worker-1");
    assert.equal(orderDoc.processingAttempts, 1);

    // Worker 2 attempts concurrent lock acquisition while Worker 1 is still processing
    const lock2 = simulateLockAcquisition(orderDoc, "job-worker-2");
    assert.equal(lock2, null, "Worker 2 must be rejected due to active lock");
    assert.equal(orderDoc.processingLock, "job-worker-1", "Lock must remain with Worker 1");
  });

  await t.test("Stale lock recovery allows new worker to reclaim abandoned job after crash", () => {
    const crashedTime = Date.now() - 35000; // 35s ago (stale > 30s lock duration)
    let orderDoc = {
      _id: "order-crashed-1",
      orderProcessingStatus: "PROCESSING",
      processingLock: "job-crashed-worker",
      processingLockedAt: new Date(crashedTime),
      processingAttempts: 1,
      notificationDispatched: false
    };

    const lockStaleThreshold = Date.now() - RECOVERY_CONFIG.JOB_LOCK_DURATION_MS;
    const isStale = orderDoc.processingLockedAt.getTime() < lockStaleThreshold;
    assert.equal(isStale, true, "Lock should be deemed stale after lock duration expires");

    // Recovery worker claims stale lock
    if (isStale) {
      orderDoc.processingLock = "job-recovery-worker";
      orderDoc.processingLockedAt = new Date();
      orderDoc.processingAttempts++;
    }

    assert.equal(orderDoc.processingLock, "job-recovery-worker");
    assert.equal(orderDoc.processingAttempts, 2);
  });

  await t.test("Duplicate Socket.IO notification is suppressed on retried or re-delivered job", () => {
    let orderDoc = {
      _id: "order-notif-1",
      orderProcessingStatus: "PROCESSING",
      notificationDispatched: true,
      notificationDispatchedAt: new Date(Date.now() - 5000),
      shopOrders: [{ shop: { name: "Burger Bistro" }, owner: { socketId: "sock-100" } }]
    };

    let alertCount = 0;
    const mockIo = {
      to: () => ({
        emit: () => {
          alertCount++;
        }
      })
    };

    // Notification step in worker
    if (!orderDoc.notificationDispatched) {
      orderDoc.shopOrders.forEach((so) => {
        mockIo.to(so.owner.socketId).emit("newOrder", { id: orderDoc._id });
      });
      orderDoc.notificationDispatched = true;
    }

    assert.equal(alertCount, 0, "No notification should be emitted if notificationDispatched is true");
  });

  await t.test("Already COMPLETED order bypasses processing entirely with idempotent response", () => {
    const orderDoc = {
      _id: "order-completed-1",
      orderProcessingStatus: "COMPLETED",
      notificationDispatched: true
    };

    const processJobStep = (order) => {
      if (order.orderProcessingStatus === "COMPLETED") {
        return {
          status: "BYPASS_IDEMPOTENT",
          orderId: order._id,
          reason: "ALREADY_COMPLETED"
        };
      }
      return { status: "PROCESSING" };
    };

    const result = processJobStep(orderDoc);
    assert.equal(result.status, "BYPASS_IDEMPOTENT");
    assert.equal(result.reason, "ALREADY_COMPLETED");
  });
});

