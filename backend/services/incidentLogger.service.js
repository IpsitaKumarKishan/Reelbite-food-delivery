/**
 * Incident Logger & Reliability Analytics Service
 * Maintains structured incident logs for all distributed component failures.
 * Accurately calculates Detection Time (MTTD), Recovery Time (MTTR), and failure distributions.
 */
class IncidentLoggerService {
  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
    this.incidents = [];
    this.listeners = new Set();
  }

  /**
   * Subscribe to new incident creation or state transitions
   * @param {Function} callback (incident) => void
   */
  onIncident(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _notify(incident) {
    for (const listener of this.listeners) {
      try {
        listener(incident);
      } catch (err) {
        console.error("❌ [Incident Logger] Error in listener:", err.message);
      }
    }
  }

  /**
   * Create and record a new structured failure incident
   * @param {Object} data 
   * @returns {Object} Created incident record
   */
  createIncident({
    componentName, // "WORKER" | "REDIS" | "MONGODB" | "CONTAINER" | "QUEUE"
    failureType,   // "WORKER_CRASH" | "HEARTBEAT_TIMEOUT" | "REDIS_DISCONNECTED" | "DB_DISCONNECTED" | "CONTAINER_SHUTDOWN"
    failureTimestamp = null,
    failureReason = "Unknown failure detected",
    metadata = {}
  }) {
    const now = Date.now();
    const failTime = failureTimestamp ? new Date(failureTimestamp).getTime() : now - 50;
    const detectTime = now;
    const detectionTimeMs = Math.max(0, detectTime - failTime);

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const incidentId = `INC-${componentName}-${now}-${randomSuffix}`;

    const incident = {
      incidentId,
      componentName,
      failureType,
      failureTimestamp: new Date(failTime).toISOString(),
      detectionTimestamp: new Date(detectTime).toISOString(),
      recoveryTimestamp: null,
      detectionTimeMs,
      recoveryTimeMs: null,
      recoveryAttempts: 0,
      finalStatus: "DETECTED", // DETECTED | RECOVERING | RESOLVED | FAILED
      failureReason,
      metadata
    };

    this.incidents.push(incident);
    if (this.incidents.length > this.maxHistory) {
      this.incidents.shift();
    }

    console.warn(
      `🚨 [Incident Alert] [${incident.incidentId}] ${componentName} ${failureType} | Detection Latency: ${detectionTimeMs}ms | Reason: ${failureReason}`
    );

    this._notify(incident);
    return incident;
  }

  /**
   * Mark an incident as actively undergoing recovery
   */
  markRecovering(incidentId, attempts = 1) {
    const incident = this.incidents.find((inc) => inc.incidentId === incidentId);
    if (!incident) return null;

    incident.finalStatus = "RECOVERING";
    incident.recoveryAttempts = attempts;
    this._notify(incident);
    return incident;
  }

  /**
   * Mark an incident as successfully resolved and compute Recovery Time (MTTR)
   */
  resolveIncident(incidentId, recoveryDetails = {}) {
    const incident = this.incidents.find((inc) => inc.incidentId === incidentId);
    if (!incident) return null;

    const now = Date.now();
    const failTime = new Date(incident.failureTimestamp).getTime();

    incident.recoveryTimestamp = new Date(now).toISOString();
    incident.recoveryTimeMs = Math.max(0, now - failTime);
    incident.finalStatus = "RESOLVED";
    if (recoveryDetails.recoveryAttempts) {
      incident.recoveryAttempts = recoveryDetails.recoveryAttempts;
    }
    if (recoveryDetails.resolutionNotes) {
      incident.resolutionNotes = recoveryDetails.resolutionNotes;
    }

    console.log(
      `✅ [Incident Resolved] [${incident.incidentId}] ${incident.componentName} recovered in ${incident.recoveryTimeMs}ms (${incident.recoveryAttempts} attempts)`
    );

    this._notify(incident);
    return incident;
  }

  /**
   * Retrieve active unresolved incidents
   */
  getActiveIncidents() {
    return this.incidents.filter((inc) => inc.finalStatus === "DETECTED" || inc.finalStatus === "RECOVERING");
  }

  /**
   * Retrieve recent incidents with optional component filter
   */
  getIncidents(filter = {}, limit = 50) {
    let list = [...this.incidents];
    if (filter.componentName) {
      list = list.filter((inc) => inc.componentName === filter.componentName);
    }
    if (filter.finalStatus) {
      list = list.filter((inc) => inc.finalStatus === filter.finalStatus);
    }
    return list.slice(-limit);
  }

  /**
   * Compute reliability KPIs: MTTD, MTTR, and incident breakdown
   */
  getMetrics() {
    const total = this.incidents.length;
    const resolved = this.incidents.filter((inc) => inc.finalStatus === "RESOLVED");
    const active = this.incidents.filter((inc) => inc.finalStatus === "DETECTED" || inc.finalStatus === "RECOVERING");

    // Mean Time to Detect (MTTD)
    const totalDetectMs = this.incidents.reduce((sum, inc) => sum + (inc.detectionTimeMs || 0), 0);
    const mttdMs = total > 0 ? Math.round(totalDetectMs / total) : 0;

    // Mean Time to Recover (MTTR)
    const totalRecoverMs = resolved.reduce((sum, inc) => sum + (inc.recoveryTimeMs || 0), 0);
    const mttrMs = resolved.length > 0 ? Math.round(totalRecoverMs / resolved.length) : 0;

    const byComponent = {
      WORKER: 0,
      REDIS: 0,
      MONGODB: 0,
      CONTAINER: 0,
      QUEUE: 0
    };

    for (const inc of this.incidents) {
      if (byComponent[inc.componentName] !== undefined) {
        byComponent[inc.componentName]++;
      }
    }

    return {
      totalIncidents: total,
      activeIncidents: active.length,
      resolvedIncidents: resolved.length,
      mttdMs,
      mttrMs,
      byComponent,
      timestamp: new Date().toISOString()
    };
  }
}

export { IncidentLoggerService };
export const incidentLogger = new IncidentLoggerService();
export default incidentLogger;

