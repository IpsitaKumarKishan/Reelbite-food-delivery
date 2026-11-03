import { EventEmitter } from "events";
import mongoose from "mongoose";
import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";

/**
 * MongoDB Atlas Connection Monitoring & Transient Retry Service
 * Tracks database liveness, handles transient failovers, and provides safe execution retry wrapper.
 */
class DbConnectionMonitorService extends EventEmitter {
  constructor() {
    super();
    this.status = mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED";
    this.lastConnectedAt = this.status === "CONNECTED" ? new Date().toISOString() : null;
    this.lastDisconnectedAt = this.status === "DISCONNECTED" ? new Date().toISOString() : null;
    this.disconnectCount = 0;
    this.activeIncidentId = null;

    this._bindEvents();
  }

  _bindEvents() {
    mongoose.connection.on("connected", () => {
      this.status = "CONNECTED";
      this.lastConnectedAt = new Date().toISOString();
      this.emit("connected", { timestamp: this.lastConnectedAt });
    });

    mongoose.connection.on("reconnected", () => {
      this.status = "CONNECTED";
      this.lastConnectedAt = new Date().toISOString();
      this.emit("reconnected", { timestamp: this.lastConnectedAt });
    });

    mongoose.connection.on("disconnected", () => {
      this.status = "DISCONNECTED";
      this.lastDisconnectedAt = new Date().toISOString();
      this.disconnectCount++;
      this.emit("disconnected", {
        timestamp: this.lastDisconnectedAt,
        reason: "MongoDB connection severed"
      });
    });

    mongoose.connection.on("error", (err) => {
      this.emit("error", {
        timestamp: new Date().toISOString(),
        error: err.message
      });
    });
  }

  setActiveIncidentId(incidentId) {
    this.activeIncidentId = incidentId;
  }

  getActiveIncidentId() {
    return this.activeIncidentId;
  }

  getStatus() {
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1;
    const stateNames = { 0: "DISCONNECTED", 1: "CONNECTED", 2: "CONNECTING", 3: "DISCONNECTING" };
    const now = Date.now();
    const downtimeMs = (!isConnected && this.lastDisconnectedAt)
      ? now - new Date(this.lastDisconnectedAt).getTime()
      : 0;

    return {
      status: stateNames[readyState] || "UNKNOWN",
      isConnected,
      readyState,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      downtimeMs,
      disconnectCount: this.disconnectCount,
      activeIncidentId: this.activeIncidentId
    };
  }

  /**
   * Executes an asynchronous database operation with transient retry and exponential backoff
   * @param {Function} opFn () => Promise<any>
   * @param {number} maxRetries 
   * @param {number} initialDelayMs 
   */
  async executeWithRetry(
    opFn,
    maxRetries = RECOVERY_CONFIG.DB_RETRY_MAX_ATTEMPTS,
    initialDelayMs = RECOVERY_CONFIG.DB_RETRY_INITIAL_DELAY_MS
  ) {
    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt <= maxRetries) {
      try {
        attempt++;
        return await opFn();
      } catch (err) {
        const isTransient = this._isTransientDbError(err);

        if (!isTransient || attempt > maxRetries) {
          throw err;
        }

        console.warn(
          `⚠️ [DB Retry Wrapper] Transient MongoDB error on attempt ${attempt}/${maxRetries}: ${err.message}. Retrying in ${delay}ms...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  _isTransientDbError(err) {
    if (!err) return false;
    const msg = (err.message || "").toLowerCase();
    const name = err.name || "";

    return (
      name === "MongoNetworkError" ||
      name === "MongoServerSelectionError" ||
      name === "MongoTimeoutError" ||
      msg.includes("timed out") ||
      msg.includes("buffering timed out") ||
      msg.includes("connection closed") ||
      msg.includes("topology was destroyed") ||
      msg.includes("econnrefused") ||
      msg.includes("enotfound")
    );
  }
}

export { DbConnectionMonitorService };
export const dbConnectionMonitor = new DbConnectionMonitorService();
export default dbConnectionMonitor;

