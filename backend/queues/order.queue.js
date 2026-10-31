import { Queue } from "bullmq";
import { redisConnectionOptions, REDIS_URL, getRedisStatus } from "../config/redis.js";

export const ORDER_QUEUE_NAME = "order-events";

let orderQueue = null;

try {
  orderQueue = new Queue(ORDER_QUEUE_NAME, {
    connection: {
      url: REDIS_URL,
      ...redisConnectionOptions
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1500 // 1.5s, 3s, 6s
      },
      removeOnComplete: 100, // Keep last 100 completed for history
      removeOnFail: false     // Keep failed jobs in Dead Letter Queue (DLQ)
    }
  });

  orderQueue.on("error", (err) => {
    if (process.env.NODE_ENV !== "production") {
      // Keep dev console clean when Redis is offline
    } else {
      console.error("❌ [BullMQ Queue Error]:", err.message);
    }
  });
} catch (err) {
  console.warn("⚠️ [BullMQ Queue] Failed to initialize orderQueue:", err.message);
}

/**
 * Enqueue order processing job asynchronously
 * @param {Object} jobData { orderId: string, orderNumber?: string, totalAmount?: number }
 * @returns {Promise<{ queued: boolean, jobId?: string, reason?: string }>}
 */
export const enqueueOrderProcessing = async (jobData) => {
  if (!orderQueue) {
    return { queued: false, reason: "Queue not initialized" };
  }

  try {
    const job = await orderQueue.add("process-order", jobData, {
      jobId: `order-${jobData.orderId}-${Date.now()}`
    });
    return { queued: true, jobId: job.id };
  } catch (err) {
    return { queued: false, reason: err.message };
  }
};

/**
 * Observability: Get current queue depth & processing metrics
 */
export const getQueueMetrics = async () => {
  if (!orderQueue) {
    return {
      queue: ORDER_QUEUE_NAME,
      status: "UNAVAILABLE",
      redisConnected: false,
      metrics: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    };
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      orderQueue.getWaitingCount(),
      orderQueue.getActiveCount(),
      orderQueue.getCompletedCount(),
      orderQueue.getFailedCount(),
      orderQueue.getDelayedCount()
    ]);

    return {
      queue: ORDER_QUEUE_NAME,
      status: "HEALTHY",
      redisConnected: getRedisStatus(),
      metrics: {
        waiting,
        active,
        completed,
        failed, // Dead Letter Queue items
        delayed
      },
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      queue: ORDER_QUEUE_NAME,
      status: "OFFLINE",
      redisConnected: false,
      error: err.message,
      metrics: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      timestamp: new Date().toISOString()
    };
  }
};

export { orderQueue };

