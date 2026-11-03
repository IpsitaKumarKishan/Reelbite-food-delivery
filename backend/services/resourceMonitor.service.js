import os from "os";
import { ADAPTIVE_CONFIG } from "../config/adaptiveConfig.js";

/**
 * Resource Monitoring Service
 * Periodically measures system-wide and process-level CPU and memory consumption.
 * Maintains an in-memory historical window for trend analysis and dashboard telemetry.
 */
class ResourceMonitorService {
  constructor() {
    this.previousCpuTimes = null;
    this.previousProcessUsage = null;
    this.previousHrTime = null;

    this.latestSnapshot = null;
    this.history = [];
    this.intervalHandle = null;

    // Initialize baseline CPU snapshot immediately
    this._initializeBaseline();
  }

  _initializeBaseline() {
    this.previousCpuTimes = this._getAggregateCpuTimes();
    this.previousProcessUsage = process.cpuUsage();
    this.previousHrTime = process.hrtime.bigint();
  }

  /**
   * Aggregates idle and total CPU ticks across all available logical cores
   */
  _getAggregateCpuTimes() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      const times = cpu.times;
      idle += times.idle;
      total += times.user + times.nice + times.sys + times.idle + times.irq;
    }

    return { idle, total };
  }

  /**
   * Calculates current system and process metrics
   * @returns {Object} Resource metrics snapshot
   */
  sample() {
    const currentCpuTimes = this._getAggregateCpuTimes();
    const currentProcessUsage = process.cpuUsage();
    const currentHrTime = process.hrtime.bigint();

    // 1. Calculate System-wide CPU Utilization %
    let systemCpuPercent = 0;
    if (this.previousCpuTimes) {
      const deltaIdle = currentCpuTimes.idle - this.previousCpuTimes.idle;
      const deltaTotal = currentCpuTimes.total - this.previousCpuTimes.total;

      if (deltaTotal > 0) {
        systemCpuPercent = Math.max(0, Math.min(100, (1 - deltaIdle / deltaTotal) * 100));
      }
    }
    this.previousCpuTimes = currentCpuTimes;

    // 2. Calculate Process-level CPU Utilization %
    let processCpuPercent = 0;
    if (this.previousProcessUsage && this.previousHrTime) {
      const deltaUser = currentProcessUsage.user - this.previousProcessUsage.user;
      const deltaSystem = currentProcessUsage.system - this.previousProcessUsage.system;
      const deltaMicros = deltaUser + deltaSystem;

      const elapsedNanos = Number(currentHrTime - this.previousHrTime);
      const elapsedMicros = elapsedNanos / 1000;
      const coreCount = os.cpus().length || 1;

      if (elapsedMicros > 0) {
        processCpuPercent = Math.max(
          0,
          Math.min(100, (deltaMicros / (elapsedMicros * coreCount)) * 100)
        );
      }
    }
    this.previousProcessUsage = currentProcessUsage;
    this.previousHrTime = currentHrTime;

    // 3. Calculate Memory Metrics
    const totalMemoryBytes = os.totalmem();
    const freeMemoryBytes = os.freemem();
    const usedMemoryBytes = totalMemoryBytes - freeMemoryBytes;
    const systemMemoryPercent = totalMemoryBytes > 0
      ? (usedMemoryBytes / totalMemoryBytes) * 100
      : 0;

    const processMemory = process.memoryUsage();

    const snapshot = {
      timestamp: new Date().toISOString(),
      cpu: {
        systemPercent: parseFloat(systemCpuPercent.toFixed(2)),
        processPercent: parseFloat(processCpuPercent.toFixed(2)),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || "Generic CPU"
      },
      memory: {
        totalBytes: totalMemoryBytes,
        freeBytes: freeMemoryBytes,
        usedBytes: usedMemoryBytes,
        systemPercent: parseFloat(systemMemoryPercent.toFixed(2)),
        totalMB: Math.round(totalMemoryBytes / (1024 * 1024)),
        freeMB: Math.round(freeMemoryBytes / (1024 * 1024)),
        usedMB: Math.round(usedMemoryBytes / (1024 * 1024)),
        process: {
          rssBytes: processMemory.rss,
          rssMB: parseFloat((processMemory.rss / (1024 * 1024)).toFixed(2)),
          heapUsedMB: parseFloat((processMemory.heapUsed / (1024 * 1024)).toFixed(2)),
          heapTotalMB: parseFloat((processMemory.heapTotal / (1024 * 1024)).toFixed(2)),
          externalMB: parseFloat((processMemory.external / (1024 * 1024)).toFixed(2))
        }
      },
      status: {
        isCpuHigh: systemCpuPercent >= ADAPTIVE_CONFIG.CPU_HIGH_THRESHOLD,
        isCpuLow: systemCpuPercent < ADAPTIVE_CONFIG.CPU_LOW_THRESHOLD,
        isMemoryCritical: systemMemoryPercent >= ADAPTIVE_CONFIG.MEMORY_HIGH_THRESHOLD
      }
    };

    this.latestSnapshot = snapshot;

    // Maintain circular historical window
    this.history.push({
      timestamp: snapshot.timestamp,
      systemCpu: snapshot.cpu.systemPercent,
      processCpu: snapshot.cpu.processPercent,
      systemMemory: snapshot.memory.systemPercent,
      processRssMB: snapshot.memory.process.rssMB
    });

    if (this.history.length > ADAPTIVE_CONFIG.HISTORY_WINDOW_SIZE) {
      this.history.shift();
    }

    return snapshot;
  }

  /**
   * Returns the most recent snapshot without triggering a new computation
   */
  getSnapshot() {
    if (!this.latestSnapshot) {
      return this.sample();
    }
    return this.latestSnapshot;
  }

  /**
   * Returns recent history for charting
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Starts periodic background sampling
   */
  start(intervalMs = ADAPTIVE_CONFIG.MONITORING_INTERVAL) {
    if (this.intervalHandle) return;
    // Initial sample
    this.sample();
    this.intervalHandle = setInterval(() => {
      this.sample();
    }, intervalMs);

    // Allow node to exit gracefully if this timer is running
    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
  }

  /**
   * Stops periodic sampling
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export const resourceMonitor = new ResourceMonitorService();
export default resourceMonitor;

