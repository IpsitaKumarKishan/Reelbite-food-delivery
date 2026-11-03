import express from "express";
import {
  getInfrastructureMetrics,
  updateControllerMode,
  simulateTrafficSpike,
  retryFailedJob
} from "../controllers/infrastructure.controllers.js";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";

const router = express.Router();

// Enforce authentication and administrative privilege on all infrastructure routes
router.use(isAuth, isAdmin);

/**
 * @route GET /api/admin/infrastructure/metrics
 * @desc Telemetry snapshot: queue, CPU, RAM, controller, and workers
 */
router.get("/metrics", getInfrastructureMetrics);

/**
 * @route POST /api/admin/infrastructure/mode
 * @desc Switch between Adaptive scaling and Fixed concurrency benchmarks
 */
router.post("/mode", updateControllerMode);

/**
 * @route POST /api/admin/infrastructure/simulate-traffic
 * @desc Inject synthetic order load into queue for real-time demonstration
 */
router.post("/simulate-traffic", simulateTrafficSpike);

/**
 * @route POST /api/admin/infrastructure/retry/:jobId
 * @desc Resubmit a job from Dead Letter Queue (DLQ)
 */
router.post("/retry/:jobId", retryFailedJob);

export default router;

