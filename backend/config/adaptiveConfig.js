/**
 * Configuration Parameters for Adaptive Resource-Aware Worker Concurrency Management
 * All values can be overridden via environment variables for cloud deployment flexibility.
 */

export const ADAPTIVE_CONFIG = {
  // Lower and upper bounds for worker concurrency
  MIN_CONCURRENCY: parseInt(process.env.ADAPTIVE_MIN_CONCURRENCY, 10) || 1,
  MAX_CONCURRENCY: parseInt(process.env.ADAPTIVE_MAX_CONCURRENCY, 10) || 20,

  // Initial concurrency applied when worker is initialized
  INITIAL_CONCURRENCY: parseInt(process.env.ADAPTIVE_INITIAL_CONCURRENCY, 10) || 5,

  // Periodic monitoring and decision loop interval in milliseconds (default 5s)
  MONITORING_INTERVAL: parseInt(process.env.ADAPTIVE_MONITORING_INTERVAL, 10) || 5000,

  // CPU utilization thresholds (percentage 0 - 100)
  CPU_HIGH_THRESHOLD: parseFloat(process.env.ADAPTIVE_CPU_HIGH_THRESHOLD) || 80.0,
  CPU_LOW_THRESHOLD: parseFloat(process.env.ADAPTIVE_CPU_LOW_THRESHOLD) || 50.0,

  // Memory utilization safety ceiling (percentage 0 - 100)
  MEMORY_HIGH_THRESHOLD: parseFloat(process.env.ADAPTIVE_MEMORY_HIGH_THRESHOLD) || 85.0,

  // Minimum cooldown period in ms between non-emergency concurrency adjustments
  COOLDOWN_PERIOD: parseInt(process.env.ADAPTIVE_COOLDOWN_PERIOD, 10) || 15000,

  // Workload definition threshold: number of waiting jobs considered "high queue workload"
  QUEUE_HIGH_THRESHOLD: parseInt(process.env.ADAPTIVE_QUEUE_HIGH_THRESHOLD, 10) || 3,

  // Maximum historical data points retained in-memory for live dashboard charts
  HISTORY_WINDOW_SIZE: parseInt(process.env.ADAPTIVE_HISTORY_SIZE, 10) || 60,

  // Bounded step adjustments
  MAX_SCALE_UP_STEP: parseInt(process.env.ADAPTIVE_MAX_SCALE_UP_STEP, 10) || 2,
  MAX_SCALE_DOWN_STEP: parseInt(process.env.ADAPTIVE_MAX_SCALE_DOWN_STEP, 10) || 1,
  EMERGENCY_SCALE_DOWN_STEP: parseInt(process.env.ADAPTIVE_EMERGENCY_SCALE_DOWN_STEP, 10) || 2
};

export default ADAPTIVE_CONFIG;

