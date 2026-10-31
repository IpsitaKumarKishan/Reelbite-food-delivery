import { Worker } from "bullmq";
import { redisConnectionOptions, REDIS_URL } from "../config/redis.js";
import { ORDER_QUEUE_NAME } from "../queues/order.queue.js";
import Order from "../models/order.model.js";

let orderWorker = null;

/**
 * Initializes the asynchronous order worker.
 * Can be run in the main Express process or as a separate isolated cloud worker container.
 * @param {import("socket.io").Server} io 
 */
export const initOrderWorker = (io) => {
  try {
    orderWorker = new Worker(
      ORDER_QUEUE_NAME,
      async (job) => {
        const { orderId } = job.data;
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

        // 2. Real-time Restaurant Owner notification via Socket.IO
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

        return {
          status: "SUCCESS",
          orderId: order._id,
          processedAt: new Date().toISOString()
        };
      },
      {
        connection: {
          url: REDIS_URL,
          ...redisConnectionOptions
        },
        concurrency: 5 // Process up to 5 orders simultaneously per worker
      }
    );

    orderWorker.on("completed", (job, result) => {
      console.log(`[Order Worker] ✅ Job #${job.id} (Order #${result.orderId}) completed successfully`);
    });

    orderWorker.on("failed", (job, err) => {
      console.error(`[Order Worker] ❌ Job #${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}): ${err.message}`);
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        console.error(`[Order Worker] 💀 Order #${job.data.orderId} moved to Dead Letter Queue (DLQ) for investigation`);
      }
    });

    orderWorker.on("error", (err) => {
      if (process.env.NODE_ENV !== "production") {
        // Suppress repeated offline logs in dev
      } else {
        console.error("❌ [Order Worker Error]:", err.message);
      }
    });

    console.log("🚀 [Order Worker] Background worker initialized (Concurrency: 5)");
    return orderWorker;
  } catch (err) {
    console.warn("⚠️ [Order Worker] Worker could not be started:", err.message);
    return null;
  }
};

export { orderWorker };

