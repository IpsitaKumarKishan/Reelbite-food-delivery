import express from "express";
import { getQueueMetrics } from "../queues/order.queue.js";

const router = express.Router();

/**
 * @route GET /api/queue/stats
 * @desc Get real-time event queue metrics (Waiting, Active, Completed, Dead Letter Queue)
 * @access Public / Monitoring
 */
router.get("/stats", async (req, res) => {
  try {
    const metrics = await getQueueMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

export default router;

