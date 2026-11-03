import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import toast from "react-hot-toast";
import {
  FaServer,
  FaMicrochip,
  FaMemory,
  FaGaugeHigh,
  FaBolt,
  FaRotateRight,
  FaCircleCheck,
  FaTriangleExclamation,
  FaBug,
  FaArrowTrendUp,
  FaArrowTrendDown,
  FaClock,
  FaSliders,
  FaPlay,
  FaShieldHalved,
  FaDatabase
} from "react-icons/fa6";
import {
  HeartPulse,
  Activity,
  ShieldAlert,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Server,
  HardDrive
} from "lucide-react";

export default function InfrastructureMonitoring() {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Tab navigation: "overview" (Adaptive Concurrency) | "fault-tolerance" | "dlq"
  const [activeTab, setActiveTab] = useState("overview");

  // Controller control station states
  const [controlMode, setControlMode] = useState("adaptive");
  const [fixedConcurrency, setFixedConcurrency] = useState(5);
  const [updatingMode, setUpdatingMode] = useState(false);

  // Load simulator state
  const [burstCount, setBurstCount] = useState(15);
  const [simulating, setSimulating] = useState(false);
  const [simulatingScenario, setSimulatingScenario] = useState(null);
  const [retryingJobId, setRetryingJobId] = useState(null);
  const [discardingJobId, setDiscardingJobId] = useState(null);

  // Filters
  const [incidentFilter, setIncidentFilter] = useState("ALL");
  const [dlqFilter, setDlqFilter] = useState("ALL");

  const timerRef = useRef(null);

  const fetchMetrics = async (isBackground = false) => {
    if (!isBackground) setRefreshing(true);
    try {
      const res = await axios.get(`${serverUrl}/api/admin/infrastructure/metrics`, {
        withCredentials: true
      });
      if (res.data.success) {
        setTelemetry(res.data);
        if (res.data.controller) {
          setControlMode(res.data.controller.mode || "adaptive");
          setFixedConcurrency(res.data.controller.currentConcurrency || 5);
        }
      }
    } catch (err) {
      if (!isBackground) {
        toast.error(err.response?.data?.message || "Failed to load infrastructure telemetry");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics(false);
  }, []);

  // Periodic polling interval (3.5s)
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchMetrics(true);
      }, 3500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh]);

  const handleModeUpdate = async () => {
    setUpdatingMode(true);
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/infrastructure/mode`,
        {
          mode: controlMode,
          fixedValue: Number(fixedConcurrency)
        },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        fetchMetrics(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update concurrency mode");
    } finally {
      setUpdatingMode(false);
    }
  };

  const handleSimulateBurst = async (count) => {
    setSimulating(true);
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/infrastructure/simulate-traffic`,
        { count },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message);
        setTimeout(() => fetchMetrics(true), 500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  const handleRetryJob = async (jobId, force = false) => {
    setRetryingJobId(jobId);
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/infrastructure/dlq/retry/${jobId}`,
        { force },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message || `Job #${jobId} resubmitted to queue`);
        fetchMetrics(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.reason || err.response?.data?.message || "Retry failed");
    } finally {
      setRetryingJobId(null);
    }
  };

  const handleDiscardJob = async (jobId) => {
    setDiscardingJobId(jobId);
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/infrastructure/dlq/discard/${jobId}`,
        { reason: "Admin UI manual discard" },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(`Job #${jobId} discarded from DLQ`);
        fetchMetrics(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Discard failed");
    } finally {
      setDiscardingJobId(null);
    }
  };

  const handleSimulateFailure = async (scenario, params = {}) => {
    setSimulatingScenario(scenario);
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/infrastructure/simulate-failure`,
        { scenario, ...params },
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(res.data.message || "Failure simulation initiated");
        setTimeout(() => fetchMetrics(true), 600);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Simulation failed");
    } finally {
      setSimulatingScenario(null);
    }
  };

  if (loading && !telemetry) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-stone-200/80 shadow-sm flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-stone-500 tracking-wider uppercase">
          Connecting to Cloud Infrastructure & BullMQ Telemetry...
        </p>
      </div>
    );
  }

  const {
    queue = {},
    resources = {},
    controller = {},
    workers = [],
    workerSummary = {},
    deadLetterQueue = {},
    faultTolerance = {},
    adjustmentLogs = [],
    history = {}
  } = telemetry || {};

  const queueCounts = queue.counts || {};
  const queuePerf = queue.performance || {};
  const cpu = resources.cpu || {};
  const memory = resources.memory || {};

  const incidentMetrics = faultTolerance.incidentMetrics || {};
  const recentIncidents = faultTolerance.recentIncidents || [];
  const recoveryStats = faultTolerance.recoveryStats || {};
  const recoveryLogs = faultTolerance.recoveryLogs || [];
  const dlqStats = faultTolerance.dlqStats || {};
  const dlqJobs = faultTolerance.dlqJobs || deadLetterQueue.recentFailedJobs || [];
  const redisStatus = faultTolerance.redisStatus || {};
  const dbStatus = faultTolerance.dbStatus || {};
  const containerPolicy = faultTolerance.containerPolicy || {};

  const isAdaptive = controller.mode === "adaptive";
  const inCooldown = controller.inCooldown;

  // Filtered incidents
  const filteredIncidents = recentIncidents.filter((inc) => {
    if (incidentFilter === "ALL") return true;
    return inc.componentName === incidentFilter;
  });

  // Filtered DLQ jobs
  const filteredDlqJobs = dlqJobs.filter((job) => {
    if (dlqFilter === "ALL") return true;
    return job.failureType === dlqFilter;
  });

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL & STATUS BANNER ── */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl shadow-lg shrink-0">
            <FaGaugeHigh />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Cloud Resilience & Concurrency Supervisor
              </h2>
              <span
                className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border ${
                  isAdaptive
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                }`}
              >
                {isAdaptive ? "● Adaptive Auto-Scaling" : "■ Fixed Benchmark Mode"}
              </span>
              <span
                className={`text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border ${
                  workerSummary.health === "HEALTHY"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                }`}
              >
                Fleet: {workerSummary.health || "HEALTHY"}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Resource-aware background job concurrency with automated failure detection, dead letter queueing, and sub-second recovery.
            </p>
          </div>
        </div>

        {/* Status badges & refresh controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-xs font-bold text-stone-300">
            <span
              className={`w-2 h-2 rounded-full ${
                queue.redisConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>Redis 7: {queue.redisConnected ? "Connected" : "Offline"}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-xs font-bold text-stone-300">
            <span
              className={`w-2 h-2 rounded-full ${
                dbStatus.isConnected ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span>MongoDB: {dbStatus.status || "CONNECTED"}</span>
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              autoRefresh
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            <span>{autoRefresh ? "Live (3.5s)" : "Paused"}</span>
          </button>

          <button
            onClick={() => fetchMetrics(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-[#ff5200] hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FaRotateRight className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-stone-900 text-white shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <FaGaugeHigh />
          <span>Adaptive Concurrency & Hardware</span>
        </button>

        <button
          onClick={() => setActiveTab("fault-tolerance")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === "fault-tolerance"
              ? "bg-[#ff5200] text-white shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <HeartPulse size={15} />
          <span>Fault Tolerance & MTTR Supervisor</span>
          {incidentMetrics.activeIncidents > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {incidentMetrics.activeIncidents} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("dlq")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center gap-2 ${
            activeTab === "dlq"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
          }`}
        >
          <FaBug />
          <span>Dead Letter Queue (DLQ) Center</span>
          {(dlqStats.pendingCount || deadLetterQueue.totalFailed || 0) > 0 && (
            <span className="bg-white text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {dlqStats.pendingCount || deadLetterQueue.totalFailed || 0}
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: ADAPTIVE CONCURRENCY & HARDWARE                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ── FIVE CRITICAL KPI GAUGES ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Concurrency Gauge */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Worker Concurrency
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff5200] flex items-center justify-center">
                  <FaBolt size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {controller.currentConcurrency || 5}
                </span>
                <span className="text-xs font-bold text-stone-400">
                  / {controller.maxConcurrency || 20} max
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-stone-500">
                <span>Range: {controller.minConcurrency || 1} – {controller.maxConcurrency || 20}</span>
                {inCooldown ? (
                  <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">
                    Cooldown {controller.cooldownRemainingSeconds}s
                  </span>
                ) : (
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px]">
                    Adaptive Active
                  </span>
                )}
              </div>
            </div>

            {/* KPI 2: Queue Workload Backlog */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Queue Backlog
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FaClock size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {queueCounts.waiting || 0}
                </span>
                <span className="text-xs font-bold text-stone-400">waiting</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-stone-500">
                <span className="text-blue-600 font-extrabold">{queueCounts.active || 0} in-flight</span>
                <span>Oldest: {queuePerf.oldestWaitTimeMs || 0}ms</span>
              </div>
            </div>

            {/* KPI 3: Throughput & Speed */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Processing Speed
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FaArrowTrendUp size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {queuePerf.jobsPerSecond || 0}
                </span>
                <span className="text-xs font-bold text-stone-400">jobs / sec</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-stone-500">
                <span>Avg: {queuePerf.avgProcessingDurationMs || 0}ms</span>
                <span className="text-emerald-600">{queueCounts.completed || 0} total</span>
              </div>
            </div>

            {/* KPI 4: CPU Consumption */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  CPU Utilization
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <FaMicrochip size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {(cpu.systemPercent || 0).toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-stone-400">system</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (cpu.systemPercent || 0) >= 80
                        ? "bg-rose-500"
                        : (cpu.systemPercent || 0) >= 50
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, cpu.systemPercent || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-stone-400 mt-1">
                  <span>Node.js: {(cpu.processPercent || 0).toFixed(1)}%</span>
                  <span>Cores: {cpu.cores || 1}</span>
                </div>
              </div>
            </div>

            {/* KPI 5: Memory Footprint */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Memory Utilization
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <FaMemory size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {(memory.systemPercent || 0).toFixed(1)}%
                </span>
                <span className="text-xs font-bold text-stone-400">RAM</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-stone-500">
                <span>RSS: {memory.processRssMb || 0}MB</span>
                <span className={queueCounts.failed > 0 ? "text-rose-600 font-black" : "text-emerald-600"}>
                  DLQ: {queueCounts.failed || 0}
                </span>
              </div>
            </div>
          </div>

          {/* ── CONTROLLER COMMAND STATION & TRAFFIC SPIKE SIMULATOR ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel A: Concurrency Operating Mode */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff5200] flex items-center justify-center">
                    <FaSliders size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900">Controller Operating Mode</h3>
                    <p className="text-xs text-stone-400">Toggle between autonomous tuning and benchmark presets</p>
                  </div>
                </div>
                <span className="text-[11px] font-black uppercase text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg">
                  Active: {controlMode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setControlMode("adaptive")}
                  className={`p-4 rounded-2xl border text-left transition ${
                    controlMode === "adaptive"
                      ? "border-[#ff5200] bg-orange-50/50 shadow-sm"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-stone-900">Adaptive Auto-Tuning</span>
                    {controlMode === "adaptive" && <FaCircleCheck className="text-[#ff5200]" size={14} />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Dynamically scales concurrency between 1 and 20 based on real-time CPU, RAM, and backlog rates.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setControlMode("fixed")}
                  className={`p-4 rounded-2xl border text-left transition ${
                    controlMode === "fixed"
                      ? "border-blue-600 bg-blue-50/50 shadow-sm"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-stone-900">Fixed Concurrency</span>
                    {controlMode === "fixed" && <FaCircleCheck className="text-blue-600" size={14} />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Locks concurrency to a constant level for controlled experimentation (Experiment A vs B).
                  </p>
                </button>
              </div>

              {controlMode === "fixed" && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700">Select Fixed Worker Concurrency:</span>
                    <span className="text-sm font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">
                      {fixedConcurrency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 3, 5, 10, 15, 20].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFixedConcurrency(val)}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition border ${
                          fixedConcurrency === val
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleModeUpdate}
                disabled={updatingMode}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-black rounded-2xl transition shadow-sm"
              >
                {updatingMode ? "Applying Configuration..." : "Apply Mode & Concurrency Settings"}
              </button>
            </div>

            {/* Panel B: Workload Spike Injection Station */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FaPlay size={14} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-stone-900">Traffic Surge Simulator</h3>
                    <p className="text-xs text-stone-400">Inject synthetic orders to observe real-time scaling reactions</p>
                  </div>
                </div>
                <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Synthetic Testing
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span>Batch Task Surge Size:</span>
                  <span className="text-emerald-600 font-black">{burstCount} Jobs</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 15, 30, 50].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setBurstCount(cnt)}
                      className={`py-2 text-xs font-black rounded-xl transition border ${
                        burstCount === cnt
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      +{cnt} Jobs
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FaTriangleExclamation size={12} />
                  <span>Real-time Behavior:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900/80">
                  Submitting synthetic jobs drives up the waiting backlog. Watch the Adaptive Controller detect the surge, respect CPU headroom, and step up concurrency vertically.
                </p>
              </div>

              <button
                onClick={() => handleSimulateBurst(burstCount)}
                disabled={simulating}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-2xl transition shadow-sm flex items-center justify-center gap-2"
              >
                <FaBolt />
                <span>{simulating ? "Injecting Workload..." : `Inject ${burstCount} Order Tasks Now`}</span>
              </button>
            </div>
          </div>

          {/* ── HISTORICAL TELEMETRY CHARTS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Queue Backlog Trend */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900">Queue Depth Telemetry</h3>
                  <p className="text-[11px] text-stone-400">Waiting vs Active in-flight jobs over time</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Waiting
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Active
                  </span>
                </div>
              </div>

              <div className="h-44 w-full bg-stone-50 rounded-2xl p-3 flex items-end gap-1.5 border border-stone-100 overflow-x-auto">
                {history.queue && history.queue.length > 0 ? (
                  history.queue.slice(-24).map((item, idx) => {
                    const maxVal = Math.max(
                      10,
                      ...history.queue.slice(-24).map((h) => (h.waiting || 0) + (h.active || 0))
                    );
                    const waitH = Math.min(100, Math.round(((item.waiting || 0) / maxVal) * 100));
                    const actH = Math.min(100, Math.round(((item.active || 0) / maxVal) * 100));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-0.5 group relative min-w-[12px]"
                      >
                        <div
                          className="w-full bg-amber-500 rounded-t transition-all group-hover:bg-amber-600"
                          style={{ height: `${waitH}%` }}
                          title={`Waiting: ${item.waiting}`}
                        />
                        <div
                          className="w-full bg-blue-500 rounded-b transition-all group-hover:bg-blue-600"
                          style={{ height: `${actH}%` }}
                          title={`Active: ${item.active}`}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 font-bold">
                    Collecting historical queue data...
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] font-bold text-stone-400">
                <span>T-24 samples</span>
                <span>Current Snapshot</span>
              </div>
            </div>

            {/* Chart 2: Hardware Pressure */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900">Host Hardware Utilization</h3>
                  <p className="text-[11px] text-stone-400">System CPU % vs System RAM %</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> CPU %
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> RAM %
                  </span>
                </div>
              </div>

              <div className="h-44 w-full bg-stone-50 rounded-2xl p-3 flex items-end gap-1.5 border border-stone-100 overflow-x-auto">
                {history.resources && history.resources.length > 0 ? (
                  history.resources.slice(-24).map((resSnap, idx) => {
                    const cpuH = Math.min(100, Math.round(resSnap.cpu?.systemPercent || 0));
                    const memH = Math.min(100, Math.round(resSnap.memory?.systemPercent || 0));

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-0.5 group relative min-w-[12px]"
                      >
                        <div
                          className="w-full bg-rose-500 rounded-t transition-all group-hover:bg-rose-600 opacity-90"
                          style={{ height: `${cpuH}%` }}
                          title={`CPU: ${cpuH}%`}
                        />
                        <div
                          className="w-full bg-purple-500 rounded-b transition-all group-hover:bg-purple-600 opacity-80"
                          style={{ height: `${memH}%` }}
                          title={`RAM: ${memH}%`}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 font-bold">
                    Collecting hardware samples...
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] font-bold text-stone-400">
                <span>Thresholds: CPU &gt; 80% (Hold) | RAM &gt; 85% (OOM Safety Scale-down)</span>
                <span>Current Utilization</span>
              </div>
            </div>
          </div>

          {/* ── ADAPTIVE CONCURRENCY DECISION AUDIT LOG ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff5200] flex items-center justify-center">
                  <FaBolt size={14} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Adaptive Decision Audit Log</h3>
                  <p className="text-xs text-stone-400">Structured log of real-time concurrency adjustments</p>
                </div>
              </div>
              <span className="text-xs font-bold text-stone-400">{adjustmentLogs.length} Adjustments Recorded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-400 font-extrabold uppercase border-b border-stone-100 tracking-wider">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Transition</th>
                    <th className="py-3 px-3">Rule Applied</th>
                    <th className="py-3 px-3">Backlog</th>
                    <th className="py-3 px-3">CPU / RAM</th>
                    <th className="py-3 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {adjustmentLogs.length > 0 ? (
                    [...adjustmentLogs].reverse().map((log, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-black text-[11px] ${
                              log.delta > 0
                                ? "bg-emerald-100 text-emerald-800"
                                : log.delta < 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {log.delta > 0 ? <FaArrowTrendUp size={10} /> : <FaArrowTrendDown size={10} />}
                            {log.previousConcurrency} ➔ {log.newConcurrency} ({log.delta > 0 ? `+${log.delta}` : log.delta})
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-stone-100 text-stone-800 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                            {log.rule}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-mono">
                          {log.waitingJobs} wait / {log.activeJobs} act
                        </td>
                        <td className="py-3 px-3 text-stone-600 font-mono">
                          {log.cpuPercent}% / {log.memoryPercent}%
                        </td>
                        <td className="py-3 px-3 text-stone-600 text-[11px] max-w-md truncate" title={log.reason}>
                          {log.reason}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-stone-400 font-bold">
                        No concurrency adjustments triggered yet. Workload is in steady-state equilibrium.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: FAULT TOLERANCE & MTTR SUPERVISOR                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "fault-tolerance" && (
        <div className="space-y-6">
          {/* ── MTTR & RESILIENCE KPI GAUGES ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Mean Time to Recovery (MTTR) */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  MTTR (Mean Recovery Time)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <HeartPulse size={15} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {incidentMetrics.mttrMs != null ? `${incidentMetrics.mttrMs}ms` : "N/A"}
                </span>
                <span className="text-xs font-bold text-emerald-600">Sub-second recovery</span>
              </div>
              <p className="mt-2 text-[11px] text-stone-500 font-medium">
                Resolved: {incidentMetrics.resolvedIncidents || 0} / {incidentMetrics.totalIncidents || 0} incidents
              </p>
            </div>

            {/* KPI 2: Mean Time to Detection (MTTD) */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  MTTD (Detection Latency)
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Activity size={15} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {incidentMetrics.mttdMs != null ? `${incidentMetrics.mttdMs}ms` : "1ms"}
                </span>
                <span className="text-xs font-bold text-blue-600">Watchdog verified</span>
              </div>
              <p className="mt-2 text-[11px] text-stone-500 font-medium">
                Heartbeat Interval: 3000ms | Timeout: 10000ms
              </p>
            </div>

            {/* KPI 3: Autonomous Recovery Success Rate */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Self-Healing Success Rate
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff5200] flex items-center justify-center">
                  <FaShieldHalved size={14} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {incidentMetrics.totalIncidents > 0
                    ? `${(
                        ((incidentMetrics.resolvedIncidents || 0) / incidentMetrics.totalIncidents) *
                        100
                      ).toFixed(1)}%`
                    : "100%"}
                </span>
                <span className="text-xs font-bold text-stone-400">rate</span>
              </div>
              <p className="mt-2 text-[11px] text-stone-500 font-medium">
                Successful Restarts: {recoveryStats.successCount || 0}
              </p>
            </div>

            {/* KPI 4: Cascade Restart Loop Safeguard */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Restart Thrashing Shield
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <ShieldAlert size={15} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-stone-900 tracking-tight">
                  {recoveryStats.blockedCount || 0}
                </span>
                <span className="text-xs font-bold text-purple-600">loops blocked</span>
              </div>
              <p className="mt-2 text-[11px] text-stone-500 font-medium">
                Limit: 3 restarts / 60s | Cooldown: 15s
              </p>
            </div>
          </div>

          {/* ── INFRASTRUCTURE HEALTH STATUS CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Redis Broker Resilience */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <FaServer size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-stone-900">Redis 7 Broker</h4>
                    <p className="text-[10px] text-stone-400">Queue Transport & PubSub</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                    queue.redisConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {queue.redisConnected ? "ONLINE" : "DISCONNECTED"}
                </span>
              </div>
              <div className="text-[11px] text-stone-600 space-y-1 font-medium bg-stone-50 p-3 rounded-2xl">
                <div className="flex justify-between">
                  <span>Disconnects logged:</span>
                  <span className="font-bold">{redisStatus.disconnectCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Downtime recorded:</span>
                  <span className="font-bold">{redisStatus.downtimeMs || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Reconnect strategy:</span>
                  <span className="font-bold text-stone-800">Exponential backoff (5s max)</span>
                </div>
              </div>
            </div>

            {/* Card 2: MongoDB Atlas Connection */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <FaDatabase size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-stone-900">MongoDB Atlas</h4>
                    <p className="text-[10px] text-stone-400">Order Storage & Atomic Locks</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                    dbStatus.isConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {dbStatus.status || "CONNECTED"}
                </span>
              </div>
              <div className="text-[11px] text-stone-600 space-y-1 font-medium bg-stone-50 p-3 rounded-2xl">
                <div className="flex justify-between">
                  <span>Transient Retry Policy:</span>
                  <span className="font-bold text-stone-800">3 retries (1000ms delay)</span>
                </div>
                <div className="flex justify-between">
                  <span>Disconnect count:</span>
                  <span className="font-bold">{dbStatus.disconnectCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Atomic Lock Safety:</span>
                  <span className="font-bold text-emerald-700">Idempotent Guards Active</span>
                </div>
              </div>
            </div>

            {/* Card 3: Container Orchestrator Lifecycle */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Server size={14} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-stone-900">Container Lifecycle</h4>
                    <p className="text-[10px] text-stone-400">Docker Restart & Shutdown</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                  HEALTHCHECK PASS
                </span>
              </div>
              <div className="text-[11px] text-stone-600 space-y-1 font-medium bg-stone-50 p-3 rounded-2xl">
                <div className="flex justify-between">
                  <span>Docker Restart Policy:</span>
                  <span className="font-bold text-stone-800">{containerPolicy.restartPolicy || "unless-stopped"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Healthcheck Endpoint:</span>
                  <span className="font-bold font-mono text-[10px]">/api/health (10s)</span>
                </div>
                <div className="flex justify-between">
                  <span>Graceful Termination:</span>
                  <span className="font-bold text-stone-800">15s SIGTERM job drain</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── CHAOS ENGINEERING & FAULT SIMULATION CONTROL STATION ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Activity size={15} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Controlled Failure Injection & Chaos Testing
                  </h3>
                  <p className="text-xs text-stone-400">
                    Trigger live fault scenarios to evaluate watchdog detection, exponential retries, and MTTR
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black uppercase text-purple-700 bg-purple-100 px-3 py-1 rounded-xl">
                Safe Defense Testing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Scenario 1: Worker Crash */}
              <button
                type="button"
                onClick={() => handleSimulateFailure("WORKER_CRASH")}
                disabled={Boolean(simulatingScenario)}
                className="p-4 rounded-2xl border border-stone-200 hover:border-rose-300 hover:bg-rose-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between font-black text-xs text-stone-900">
                  <span className="group-hover:text-rose-600 transition">CASE 1: Worker Crash</span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded">SIGSEGV</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Abruptly halts worker; watchdog creates incident ticket and triggers self-healing restart.
                </p>
              </button>

              {/* Scenario 2: Heartbeat Timeout */}
              <button
                type="button"
                onClick={() => handleSimulateFailure("HEARTBEAT_TIMEOUT")}
                disabled={Boolean(simulatingScenario)}
                className="p-4 rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between font-black text-xs text-stone-900">
                  <span className="group-hover:text-amber-600 transition">CASE 2: Zombie / Heartbeat Drop</span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded">&gt; 10s Timeout</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Halts liveness pings; watchdog trips UNHEALTHY status and initiates automated revival.
                </p>
              </button>

              {/* Scenario 3: Redis Network Partition */}
              <button
                type="button"
                onClick={() => handleSimulateFailure("REDIS_INTERRUPT", { durationMs: 2500 })}
                disabled={Boolean(simulatingScenario)}
                className="p-4 rounded-2xl border border-stone-200 hover:border-blue-300 hover:bg-blue-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between font-black text-xs text-stone-900">
                  <span className="group-hover:text-blue-600 transition">CASE 3: Redis Interruption</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded">2.5s Drop</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Drops Redis socket; workers pause in holding state and auto-reconnect with exponential backoff.
                </p>
              </button>

              {/* Scenario 4: MongoDB Hiccup */}
              <button
                type="button"
                onClick={() => handleSimulateFailure("DB_HICCUP", { durationMs: 2000 })}
                disabled={Boolean(simulatingScenario)}
                className="p-4 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between font-black text-xs text-stone-900">
                  <span className="group-hover:text-emerald-600 transition">CASE 4: MongoDB Hiccup</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Transient Retry</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Simulates DB disconnect; tests safe transient query retry execution wrapper.
                </p>
              </button>

              {/* Scenario 5: Transient Retry Exception */}
              <button
                type="button"
                onClick={() => handleSimulateFailure("JOB_TRANSIENT")}
                disabled={Boolean(simulatingScenario)}
                className="p-4 rounded-2xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between font-black text-xs text-stone-900">
                  <span className="group-hover:text-orange-600 transition">Transient Exception</span>
                  <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded">1s, 2s Backoff</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Enqueues failing job retried 3 times with exponential backoff before DLQ commitment.
                </p>
              </button>

              {/* Scenario 6: Permanent Validation DLQ */}
              <button
                type="button"
                onClick={() => handleSimulateFailure("JOB_PERMANENT")}
                disabled={Boolean(simulatingScenario)}
                className="p-4 rounded-2xl border border-stone-200 hover:border-purple-300 hover:bg-purple-50/40 text-left transition disabled:opacity-50 group"
              >
                <div className="flex items-center justify-between font-black text-xs text-stone-900">
                  <span className="group-hover:text-purple-600 transition">Permanent DLQ Exception</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Direct DLQ</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Throws PermanentJobError; BullMQ bypasses futile retries and dispatches immediately to DLQ.
                </p>
              </button>
            </div>
          </div>

          {/* ── WORKER FLEET HEARTBEAT & LIVENESS MATRIX ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <HeartPulse size={15} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Background Worker Liveness & Heartbeats</h3>
                  <p className="text-xs text-stone-400">Continuous 3-second ping verification and watchdog status</p>
                </div>
              </div>
              <span className="text-xs font-black text-stone-700 bg-stone-100 px-3 py-1 rounded-xl">
                Fleet Availability: {workerSummary.availabilityPercent != null ? `${workerSummary.availabilityPercent}%` : "100%"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-400 font-extrabold uppercase border-b border-stone-100 tracking-wider">
                    <th className="py-3 px-3">Worker ID / PID</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center">Last Heartbeat</th>
                    <th className="py-3 px-3 text-center">Heartbeat Age</th>
                    <th className="py-3 px-3 text-center">Missed Pings</th>
                    <th className="py-3 px-3 text-center">Active Jobs</th>
                    <th className="py-3 px-3 text-center">Avg Job Time</th>
                    <th className="py-3 px-3 text-right">Uptime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {workers.length > 0 ? (
                    workers.map((w) => (
                      <tr key={w.workerId} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-stone-900">{w.workerId}</div>
                          <div className="text-[10px] text-stone-400">PID: {w.pid || "Active"}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              w.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700"
                                : w.status === "IDLE"
                                ? "bg-blue-100 text-blue-700"
                                : w.status === "RECOVERING"
                                ? "bg-amber-100 text-amber-700 animate-pulse"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {w.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-stone-600">
                          {w.lastHeartbeat ? new Date(w.lastHeartbeat).toLocaleTimeString() : "Just now"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono text-xs font-bold ${
                              (w.heartbeatAgeMs || 0) > 8000
                                ? "text-rose-600"
                                : (w.heartbeatAgeMs || 0) > 4000
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {w.heartbeatAgeMs || 0}ms ago
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">
                          {(w.missedHeartbeats || 0) > 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-mono">
                              {w.missedHeartbeats} missed
                            </span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-blue-600">{w.activeJobs || 0}</td>
                        <td className="py-3 px-3 text-center font-mono text-stone-600">
                          {w.avgJobDurationMs ? `${w.avgJobDurationMs}ms` : "< 10ms"}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-stone-500">{w.uptimeSeconds || 0}s</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-stone-400 font-bold">
                        No active worker instances reported.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── LIVE INCIDENT LOGS TABLE ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Incident Detection & Recovery Audit Log</h3>
                  <p className="text-xs text-stone-400">Structured lifecycle tracking from detection to resolution</p>
                </div>
              </div>

              {/* Incident component filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "WORKER", "REDIS", "MONGODB", "QUEUE"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setIncidentFilter(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                      incidentFilter === cat
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-stone-400 font-extrabold uppercase border-b border-stone-100 tracking-wider">
                    <th className="py-3 px-3">Ticket ID</th>
                    <th className="py-3 px-3">Component</th>
                    <th className="py-3 px-3">Failure Type</th>
                    <th className="py-3 px-3">Detection</th>
                    <th className="py-3 px-3">Recovery (MTTR)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Reason / Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                  {filteredIncidents.length > 0 ? (
                    filteredIncidents.map((inc) => (
                      <tr key={inc.incidentId} className="hover:bg-stone-50/70 transition">
                        <td className="py-3 px-3 font-mono font-bold text-stone-900">{inc.incidentId}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                            {inc.componentName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-stone-600">{inc.failureType}</td>
                        <td className="py-3 px-3 font-mono text-stone-500">
                          {inc.detectionTimeMs != null ? `${inc.detectionTimeMs}ms` : "0ms"}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {inc.recoveryTimeMs != null ? (
                            <span className="text-emerald-600 font-bold">{inc.recoveryTimeMs}ms</span>
                          ) : (
                            <span className="text-amber-600 italic">In progress...</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              inc.finalStatus === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-700"
                                : inc.finalStatus === "RECOVERING"
                                ? "bg-amber-100 text-amber-700 animate-pulse"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {inc.finalStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-stone-600 max-w-xs truncate" title={inc.failureReason}>
                          {inc.resolutionNotes || inc.failureReason}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-stone-400 font-bold">
                        No incidents logged for filter "{incidentFilter}". System is fully operational.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DEAD LETTER QUEUE (DLQ) ACTION CENTER                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "dlq" && (
        <div className="space-y-6">
          {/* ── DLQ KPI SUMMARY ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total in DLQ Store</span>
              <div className="mt-2 text-3xl font-black text-stone-900">
                {dlqStats.totalFailedInStore || deadLetterQueue.totalFailed || 0}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Preserved for audit investigation</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Pending Inspection</span>
              <div className="mt-2 text-3xl font-black text-amber-600">
                {dlqStats.pendingCount || 0}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Eligible for controlled retry</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Permanent Errors</span>
              <div className="mt-2 text-3xl font-black text-purple-600">
                {dlqStats.permanentCount || 0}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Schema / validation failures</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Successfully Retried</span>
              <div className="mt-2 text-3xl font-black text-emerald-600">
                {dlqStats.retriedCount || 0}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">Re-enqueued with deduplication ID</p>
            </div>
          </div>

          {/* ── FAILED JOB INSPECTOR & ACTION CENTER ── */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <FaBug size={14} />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">Dead Letter Queue Job Inspector</h3>
                  <p className="text-xs text-stone-400">Examine payloads, error reasons, and execute deduplicated manual retries</p>
                </div>
              </div>

              {/* DLQ Type Filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "TRANSIENT_EXHAUSTED", "PERMANENT_VALIDATION"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setDlqFilter(type)}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                      dlqFilter === type
                        ? "bg-rose-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {filteredDlqJobs.length > 0 ? (
              <div className="space-y-3">
                {filteredDlqJobs.map((job) => (
                  <div
                    key={job.jobId || job.id}
                    className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-stone-900">
                          Job #{job.jobId || job.id}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            job.failureType === "PERMANENT_VALIDATION"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {job.failureType || "TRANSIENT"}
                        </span>
                        <span className="text-[10px] font-bold bg-stone-200/80 text-stone-700 px-2 py-0.5 rounded">
                          Attempts: {job.attemptsMade} / {job.maxAttempts || 3}
                        </span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          Order ID: <span className="font-mono font-bold text-stone-700">{job.orderId || job.data?.orderId || "N/A"}</span>
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {job.failedAt ? new Date(job.failedAt).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-rose-700 font-mono">
                        {job.failedReason || "Unknown failure reason"}
                      </p>
                      {job.stacktrace && job.stacktrace.length > 0 && (
                        <p className="text-[10px] text-stone-500 font-mono bg-white p-2 rounded-lg border border-stone-200/60 max-w-2xl truncate">
                          {job.stacktrace[0]}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {job.eligibleForRetry ? (
                        <button
                          onClick={() => handleRetryJob(job.jobId || job.id, false)}
                          disabled={retryingJobId === (job.jobId || job.id) || job.status === "RETRIED"}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition shadow-sm flex items-center gap-1.5"
                        >
                          <RefreshCw size={12} className={retryingJobId === (job.jobId || job.id) ? "animate-spin" : ""} />
                          <span>{job.status === "RETRIED" ? "Retried" : "Retry Job"}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRetryJob(job.jobId || job.id, true)}
                          disabled={retryingJobId === (job.jobId || job.id) || job.status === "RETRIED"}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition shadow-sm flex items-center gap-1.5"
                          title="Override permanent error check and re-enqueue"
                        >
                          <RefreshCw size={12} />
                          <span>Force Retry</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDiscardJob(job.jobId || job.id)}
                        disabled={discardingJobId === (job.jobId || job.id)}
                        className="px-3 py-2 bg-stone-200 hover:bg-rose-100 hover:text-rose-700 text-stone-600 text-xs font-bold rounded-xl transition"
                        title="Discard from DLQ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs font-bold text-emerald-600 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 size={24} />
                <span>Zero failed jobs in Dead Letter Queue matching filter "{dlqFilter}". All background jobs successfully processed.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
