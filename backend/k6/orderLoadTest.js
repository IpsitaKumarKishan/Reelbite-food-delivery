import http from "k6/http";
import { check, sleep } from "k6";

/**
 * k6 Controlled Load Testing Script for ReelBite Cloud Infrastructure
 * Evaluates API response latency and asynchronous order queuing under surging load.
 * 
 * Usage:
 *   k6 run backend/k6/orderLoadTest.js
 *   k6 run --vus 20 --duration 30s backend/k6/orderLoadTest.js
 */

export const options = {
  stages: [
    { duration: "10s", target: 5 },   // Warm-up ramp
    { duration: "20s", target: 25 },  // Peak traffic surge (simulates rush hour / lunch spike)
    { duration: "10s", target: 5 },   // Ramp-down to equilibrium
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete in under 500ms
    http_req_failed: ["rate<0.01"],   // Less than 1% failure
  },
};

const BASE_URL = __ENV.TARGET_URL || "http://localhost:8000";

export default function () {
  // 1. Health check & queue status verification
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health status is 200": (r) => r.status === 200,
    "system is healthy": (r) => JSON.parse(r.body).status === "ok",
  });

  // 2. Fetch queue telemetry
  const queueRes = http.get(`${BASE_URL}/api/queue/stats`);
  check(queueRes, {
    "queue endpoint responsive": (r) => r.status === 200,
  });

  // Small pacing delay between user actions
  sleep(0.5);
}

