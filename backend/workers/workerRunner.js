import dotenv from "dotenv";
dotenv.config();
import connectDb from "../config/db.js";
import { initOrderWorker, closeOrderWorker } from "./order.worker.js";
import { adaptiveController } from "../services/adaptiveController.service.js";

/**
 * Standalone Background Worker Process Runner
 * Used when deploying background workers as separate cloud containers / horizontal pods.
 */
async function startStandaloneWorker() {
  console.log("==================================================================");
  console.log("🚀 [Worker Process] Starting Standalone ReelBite Background Worker");
  console.log("==================================================================");

  await connectDb();
  initOrderWorker(null);

  // Start autonomous adaptive controller
  adaptiveController.start();

  console.log(`[Worker Process] Registered Worker ID: ${process.env.WORKER_ID || `worker-${process.pid}`}`);
  console.log(`[Worker Process] Initial Concurrency: ${adaptiveController.currentConcurrency}`);
  console.log(`[Worker Process] Ready to consume asynchronous jobs from Redis queue.`);

  const shutdown = async (signal) => {
    console.log(`\n🛑 [Worker Process] Received ${signal}. Draining in-flight jobs...`);
    adaptiveController.stop();
    await closeOrderWorker();
    console.log("[Worker Process] All jobs drained. Exiting safely.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startStandaloneWorker().catch((err) => {
  console.error("❌ [Worker Process Boot Error]:", err);
  process.exit(1);
});

