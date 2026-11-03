/**
 * Fault Tolerance and Automated Recovery Configuration
 * Configurable via environment variables with safe production defaults.
 */
export const RECOVERY_CONFIG = {
  // Worker Heartbeat & Health Monitoring
  WORKER_HEARTBEAT_INTERVAL_MS: parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || "3000", 10),
  WORKER_HEARTBEAT_TIMEOUT_MS: parseInt(process.env.WORKER_HEARTBEAT_TIMEOUT_MS || "10000", 10), // 3.3x interval
  WATCHDOG_CHECK_INTERVAL_MS: parseInt(process.env.WATCHDOG_CHECK_INTERVAL_MS || "3000", 10),

  // Automated Recovery Limits
  RECOVERY_COOLDOWN_MS: parseInt(process.env.RECOVERY_COOLDOWN_MS || "15000", 10),
  MAX_RECOVERY_ATTEMPTS: parseInt(process.env.MAX_RECOVERY_ATTEMPTS || "3", 10),
  RECOVERY_VERIFY_GRACE_MS: parseInt(process.env.RECOVERY_VERIFY_GRACE_MS || "5000", 10),

  // Queue Retry & Backoff Configuration
  JOB_MAX_ATTEMPTS: parseInt(process.env.JOB_MAX_ATTEMPTS || "3", 10),
  JOB_BACKOFF_INITIAL_MS: parseInt(process.env.JOB_BACKOFF_INITIAL_MS || "1000", 10),
  JOB_LOCK_DURATION_MS: parseInt(process.env.JOB_LOCK_DURATION_MS || "30000", 10),
  JOB_STALLED_INTERVAL_MS: parseInt(process.env.JOB_STALLED_INTERVAL_MS || "30000", 10),

  // Infrastructure Transient Retry
  REDIS_RECONNECT_MAX_BACKOFF_MS: parseInt(process.env.REDIS_RECONNECT_MAX_BACKOFF_MS || "5000", 10),
  DB_RETRY_MAX_ATTEMPTS: parseInt(process.env.DB_RETRY_MAX_ATTEMPTS || "3", 10),
  DB_RETRY_INITIAL_DELAY_MS: parseInt(process.env.DB_RETRY_INITIAL_DELAY_MS || "1000", 10)
};

export default RECOVERY_CONFIG;

