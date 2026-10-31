import test from "node:test";
import assert from "node:assert/strict";
import { enqueueOrderProcessing, getQueueMetrics, ORDER_QUEUE_NAME } from "../queues/order.queue.js";

test("Order Queue Architecture Unit Tests", async (t) => {
  await t.test("Queue name is configured as expected", () => {
    assert.equal(ORDER_QUEUE_NAME, "order-events");
  });

  await t.test("enqueueOrderProcessing handles job payload safely without crashing", async () => {
    const mockOrderPayload = {
      orderId: "6724a8bc31234567890abcde",
      totalAmount: 499,
      paymentMethod: "cod"
    };

    // When Redis is connected, it returns { queued: true, jobId }.
    // When offline in dev/test, it returns { queued: false, reason } gracefully without throwing.
    const result = await enqueueOrderProcessing(mockOrderPayload);
    assert.ok(typeof result.queued === "boolean");
    if (result.queued) {
      assert.ok(result.jobId);
    } else {
      assert.ok(result.reason);
    }
  });

  await t.test("getQueueMetrics returns complete observability structure", async () => {
    const metrics = await getQueueMetrics();
    assert.equal(metrics.queue, "order-events");
    assert.ok(["HEALTHY", "OFFLINE", "UNAVAILABLE"].includes(metrics.status));
    assert.ok(typeof metrics.metrics === "object");
    assert.ok("waiting" in metrics.metrics);
    assert.ok("active" in metrics.metrics);
    assert.ok("completed" in metrics.metrics);
    assert.ok("failed" in metrics.metrics);
    assert.ok(metrics.timestamp);
  });
});

