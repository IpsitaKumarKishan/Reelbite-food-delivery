import { Worker } from "bullmq";
import { redisConnectionOptions, REDIS_URL } from "../config/redis.js";
import { ORDER_QUEUE_NAME } from "../queues/order.queue.js";
import Order from "../models/order.model.js";
import { adaptiveController } from "../services/adaptiveController.service.js";
import { queueMonitor } from "../services/queueMonitor.service.js";
import { workerHealthMonitor } from "../services/workerHealth.service.js";

let orderWorker = null;
const workerId = process.env.WORKER_ID || `worker-order-${process.pid}`;
let unsubscribeConcurrencyListener = null;

/**
 * Initializes the asynchronous order worker with adaptive concurrency.
 * Uses native dynamic worker concurrency configuration (Vertical Scaling).
 * @param {import("socket.io").Server} io 
 */
export const initOrderWorker = (io) => {
  if (orderWorker) {
    return orderWorker;
  }

  try {
    const initialConcurrency = adaptiveController.currentConcurrency || 5;

    // Register initial worker state in health monitor
    workerHealthMonitor.registerWorker(workerId, {
      status: "ACTIVE",
      concurrency: initialConcurrency,
      scalingType: "VERTICAL_DYNAMIC_CONCURRENCY"
    });

    orderWorker = new Worker(
      ORDER_QUEUE_NAME,
      async (job) => {
        const { orderId } = job.data;
        const jobStartTime = process.hrtime.bigint();
        workerHealthMonitor.recordJobStart(workerId);

        try {
          console.log(`[Order Worker] ⚡ Processing Job #${job.id} for Order ID: ${orderId}`);

          // 1. Fetch & populate fresh order details from database
          const order = await Order.findById(orderId)
            .populate("shopOrders.shop", "name")
            .populate("shopOrders.owner", "name socketId")
            .populate("shopOrders.shopOrderItems.item", "name image price")
            .populate("user", "fullName email mobile");

          if (!order) {
            throw new Error(`Order #${orderId} was not found in database. Retrying...`);
          }

          // 2. Idempotency Safeguard: Check if notification was already dispatched
          if (order.notificationDispatched) {
            console.log(
              `[Order Worker] 🛡️ Idempotency check: Order #${orderId} notification was already dispatched at ${order.notificationDispatchedAt}. Skipping duplicate notification.`
            );
          } else {
            // Real-time Restaurant Owner notification via Socket.IO
            if (io && Array.isArray(order.shopOrders)) {
              order.shopOrders.forEach((shopOrder) => {
                const ownerSocketId = shopOrder.owner?.socketId;
                if (ownerSocketId) {
                  io.to(ownerSocketId).emit("newOrder", {
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    user: order.user || {
                      fullName: order.deliveryAddress?.name || "Customer",
                      email: "N/A",
                      mobile: order.contactMobile || "N/A"
                    },
                    shopOrders: shopOrder,
                    createdAt: order.createdAt,
                    deliveryAddress: order.deliveryAddress,
                    payment: order.payment
                  });
                  console.log(`[Order Worker] 📢 Real-time alert dispatched to restaurant: ${shopOrder.shop?.name || "Shop"}`);
                }
              });
            }

            // Mark notification safely dispatched to prevent duplicates on retries
            order.notificationDispatched = true;
            order.notificationDispatchedAt = new Date();
            await order.save();
          }

          const durationNs = process.hrtime.bigint() - jobStartTime;
          const durationMs = Number(durationNs / 1000000n);

          // Record performance metrics
          queueMonitor.recordJobDuration(durationMs);
          workerHealthMonitor.recordJobComplete(workerId, durationMs);

          return {
            status: "SUCCESS",
            orderId: order._id,
            durationMs,
            processedAt: new Date().toISOString()
          };
        } catch (err) {
          workerHealthMonitor.recordJobFailure(workerId, err.message);
          throw err;
        }
      },
      {
        connection: {
          url: REDIS_URL,
          ...redisConnectionOptions
        },
        concurrency: initialConcurrency
      }
    );

    // ─────────────────────────────────────────────────────────────────────────
    // DYNAMIC VERTICAL CONCURRENCY HOOK
    // BullMQ supports live in-memory updates via orderWorker.concurrency = N
    // Zero worker reboots, zero aborted jobs.
    // ─────────────────────────────────────────────────────────────────────────
    if (unsubscribeConcurrencyListener) {
      unsubscribeConcurrencyListener();
    }

    unsubscribeConcurrencyListener = adaptiveController.onConcurrencyChange(
      (newConcurrency, logEntry) => {
        if (orderWorker) {
          const previous = orderWorker.concurrency;
          orderWorker.concurrency = newConcurrency;
          workerHealthMonitor.updateWorker(workerId, { concurrency: newConcurrency });
          console.log(
            `[Order Worker] 🔄 Dynamic Concurrency Updated: ${previous} ➔ ${newConcurrency} (Vertical Scaling) | Rule: ${logEntry.rule}`
          );
        }
      }
    );

    orderWorker.on("completed", (job, result) => {
      console.log(`[Order Worker] ✅ Job #${job.id} (Order #${result.orderId}) completed in ${result.durationMs || 0}ms`);
    });

    orderWorker.on("failed", (job, err) => {
      console.error(`[Order Worker] ❌ Job #${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        console.error(`[Order Worker] 💀 Order #${job.data?.orderId} moved to Dead Letter Queue (DLQ) for investigation`);
      }
    });

    orderWorker.on("error", (err) => {
      if (process.env.NODE_ENV !== "production") {
        // Suppress repeated offline logs in dev when Redis is offline
      } else {
        console.error("❌ [Order Worker Error]:", err.message);
      }
    });

    console.log(`🚀 [Order Worker] Background worker initialized (Worker ID: ${workerId}, Concurrency: ${initialConcurrency})`);
    return orderWorker;
  } catch (err) {
    console.warn("⚠️ [Order Worker] Worker could not be started:", err.message);
    workerHealthMonitor.registerWorker(workerId, {
      status: "OFFLINE",
      concurrency: 0
    });
    return null;
  }
};

/**
 * Accessor for the active BullMQ worker instance
 */
export const getOrderWorker = () => orderWorker;

/**
 * Accessor for the active worker ID
 */
export const getWorkerId = () => workerId;

/**
 * Get current health and operational status of this worker
 */
export const getWorkerStatus = () => {
  return workerHealthMonitor.getWorkers().find((w) => w.workerId === workerId) || {
    workerId,
    status: orderWorker ? "ACTIVE" : "OFFLINE",
    concurrency: orderWorker ? orderWorker.concurrency : 0,
    scalingType: "VERTICAL_DYNAMIC_CONCURRENCY"
  };
};

/**
 * Gracefully shuts down the background worker and unbinds listeners
 */
export const closeOrderWorker = async () => {
  if (unsubscribeConcurrencyListener) {
    unsubscribeConcurrencyListener();
    unsubscribeConcurrencyListener = null;
  }

  if (orderWorker) {
    console.log(`[Order Worker] 🛑 Gracefully closing BullMQ worker (${workerId})...`);
    workerHealthMonitor.updateWorker(workerId, { status: "DRAINING" });
    try {
      await orderWorker.close();
      console.log(`[Order Worker] ✅ BullMQ worker (${workerId}) closed cleanly.`);
    } catch (e) {
      console.error(`[Order Worker] Error during close:`, e.message);
    }
    workerHealthMonitor.deregisterWorker(workerId);
    orderWorker = null;
  }
};

export { orderWorker };
