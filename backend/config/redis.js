import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redisConnectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    // Graceful backoff; stops hammering if Redis is not running locally
    if (times > 5 && process.env.NODE_ENV !== "production") {
      return null; // Stop reconnecting after 5 attempts in dev if Redis is off
    }
    return Math.min(times * 200, 3000);
  }
};

let redisClient = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(REDIS_URL, redisConnectionOptions);

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    console.log("⚡ [Cloud Queue] Connected to Redis broker successfully");
  });

  redisClient.on("ready", () => {
    isRedisAvailable = true;
  });

  redisClient.on("error", (err) => {
    isRedisAvailable = false;
    // Log as informational in local dev so terminal stays clean
    if (process.env.NODE_ENV !== "production") {
      console.warn("⚠️ [Cloud Queue] Redis offline (using graceful fallback):", err.message);
    } else {
      console.error("❌ [Cloud Queue] Redis connection error:", err.message);
    }
  });

  redisClient.on("close", () => {
    isRedisAvailable = false;
  });
} catch (err) {
  console.warn("⚠️ [Cloud Queue] Failed to initialize Redis client:", err.message);
}

export const getRedisStatus = () => isRedisAvailable;
export { redisClient, REDIS_URL };

