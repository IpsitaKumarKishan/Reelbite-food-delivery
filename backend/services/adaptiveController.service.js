import { ADAPTIVE_CONFIG } from "../config/adaptiveConfig.js";
import { queueMonitor } from "./queueMonitor.service.js";
import { resourceMonitor } from "./resourceMonitor.service.js";

/**
 * Adaptive Resource-Aware Worker Concurrency Controller
 * Evaluates queue workload, CPU load, and memory utilization to dynamically tune concurrency.
 * Implements hysteresis cooldown, bounded adjustment steps, and anti-oscillation guards.
 */
class AdaptiveControllerService {
  constructor(config = ADAPTIVE_CONFIG) {
    this.config = config;

    this.currentConcurrency = config.INITIAL_CONCURRENCY;
    this.lastAdjustmentTime = 0;
    this.mode = "adaptive"; // "adaptive" | "fixed"
    this.fixedConcurrencyValue = config.INITIAL_CONCURRENCY;

    // In-memory audit ring-buffer for tracking all adjustments
    this.adjustmentLogs = [];

    // Queue depth history for trend analysis (Case 5)
    this.recentWaitingCounts = [];

    this.intervalHandle = null;
    this.listeners = new Set();
  }

  /**
   * Register a listener for concurrency change events (e.g. WorkerManager)
   * @param {Function} callback (newConcurrency, logEntry) => void
   */
  onConcurrencyChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notifyListeners(newConcurrency, logEntry) {
    for (const listener of this.listeners) {
      try {
        listener(newConcurrency, logEntry);
      } catch (err) {
        console.error("❌ [Adaptive Controller] Error in change listener:", err.message);
      }
    }
  }

  /**
   * Core decision engine evaluating current queue and resource states.
   * Can accept explicit snapshots for deterministic unit testing.
   * @param {Object} queueSnap - Optional queue snapshot
   * @param {Object} resourceSnap - Optional resource snapshot
   * @returns {Object} Evaluation decision result
   */
  evaluate(queueSnap = null, resourceSnap = null) {
    const queue = queueSnap || queueMonitor.getSnapshot();
    const resource = resourceSnap || resourceMonitor.getSnapshot();

    const waiting = queue.counts?.waiting || 0;
    const active = queue.counts?.active || 0;
    const cpu = resource.cpu?.systemPercent || 0;
    const memory = resource.memory?.systemPercent || 0;

    const now = Date.now();
    const elapsedSinceLastAdj = now - this.lastAdjustmentTime;
    const inCooldown = elapsedSinceLastAdj < this.config.COOLDOWN_PERIOD;

    // Track recent waiting trend (keep last 3 samples)
    this.recentWaitingCounts.push(waiting);
    if (this.recentWaitingCounts.length > 4) {
      this.recentWaitingCounts.shift();
    }

    // If controller is locked in fixed mode (for Experimentation A or B)
    if (this.mode === "fixed") {
      const target = Math.max(
        this.config.MIN_CONCURRENCY,
        Math.min(this.config.MAX_CONCURRENCY, this.fixedConcurrencyValue)
      );
      if (this.currentConcurrency !== target) {
        return this._applyAdjustment(target, waiting, active, cpu, memory, "FIXED_MODE", `Fixed concurrency mode forced to ${target}.`);
      }
      return {
        adjusted: false,
        currentConcurrency: this.currentConcurrency,
        rule: "FIXED_MODE",
        reason: `Fixed concurrency active (${this.currentConcurrency}).`
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 1: EMERGENCY SAFETY CEILING (CASE 4) - Memory Critical
    // Bypasses cooldown immediately to prevent AWS EC2 OOM kills.
    // ─────────────────────────────────────────────────────────────────────────
    if (memory >= this.config.MEMORY_HIGH_THRESHOLD) {
      if (this.currentConcurrency > this.config.MIN_CONCURRENCY) {
        const target = Math.max(
          this.config.MIN_CONCURRENCY,
          this.currentConcurrency - this.config.EMERGENCY_SCALE_DOWN_STEP
        );
        return this._applyAdjustment(
          target,
          waiting,
          active,
          cpu,
          memory,
          "CASE_4_EMERGENCY_MEMORY",
          `CASE 4 (CRITICAL): Memory usage (${memory.toFixed(1)}%) exceeded safe ceiling (${this.config.MEMORY_HIGH_THRESHOLD}%). Scaling down by ${this.currentConcurrency - target} to avert OOM.`
        );
      }
      return {
        adjusted: false,
        currentConcurrency: this.currentConcurrency,
        rule: "CASE_4_MIN_REACHED",
        reason: `Memory high (${memory.toFixed(1)}%) but concurrency is already at minimum bound (${this.config.MIN_CONCURRENCY}).`
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HYSTERESIS SHIELD: Cooldown Window Check
    // Prevents rapid oscillations between scaling up and down.
    // ─────────────────────────────────────────────────────────────────────────
    if (inCooldown) {
      const remainingSeconds = Math.ceil((this.config.COOLDOWN_PERIOD - elapsedSinceLastAdj) / 1000);
      return {
        adjusted: false,
        currentConcurrency: this.currentConcurrency,
        rule: "COOLDOWN_ACTIVE",
        reason: `In stabilization cooldown window (${remainingSeconds}s remaining). Holding at ${this.currentConcurrency}.`
      };
    }

    const isQueueHigh = waiting >= this.config.QUEUE_HIGH_THRESHOLD || waiting > active * 1.5;
    const isCpuHigh = cpu >= this.config.CPU_HIGH_THRESHOLD;
    const isCpuLow = cpu < this.config.CPU_LOW_THRESHOLD;

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 2: WORKLOAD HIGH BUT CPU SATURATED (CASE 3)
    // ─────────────────────────────────────────────────────────────────────────
    if (isQueueHigh && isCpuHigh) {
      return {
        adjusted: false,
        currentConcurrency: this.currentConcurrency,
        rule: "CASE_3_CPU_SATURATED",
        reason: `CASE 3: Queue has backlog (${waiting} waiting) but CPU (${cpu.toFixed(1)}%) is saturated (>= ${this.config.CPU_HIGH_THRESHOLD}%). Concurrency held at ${this.currentConcurrency} to avoid thrashing.`
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 3: CONTINUOUS QUEUE GROWTH TREND (CASE 5)
    // ─────────────────────────────────────────────────────────────────────────
    const isTrendingUp = this._isQueueTrendingUp();
    if (isTrendingUp && !isCpuHigh && this.currentConcurrency < this.config.MAX_CONCURRENCY) {
      const target = Math.min(this.config.MAX_CONCURRENCY, this.currentConcurrency + 1);
      if (target > this.currentConcurrency) {
        return this._applyAdjustment(
          target,
          waiting,
          active,
          cpu,
          memory,
          "CASE_5_TRENDING_GROWTH",
          `CASE 5: Queue waiting backlog is continuously growing (${this.recentWaitingCounts.join(" → ")}). Cautiously scaling up by +1 to ${target}.`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 4: HIGH WORKLOAD WITH HEALTHY CPU & MEMORY (CASE 1)
    // ─────────────────────────────────────────────────────────────────────────
    if (isQueueHigh && this.currentConcurrency < this.config.MAX_CONCURRENCY) {
      if (isCpuLow) {
        // High headroom: scale up by standard step (default +2)
        const target = Math.min(
          this.config.MAX_CONCURRENCY,
          this.currentConcurrency + this.config.MAX_SCALE_UP_STEP
        );
        return this._applyAdjustment(
          target,
          waiting,
          active,
          cpu,
          memory,
          "CASE_1_HIGH_HEADROOM",
          `CASE 1: Queue workload surging (${waiting} waiting, ${active} active) while CPU (${cpu.toFixed(1)}%) is low (< ${this.config.CPU_LOW_THRESHOLD}%). Scaling up by +${target - this.currentConcurrency} to ${target}.`
        );
      } else {
        // Moderate CPU (50% - 80%): scale up cautiously by +1
        const target = Math.min(this.config.MAX_CONCURRENCY, this.currentConcurrency + 1);
        return this._applyAdjustment(
          target,
          waiting,
          active,
          cpu,
          memory,
          "CASE_1_MODERATE_HEADROOM",
          `CASE 1B: Queue workload elevated (${waiting} waiting) with moderate CPU (${cpu.toFixed(1)}%). Incrementing concurrency by +1 to ${target}.`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 5: LOW / IDLE WORKLOAD (CASE 2) - Gradual Decay
    // ─────────────────────────────────────────────────────────────────────────
    const isQueueDrained = waiting === 0 && (active === 0 || active < Math.ceil(this.currentConcurrency / 2));
    if (isQueueDrained && this.currentConcurrency > this.config.MIN_CONCURRENCY) {
      const target = Math.max(
        this.config.MIN_CONCURRENCY,
        this.currentConcurrency - this.config.MAX_SCALE_DOWN_STEP
      );
      return this._applyAdjustment(
        target,
        waiting,
        active,
        cpu,
        memory,
        "CASE_2_IDLE_DRAIN",
        `CASE 2: Workload is low/drained (${waiting} waiting, ${active} active). Gradually scaling down concurrency by -${this.currentConcurrency - target} to ${target} to release resources.`
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STABLE STATE (Default)
    // ─────────────────────────────────────────────────────────────────────────
    return {
      adjusted: false,
      currentConcurrency: this.currentConcurrency,
      rule: "STABLE",
      reason: `Stable operation: Workload (${waiting} waiting, ${active} active) is balanced with hardware capacity (CPU: ${cpu.toFixed(1)}%, Mem: ${memory.toFixed(1)}%).`
    };
  }

  _isQueueTrendingUp() {
    if (this.recentWaitingCounts.length < 3) return false;
    const [w1, w2, w3] = this.recentWaitingCounts.slice(-3);
    return w1 < w2 && w2 < w3 && w3 > 0;
  }

  _applyAdjustment(targetConcurrency, waiting, active, cpu, memory, rule, reason) {
    const prev = this.currentConcurrency;
    this.currentConcurrency = targetConcurrency;
    this.lastAdjustmentTime = Date.now();

    const logEntry = {
      timestamp: new Date(this.lastAdjustmentTime).toISOString(),
      previousConcurrency: prev,
      newConcurrency: targetConcurrency,
      delta: targetConcurrency - prev,
      waitingJobs: waiting,
      activeJobs: active,
      cpuPercent: parseFloat(cpu.toFixed(2)),
      memoryPercent: parseFloat(memory.toFixed(2)),
      rule,
      reason
    };

    this.adjustmentLogs.push(logEntry);
    if (this.adjustmentLogs.length > 100) {
      this.adjustmentLogs.shift();
    }

    console.log(
      `⚡ [Adaptive Concurrency] ${prev} → ${targetConcurrency} (${logEntry.delta > 0 ? "+" : ""}${logEntry.delta}) | Rule: ${rule} | Reason: ${reason}`
    );

    this._notifyListeners(targetConcurrency, logEntry);

    return {
      adjusted: true,
      previousConcurrency: prev,
      newConcurrency: targetConcurrency,
      rule,
      reason,
      logEntry
    };
  }

  /**
   * Set fixed concurrency mode for controlled benchmarking (Experiments A and B)
   */
  setMode(mode, fixedValue = null) {
    if (!["adaptive", "fixed"].includes(mode)) {
      throw new Error("Mode must be 'adaptive' or 'fixed'");
    }
    this.mode = mode;
    if (fixedValue !== null && typeof fixedValue === "number") {
      this.fixedConcurrencyValue = Math.max(
        this.config.MIN_CONCURRENCY,
        Math.min(this.config.MAX_CONCURRENCY, fixedValue)
      );
    }
    return this.getStatus();
  }

  /**
   * Retrieve current controller observability status
   */
  getStatus() {
    const now = Date.now();
    const elapsedSinceLastAdj = now - this.lastAdjustmentTime;
    const cooldownRemainingMs = Math.max(0, this.config.COOLDOWN_PERIOD - elapsedSinceLastAdj);

    return {
      mode: this.mode,
      currentConcurrency: this.currentConcurrency,
      minConcurrency: this.config.MIN_CONCURRENCY,
      maxConcurrency: this.config.MAX_CONCURRENCY,
      initialConcurrency: this.config.INITIAL_CONCURRENCY,
      inCooldown: cooldownRemainingMs > 0,
      cooldownRemainingSeconds: Math.ceil(cooldownRemainingMs / 1000),
      lastAdjustmentTime: this.lastAdjustmentTime ? new Date(this.lastAdjustmentTime).toISOString() : null,
      lastAdjustmentReason: this.adjustmentLogs[this.adjustmentLogs.length - 1]?.reason || "No adjustments executed yet.",
      recentTrend: [...this.recentWaitingCounts],
      activeListenersCount: this.listeners.size,
      config: {
        cpuHigh: this.config.CPU_HIGH_THRESHOLD,
        cpuLow: this.config.CPU_LOW_THRESHOLD,
        memoryHigh: this.config.MEMORY_HIGH_THRESHOLD,
        intervalMs: this.config.MONITORING_INTERVAL
      }
    };
  }

  getLogs(limit = 20) {
    return this.adjustmentLogs.slice(-limit);
  }

  /**
   * Starts the continuous background monitoring and adaptive decision loop
   */
  start(intervalMs = this.config.MONITORING_INTERVAL) {
    if (this.intervalHandle) return;

    // Start dependent monitoring services if not yet running
    queueMonitor.start(intervalMs);
    resourceMonitor.start(intervalMs);

    this.intervalHandle = setInterval(() => {
      this.evaluate();
    }, intervalMs);

    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
    console.log(`🚀 [Adaptive Concurrency] Autonomous controller started (Interval: ${intervalMs}ms, Initial Concurrency: ${this.currentConcurrency})`);
  }

  /**
   * Stops the continuous monitoring loop
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export { AdaptiveControllerService };
export const adaptiveController = new AdaptiveControllerService();
export default adaptiveController;
