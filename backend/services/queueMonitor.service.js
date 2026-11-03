import { orderQueue, ORDER_QUEUE_NAME } from "../queues/order.queue.js";
import { getRedisStatus } from "../config/redis.js";
import { ADAPTIVE_CONFIG } from "../config/adaptiveConfig.js";

/**
 * Queue Monitoring Service
 * Periodically extracts workload, latency, and throughput metrics from BullMQ.
 * Avoids excessive Redis round-trips by caching snapshots and batching count queries.
 */
class QueueMonitorService {
  constructor(queue = orderQueue) {
    this.queue = queue;
    this.latestSnapshot = null;
    this.history = [];
    this.intervalHandle = null;

    this.previousCompletedCount = null;
    this.previousTimestamp = null;

    this.recentDurations = [];
    this.currentAvgDurationMs = 0;
  }

  /**
   * Directly records job processing duration from active worker threads
   * @param {number} durationMs 
   */
  recordJobDuration(durationMs) {
    if (typeof durationMs === "number" && durationMs >= 0) {
      this.recentDurations.push(durationMs);
      if (this.recentDurations.length > 50) {
        this.recentDurations.shift();
      }
      const sum = this.recentDurations.reduce((acc, d) => acc + d, 0);
      this.currentAvgDurationMs = Math.round(sum / this.recentDurations.length);
    }
  }

  /**
   * Set or update target queue (useful for testing or dynamic queues)
   */
  setQueue(queue) {
    this.queue = queue;
  }

  /**
   * Samples current BullMQ queue metrics
   * @returns {Promise<Object>} Queue metrics snapshot
   */
  async sample() {
    const now = Date.now();
    const timestampStr = new Date(now).toISOString();

    const fallbackSnapshot = {
      queueName: ORDER_QUEUE_NAME,
      status: "UNAVAILABLE",
      redisConnected: getRedisStatus(),
      timestamp: timestampStr,
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        totalActiveAndWaiting: 0
      },
      performance: {
        oldestWaitTimeMs: 0,
        avgProcessingDurationMs: 0,
        jobsPerSecond: 0,
        failurePercent: 0
      },
      workload: {
        isHigh: false,
        isLow: true,
        isDraining: false
      }
    };

    if (!this.queue) {
      this.latestSnapshot = fallbackSnapshot;
      return fallbackSnapshot;
    }

    try {
      // 1. Efficient single-call extraction of all job counts
      const counts = await this.queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed"
      );

      const waiting = counts.waiting || 0;
      const active = counts.active || 0;
      const completed = counts.completed || 0;
      const failed = counts.failed || 0;
      const delayed = counts.delayed || 0;

      // 2. Measure Queue Waiting Latency (Age of oldest pending job)
      let oldestWaitTimeMs = 0;
      if (waiting > 0) {
        try {
          const oldestWaitingJobs = await this.queue.getJobs(["waiting"], 0, 0);
          if (oldestWaitingJobs && oldestWaitingJobs.length > 0 && oldestWaitingJobs[0]?.timestamp) {
            oldestWaitTimeMs = Math.max(0, now - oldestWaitingJobs[0].timestamp);
          }
        } catch (e) {
          // Gracefully continue if jobs list cannot be inspected
        }
      }

      // 3. Measure Average Processing Duration of recently finished jobs
      let avgProcessingDurationMs = 0;
      if (completed > 0) {
        try {
          const recentCompletedJobs = await this.queue.getJobs(["completed"], 0, 4);
          if (recentCompletedJobs && recentCompletedJobs.length > 0) {
            let totalDuration = 0;
            let validDurationCount = 0;

            for (const job of recentCompletedJobs) {
              if (job?.finishedOn && job?.processedOn && job.finishedOn >= job.processedOn) {
                totalDuration += (job.finishedOn - job.processedOn);
                validDurationCount++;
              }
            }

            if (validDurationCount > 0) {
              avgProcessingDurationMs = Math.round(totalDuration / validDurationCount);
            }
          }
        } catch (e) {
          // Gracefully continue
        }
      }

      if (avgProcessingDurationMs === 0 && this.currentAvgDurationMs > 0) {
        avgProcessingDurationMs = this.currentAvgDurationMs;
      }

      // 4. Calculate Job Completion Rate (Jobs / Second)
      let jobsPerSecond = 0;
      if (this.previousCompletedCount !== null && this.previousTimestamp !== null) {
        const deltaCompleted = completed - this.previousCompletedCount;
        const deltaSeconds = (now - this.previousTimestamp) / 1000;

        if (deltaSeconds > 0 && deltaCompleted >= 0) {
          jobsPerSecond = parseFloat((deltaCompleted / deltaSeconds).toFixed(2));
        }
      }
      this.previousCompletedCount = completed;
      this.previousTimestamp = now;

      // 5. Calculate Failure Rate
      const totalFinished = completed + failed;
      const failurePercent = totalFinished > 0
        ? parseFloat(((failed / totalFinished) * 100).toFixed(2))
        : 0;

      const snapshot = {
        queueName: ORDER_QUEUE_NAME,
        status: "HEALTHY",
        redisConnected: getRedisStatus(),
        timestamp: timestampStr,
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          totalActiveAndWaiting: waiting + active
        },
        performance: {
          oldestWaitTimeMs,
          avgProcessingDurationMs,
          jobsPerSecond,
          failurePercent
        },
        workload: {
          isHigh: waiting >= ADAPTIVE_CONFIG.QUEUE_HIGH_THRESHOLD || waiting > active * 1.5,
          isLow: waiting === 0 && active === 0,
          isDraining: waiting === 0 && active > 0
        }
      };

      this.latestSnapshot = snapshot;

      // Maintain circular historical window
      this.history.push({
        timestamp: snapshot.timestamp,
        waiting,
        active,
        completed,
        failed,
        jobsPerSecond,
        oldestWaitTimeMs
      });

      if (this.history.length > ADAPTIVE_CONFIG.HISTORY_WINDOW_SIZE) {
        this.history.shift();
      }

      return snapshot;
    } catch (err) {
      const errorSnapshot = {
        ...fallbackSnapshot,
        status: "ERROR",
        error: err.message
      };
      this.latestSnapshot = errorSnapshot;
      return errorSnapshot;
    }
  }

  /**
   * Returns the most recent cached snapshot immediately
   */
  getSnapshot() {
    if (!this.latestSnapshot) {
      return {
        queueName: ORDER_QUEUE_NAME,
        status: "INITIALIZING",
        redisConnected: getRedisStatus(),
        timestamp: new Date().toISOString(),
        counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, totalActiveAndWaiting: 0 },
        performance: { oldestWaitTimeMs: 0, avgProcessingDurationMs: 0, jobsPerSecond: 0, failurePercent: 0 },
        workload: { isHigh: false, isLow: true, isDraining: false }
      };
    }
    return this.latestSnapshot;
  }

  /**
   * Returns recent history for graphing
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Starts periodic background polling
   */
  start(intervalMs = ADAPTIVE_CONFIG.MONITORING_INTERVAL) {
    if (this.intervalHandle) return;
    this.sample();
    this.intervalHandle = setInterval(() => {
      this.sample();
    }, intervalMs);

    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
  }

  /**
   * Stops periodic polling
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export { QueueMonitorService };
export const queueMonitor = new QueueMonitorService();
export default queueMonitor;
