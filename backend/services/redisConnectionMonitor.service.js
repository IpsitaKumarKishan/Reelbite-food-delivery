import { EventEmitter } from "events";
import { redisClient, getRedisStatus } from "../config/redis.js";

/**
 * Redis Connection Monitoring Service
 * Tracks Redis broker availability, disconnection events, reconnection attempts, and downtime.
 */
class RedisConnectionMonitorService extends EventEmitter {
  constructor(client = redisClient) {
    super();
    this.client = client;
    this.status = getRedisStatus() ? "CONNECTED" : "DISCONNECTED";
    this.lastConnectedAt = getRedisStatus() ? new Date().toISOString() : null;
    this.lastDisconnectedAt = getRedisStatus() ? null : new Date().toISOString();
    this.disconnectCount = 0;
    this.activeIncidentId = null;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.client) return;

    this.client.on("connect", () => {
      this.status = "CONNECTED";
      this.lastConnectedAt = new Date().toISOString();
      this.emit("connected", { timestamp: this.lastConnectedAt });
    });

    this.client.on("ready", () => {
      this.status = "CONNECTED";
      this.lastConnectedAt = new Date().toISOString();
      this.emit("ready", { timestamp: this.lastConnectedAt });
    });

    this.client.on("close", () => {
      if (this.status !== "DISCONNECTED") {
        this.status = "DISCONNECTED";
        this.lastDisconnectedAt = new Date().toISOString();
        this.disconnectCount++;
        this.emit("disconnected", {
          timestamp: this.lastDisconnectedAt,
          reason: "Redis socket closed"
        });
      }
    });

    this.client.on("reconnecting", (delay) => {
      this.status = "RECONNECTING";
      this.emit("reconnecting", { delay, timestamp: new Date().toISOString() });
    });

    this.client.on("error", (err) => {
      if (this.status === "CONNECTED") {
        this.status = "DISCONNECTED";
        this.lastDisconnectedAt = new Date().toISOString();
        this.disconnectCount++;
        this.emit("disconnected", {
          timestamp: this.lastDisconnectedAt,
          reason: err.message
        });
      }
    });
  }

  /**
   * Set active incident ID associated with current Redis downtime
   */
  setActiveIncidentId(incidentId) {
    this.activeIncidentId = incidentId;
  }

  getActiveIncidentId() {
    return this.activeIncidentId;
  }

  getStatus() {
    const isAvailable = getRedisStatus() || this.status === "CONNECTED";
    const now = Date.now();
    const downtimeMs = (!isAvailable && this.lastDisconnectedAt)
      ? now - new Date(this.lastDisconnectedAt).getTime()
      : 0;

    return {
      status: isAvailable ? "CONNECTED" : this.status,
      isAvailable,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      downtimeMs,
      disconnectCount: this.disconnectCount,
      activeIncidentId: this.activeIncidentId
    };
  }
}

export { RedisConnectionMonitorService };
export const redisConnectionMonitor = new RedisConnectionMonitorService();
export default redisConnectionMonitor;

