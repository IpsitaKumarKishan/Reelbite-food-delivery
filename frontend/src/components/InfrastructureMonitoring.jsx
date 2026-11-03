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
  FaShieldHalved
} from "react-icons/fa6";

export default function InfrastructureMonitoring() {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Controller control station states
  const [controlMode, setControlMode] = useState("adaptive");
  const [fixedConcurrency, setFixedConcurrency] = useState(5);
  const [updatingMode, setUpdatingMode] = useState(false);

  // Load simulator state
  const [burstCount, setBurstCount] = useState(15);
  const [simulating, setSimulating] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState(null);

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

  // Periodic polling interval
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

  const handleRetryJob = async (jobId) => {
    setRetryingJobId(jobId);
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/infrastructure/retry/${jobId}`,
        {},
        { withCredentials: true }
      );
      if (res.data.success) {
        toast.success(`Job #${jobId} resubmitted to queue`);
        fetchMetrics(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Retry failed");
    } finally {
      setRetryingJobId(null);
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
    adjustmentLogs = [],
    history = {}
  } = telemetry || {};

  const queueCounts = queue.counts || {};
  const queuePerf = queue.performance || {};
  const cpu = resources.cpu || {};
  const memory = resources.memory || {};

  const isAdaptive = controller.mode === "adaptive";
  const inCooldown = controller.inCooldown;

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
                Resource-Aware Adaptive Concurrency
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
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Autonomous vertical worker concurrency adjustment driven by queue depth, CPU pressure, and memory limits.
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
                workerSummary.health === "HEALTHY" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>Workers: {workerSummary.health || "OK"}</span>
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

        {/* KPI 5: Memory Footprint & DLQ */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/50 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Memory & Reliability
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

      {/* ── INTERACTIVE EXPERIMENTATION & CONTROLLER COMMAND STATION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: Dynamic vs Fixed Concurrency Control */}
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

          {/* Mode Selector Toggle */}
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
                <span className="text-xs font-extrabold text-stone-900">Fixed Concurrency (Benchmark)</span>
                {controlMode === "fixed" && <FaCircleCheck className="text-blue-600" size={14} />}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Locks concurrency to a constant level for controlled experimentation (Experiment A vs B).
              </p>
            </button>
          </div>

          {/* Fixed Concurrency Presets */}
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

        {/* Panel B: Traffic Surge & Workload Simulation Station */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FaPlay size={14} />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">Workload Spike Simulator</h3>
                <p className="text-xs text-stone-400">Inject synthetic orders to observe live auto-scaling</p>
              </div>
            </div>
            <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
              Live Testing
            </span>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Test the adaptive engine by enqueuing a sudden burst of food order events. Watch the queue backlog rise,
            trigger <strong>CASE 1 (High Headroom)</strong> or <strong>CASE 5 (Trending Growth)</strong>, and observe the
            controller ramp up worker concurrency vertically!
          </p>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-3">
            <span className="text-xs font-bold text-stone-700">Select Burst Volume:</span>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setBurstCount(num)}
                  className={`py-2.5 text-xs font-black rounded-xl transition border ${
                    burstCount === num
                      ? "bg-[#ff5200] text-white border-[#ff5200] shadow-sm"
                      : "bg-white text-stone-700 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  +{num} Orders
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleSimulateBurst(burstCount)}
            disabled={simulating}
            className="w-full py-3 bg-gradient-to-r from-[#ff5200] to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-black rounded-2xl transition shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <FaBolt />
            <span>{simulating ? "Injecting Traffic Spike..." : `Inject ${burstCount} Order Tasks Now`}</span>
          </button>
        </div>
      </div>

      {/* ── VISUAL METRIC TELEMETRY CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Queue Depth Backlog */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-stone-900">Queue Depth Over Time</h3>
              <p className="text-[11px] text-stone-400">Waiting vs Active jobs in recent cycles</p>
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

          {/* SVG Visual Bars / Sparkline */}
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

        {/* Chart 2: Hardware Pressure (CPU & Memory) */}
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

      {/* ── BULLMQ WORKER MATRIX ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <FaServer size={14} />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">Background Worker Node Fleet</h3>
              <p className="text-xs text-stone-400">Active worker processes and vertical concurrency status</p>
            </div>
          </div>
          <span className="text-xs font-black text-stone-700 bg-stone-100 px-3 py-1 rounded-xl">
            {workers.length} Worker Process Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-stone-400 font-extrabold uppercase border-b border-stone-100 tracking-wider">
                <th className="py-3 px-3">Worker ID</th>
                <th className="py-3 px-3">Architecture</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Concurrency</th>
                <th className="py-3 px-3 text-center">Active Jobs</th>
                <th className="py-3 px-3 text-center">Completed</th>
                <th className="py-3 px-3 text-center">Failed</th>
                <th className="py-3 px-3 text-right">Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {workers.length > 0 ? (
                workers.map((w) => (
                  <tr key={w.workerId} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{w.workerId}</td>
                    <td className="py-3 px-3">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        {w.scalingType || "VERTICAL_DYNAMIC_CONCURRENCY"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          w.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : w.status === "IDLE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-stone-900">{w.concurrency}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600">{w.activeJobs || 0}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{w.completedJobs || 0}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">{w.failedJobs || 0}</td>
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

      {/* ── DEAD LETTER QUEUE (DLQ) INSPECTOR ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <FaBug size={14} />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">Dead Letter Queue (DLQ) & Failure Recovery</h3>
              <p className="text-xs text-stone-400">Inspecting permanently failed jobs with retry mechanics</p>
            </div>
          </div>
          <span
            className={`text-xs font-black px-3 py-1 rounded-xl ${
              deadLetterQueue.totalFailed > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {deadLetterQueue.totalFailed || 0} Failed Jobs in DLQ
          </span>
        </div>

        {deadLetterQueue.recentFailedJobs && deadLetterQueue.recentFailedJobs.length > 0 ? (
          <div className="space-y-3">
            {deadLetterQueue.recentFailedJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-stone-900">Job #{job.id}</span>
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                      Attempts: {job.attemptsMade}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      Order: {job.data?.orderId || "N/A"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-rose-700">{job.failedReason || "Unknown error"}</p>
                </div>

                <button
                  onClick={() => handleRetryJob(job.id)}
                  disabled={retryingJobId === job.id}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition shadow-sm shrink-0"
                >
                  {retryingJobId === job.id ? "Retrying..." : "Retry Job"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs font-bold text-emerald-600 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            ✓ Zero jobs in Dead Letter Queue. Fault tolerance and exponential backoff are operating cleanly.
          </div>
        )}
      </div>
    </div>
  );
}

