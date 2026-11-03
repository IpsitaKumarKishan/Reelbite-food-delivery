import { Worker } from "bullmq";
import { redisConnectionOptions, REDIS_URL } from "../config/redis.js";
import { ORDER_QUEUE_NAME } from "../queues/order.queue.js";
import Order from "../models/order.model.js";
import { adaptiveController } from "../services/adaptiveController.service.js";
import { queueMonitor } from "../services/queueMonitor.service.js";
import { workerHealthMonitor } from "../services/workerHealth.service.js";
import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";
import { dlqManager, PermanentJobError } from "../services/dlqManager.service.js";
import { dbConnectionMonitor } from "../services/dbConnectionMonitor.service.js";

let orderWorker = null;
const workerId = process.env.WORKER_ID || `worker-order-${process.pid}`;
let unsubscribeConcurrencyListener = null;
let heartbeatTimer = null;
let isHeartbeatEmitting = true;
let inFlightJobsCount = 0;

/**
 * Starts periodic liveness heartbeat emission to Worker Health Monitor
 */
const startHeartbeatEmission = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(() => {
    if (orderWorker && isHeartbeatEmitting) {
      workerHealthMonitor.recordHeartbeat(workerId, {
        pid: process.pid,
        concurrency: orderWorker.concurrency,
        activeJobs: inFlightJobsCount
      });
    }
  }, RECOVERY_CONFIG.WORKER_HEARTBEAT_INTERVAL_MS);

  if (heartbeatTimer.unref) {
    heartbeatTimer.unref();
  }
};

/**
 * Initializes the asynchronous order worker with adaptive concurrency and fault monitoring.
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
      pid: process.pid,
      status: "ACTIVE",
      concurrency: initialConcurrency,
      scalingType: "VERTICAL_DYNAMIC_CONCURRENCY",
      activeJobs: inFlightJobsCount
    });

    orderWorker = new Worker(
      ORDER_QUEUE_NAME,
      async (job) => {
        const { orderId } = job.data || {};
        const jobId = job.id || `job-${Date.now()}`;
        const jobStartTime = process.hrtime.bigint();
        inFlightJobsCount++;
        workerHealthMonitor.recordJobStart(workerId);

        try {
          if (!orderId) {
            throw new PermanentJobError("Invalid job payload: missing orderId", { jobId });
          }

          // Simulation Hook: Safe fault injection for project demonstration
          if (job.data?.simulationError) {
            if (job.data?.isPermanent) {
              throw new PermanentJobError(
                job.data.errorMessage || "Simulated permanent validation failure (DLQ Demonstration)",
                { orderId, isSimulated: true }
              );
            } else {
              throw new Error(
                job.data.errorMessage || "Simulated transient failure (Retry & Backoff Demonstration)"
              );
            }
          }

          console.log(
            `[Order Worker] ⚡ Processing Job #${jobId} for Order ID: ${orderId} (Attempt ${job.attemptsMade + 1}/${job.opts?.attempts || 3})`
          );

          // 1. Pre-check: If order is already completed, exit immediately (Idempotency Safeguard)
          const existingOrder = await dbConnectionMonitor.executeWithRetry(async () => {
            return await Order.findById(orderId).select(
              "orderProcessingStatus notificationDispatched notificationDispatchedAt"
            );
          });

          if (!existingOrder) {
            throw new PermanentJobError(`Order #${orderId} was not found in database.`, { orderId });
          }

          if (existingOrder.orderProcessingStatus === "COMPLETED") {
            console.log(
              `[Order Worker] 🛡️ Idempotency check: Order #${orderId} has already COMPLETED processing. Bypassing duplicate execution.`
            );
            return {
              status: "BYPASS_IDEMPOTENT",
              orderId,
              reason: "ALREADY_COMPLETED",
              processedAt: new Date().toISOString()
            };
          }

          // 2. Atomic Distributed Lock Acquisition:
          // Acquire processing lock only if status is PENDING/FAILED, or current lock matches jobId, or lock is stale (> 30s)
          const lockStaleThreshold = new Date(Date.now() - (RECOVERY_CONFIG.JOB_LOCK_DURATION_MS || 30000));
          const lockedOrder = await dbConnectionMonitor.executeWithRetry(async () => {
            return await Order.findOneAndUpdate(
              {
                _id: orderId,
                $or: [
                  { orderProcessingStatus: { $in: ["PENDING", "FAILED"] } },
                  { processingLock: jobId },
                  { orderProcessingStatus: "PROCESSING", processingLockedAt: { $lt: lockStaleThreshold } }
                ]
              },
              {
                $set: {
                  orderProcessingStatus: "PROCESSING",
                  processingLock: jobId,
                  processingLockedAt: new Date()
                },
                $inc: { processingAttempts: 1 }
              },
              { new: true }
            )
              .populate("shopOrders.shop", "name")
              .populate("shopOrders.owner", "name socketId")
              .populate("shopOrders.shopOrderItems.item", "name image price")
              .populate("user", "fullName email mobile");
          });

          if (!lockedOrder) {
            console.warn(
              `[Order Worker] 🔒 Order #${orderId} is currently locked by another worker process. Skipping concurrent redundant execution.`
            );
            return {
              status: "LOCKED_CONCURRENT",
              orderId,
              reason: "CONCURRENT_PROCESSING_ACTIVE"
            };
          }

          // 3. Side-Effect Deduplication: Real-time Restaurant Owner notification via Socket.IO
          if (lockedOrder.notificationDispatched) {
            console.log(
              `[Order Worker] 🛡️ Idempotency check: Order #${orderId} notification was already dispatched at ${lockedOrder.notificationDispatchedAt}. Skipping duplicate notification.`
            );
          } else {
            if (io && Array.isArray(lockedOrder.shopOrders)) {
              lockedOrder.shopOrders.forEach((shopOrder) => {
                const ownerSocketId = shopOrder.owner?.socketId;
                if (ownerSocketId) {
                  io.to(ownerSocketId).emit("newOrder", {
                    _id: lockedOrder._id,
                    paymentMethod: lockedOrder.paymentMethod,
                    user: lockedOrder.user || {
                      fullName: lockedOrder.deliveryAddress?.name || "Customer",
                      email: "N/A",
                      mobile: lockedOrder.contactMobile || "N/A"
                    },
                    shopOrders: shopOrder,
                    createdAt: lockedOrder.createdAt,
                    deliveryAddress: lockedOrder.deliveryAddress,
                    payment: lockedOrder.payment
                  });
                  console.log(`[Order Worker] 📢 Real-time alert dispatched to restaurant: ${shopOrder.shop?.name || "Shop"}`);
                }
              });
            }
          }

          // 4. Mark Order Processing COMPLETED and Release Lock Atomically
          await dbConnectionMonitor.executeWithRetry(async () => {
            return await Order.findByIdAndUpdate(orderId, {
              $set: {
                orderProcessingStatus: "COMPLETED",
                processingLock: null,
                notificationDispatched: true,
                notificationDispatchedAt: lockedOrder.notificationDispatchedAt || new Date(),
                processedAt: new Date()
              }
            });
          });

          const durationNs = process.hrtime.bigint() - jobStartTime;
          const durationMs = Number(durationNs / 1000000n);

          // Record performance metrics
          queueMonitor.recordJobDuration(durationMs);
          workerHealthMonitor.recordJobComplete(workerId, durationMs);

          return {
            status: "SUCCESS",
            orderId: lockedOrder._id,
            durationMs,
            processedAt: new Date().toISOString()
          };
        } catch (err) {
          workerHealthMonitor.recordJobFailure(workerId, err.message);

          // Release lock and mark status as FAILED so retry can acquire lock
          try {
            if (orderId) {
              await Order.findByIdAndUpdate(orderId, {
                $set: {
                  orderProcessingStatus: "FAILED",
                  processingLock: null
                }
              });
            }
          } catch (lockErr) {
            console.warn(`[Order Worker] Failed to release lock on order #${orderId}:`, lockErr.message);
          }

          // If permanent business error, discard from BullMQ immediately to prevent useless retries
          if (err.isPermanent && typeof job.discard === "function") {
            try {
              await job.discard();
            } catch (discardErr) {
              console.warn(`[Order Worker] Could not discard job #${job.id}:`, discardErr.message);
            }
          }
          throw err;
        } finally {
          inFlightJobsCount = Math.max(0, inFlightJobsCount - 1);
        }
      },
      {
        connection: {
          url: REDIS_URL,
          ...redisConnectionOptions
        },
        concurrency: initialConcurrency,
        lockDuration: RECOVERY_CONFIG.JOB_LOCK_DURATION_MS,
        stalledInterval: RECOVERY_CONFIG.JOB_STALLED_INTERVAL_MS
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

    // ─────────────────────────────────────────────────────────────────────────
    // WORKER HEARTBEAT & EVENT LISTENERS
    // ─────────────────────────────────────────────────────────────────────────
    startHeartbeatEmission();

    orderWorker.on("completed", (job, result) => {
      console.log(`[Order Worker] ✅ Job #${job.id} (Order #${result.orderId}) completed in ${result.durationMs || 0}ms`);
    });

    orderWorker.on("failed", (job, err) => {
      console.error(
        `[Order Worker] ❌ Job #${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts || 3}): ${err?.message}`
      );
      const isMaxAttempts = job && job.attemptsMade >= (job?.opts?.attempts || 3);
      const isPermanent = Boolean(err?.isPermanent || err instanceof PermanentJobError);

      if (isMaxAttempts || isPermanent) {
        console.error(
          `[Order Worker] 💀 Order #${job?.data?.orderId} moved to Dead Letter Queue (DLQ) | Permanent: ${isPermanent}`
        );
        dlqManager.recordFailedJob(job, err);
      }
    });

    orderWorker.on("stalled", (jobId, prev) => {
      console.warn(`⚠️ [Order Worker] 🔄 Job #${jobId} stalled (previously: ${prev}). BullMQ lock expired, re-queuing.`);
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
      pid: process.pid,
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
 * Toggle heartbeat emission (used by Failure Simulation module)
 * @param {boolean} active 
 */
export const setHeartbeatActive = (active) => {
  isHeartbeatEmitting = Boolean(active);
  console.log(`[Order Worker] Heartbeat emission state set to: ${isHeartbeatEmitting}`);
  return isHeartbeatEmitting;
};

/**
 * Check if heartbeat is actively emitting
 */
export const isHeartbeatActive = () => isHeartbeatEmitting;

/**
 * Get current health and operational status of this worker
 */
export const getWorkerStatus = () => {
  return workerHealthMonitor.getWorker(workerId) || {
    workerId,
    status: orderWorker ? "ACTIVE" : "OFFLINE",
    concurrency: orderWorker ? orderWorker.concurrency : 0,
    scalingType: "VERTICAL_DYNAMIC_CONCURRENCY"
  };
};

/**
 * Gracefully shuts down the background worker, cleans timers and unbinds listeners
 */
export const closeOrderWorker = async () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

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
