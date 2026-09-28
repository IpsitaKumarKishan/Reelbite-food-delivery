import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Nav from "../components/Nav";
import { serverUrl } from "../App";
import {
  FaChartLine,
  FaMoneyBillTrendUp,
  FaReceipt,
  FaCheck,
  FaXmark,
  FaUtensils,
  FaFilm,
  FaArrowTrendUp,
  FaClock,
  FaStore,
  FaRotateRight,
  FaEye,
  FaHeart,
  FaArrowLeft,
} from "react-icons/fa6";
import toast from "react-hot-toast";

export default function OwnerAnalytics() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview, dishes, reels, hours
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/analytics/owner`, {
        withCredentials: true,
      });
      setData(res.data);
    } catch (err) {
      console.error("Fetch owner analytics error:", err);
      toast.error(err.response?.data?.message || "Failed to load restaurant analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-800">
        <Nav />
        <div className="pt-28 flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-[#ff5200] animate-spin" />
          <p className="text-sm font-bold text-stone-500">Calculating kitchen analytics...</p>
        </div>
      </div>
    );
  }

  if (!data?.hasShop) {
    return (
      <div className="min-h-screen bg-[#faf8f5] text-stone-800">
        <Nav />
        <div className="max-w-xl mx-auto pt-36 px-4 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto text-[#ff5200] mb-5 shadow-inner">
            <FaStore size={36} />
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">No Restaurant Shop Found</h2>
          <p className="text-stone-500 text-sm mt-2 mb-6">
            Register your restaurant to start receiving customer orders, monitoring daily revenue, and tracking dish popularity.
          </p>
          <button
            onClick={() => navigate("/create-edit-shop")}
            className="bg-gradient-to-r from-[#ff5200] to-amber-500 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg hover:shadow-orange-500/25 transition active:scale-95"
          >
            Create Restaurant Profile
          </button>
        </div>
      </div>
    );
  }

  const { stats, dailyTrends = [], hourlyHeatmap = [], topDishes = [], reelStats, shop } = data;

  // Max revenue in dailyTrends for SVG scaling
  const maxDailyRevenue = Math.max(...dailyTrends.map((d) => d.revenue), 100);
  const maxHourlyOrders = Math.max(...hourlyHeatmap.map((h) => h.orders), 1);

  // Generate SVG coordinates for Area Chart
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 35;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const points = dailyTrends.map((d, i) => {
    const x = paddingX + (i / Math.max(dailyTrends.length - 1, 1)) * chartW;
    const y = paddingY + chartH - (d.revenue / maxDailyRevenue) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.length > 0
    ? points.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
        ""
      )
    : "";

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingY + chartH} L ${points[0].x} ${paddingY + chartH} Z`
    : "";

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 pb-28 md:pb-20">
      <Nav />

      <main className="max-w-7xl mx-auto pt-24 px-3 sm:px-6 lg:px-8 space-y-6">
        {/* Header Ribbon */}
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-stone-100 hover:bg-stone-200 rounded-2xl text-stone-700 transition"
              title="Go back"
            >
              <FaArrowLeft size={16} />
            </button>
            {shop.image ? (
              <img
                src={shop.image}
                alt={shop.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-stone-100 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-100 text-[#ff5200] flex items-center justify-center shrink-0">
                <FaStore size={24} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">{shop.name}</h1>
                <span className="bg-emerald-100 text-emerald-700 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Kitchen
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {shop.city} • Platform Commission: <span className="font-bold text-stone-700">{shop.commissionRate}%</span> • Rating: <span className="font-bold text-amber-500">★ {shop.rating?.average || 4.2}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-2xl text-xs font-bold text-stone-700 transition"
            >
              <FaRotateRight size={12} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate("/my-orders")}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#ff5200] hover:bg-[#e64526] text-white rounded-2xl text-xs font-extrabold shadow-md shadow-orange-500/20 transition active:scale-95"
            >
              <FaReceipt size={13} />
              <span>Live Orders</span>
            </button>
          </div>
        </div>

        {/* Executive Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Today Revenue */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Today's Sales</span>
              <div className="w-9 h-9 rounded-2xl bg-orange-100 text-[#ff5200] flex items-center justify-center group-hover:scale-110 transition">
                <FaMoneyBillTrendUp size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                ₹{stats.todayRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-600">
                <FaArrowTrendUp size={11} />
                <span>Real-time earnings</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Net Revenue */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Sales</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                <FaChartLine size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                ₹{stats.totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-500">
                <span>AOV:</span>
                <span className="font-extrabold text-stone-800">₹{stats.averageOrderValue}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Delivered Orders */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Delivered Orders</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                <FaCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                {stats.deliveredOrders}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-500">
                <span>Total:</span>
                <span className="font-extrabold text-stone-800">{stats.totalOrders}</span>
                <span className="text-rose-500 ml-1">({stats.cancelledOrders} cancelled)</span>
              </div>
            </div>
          </div>

          {/* Card 4: Unsettled Payout */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Unsettled Balance</span>
              <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                <FaReceipt size={16} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                ₹{Math.round(stats.pendingPayout).toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-500">
                <span>Settled:</span>
                <span className="font-extrabold text-emerald-600">₹{Math.round(stats.settledPayout).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Charts & Heatmaps Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: 7-Day Revenue Area Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">7-Day Revenue Trajectory</h3>
                <p className="text-xs text-stone-500 font-medium">Daily restaurant earnings over the past week</p>
              </div>
              <span className="text-xs font-black text-[#ff5200] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                Peak: ₹{maxDailyRevenue.toLocaleString()}
              </span>
            </div>

            {/* Responsive SVG Area Chart */}
            <div className="relative w-full h-[220px] select-none">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5200" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ff5200" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#e7e5e4" strokeDasharray="4 4" />
                <line x1={paddingX} y1={paddingY + chartH / 2} x2={svgWidth - paddingX} y2={paddingY + chartH / 2} stroke="#e7e5e4" strokeDasharray="4 4" />
                <line x1={paddingX} y1={paddingY + chartH} x2={svgWidth - paddingX} y2={paddingY + chartH} stroke="#e7e5e4" />

                {/* Area and Line */}
                {points.length > 1 && (
                  <>
                    <path d={areaD} fill="url(#areaGradient)" />
                    <path d={pathD} fill="none" stroke="#ff5200" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.date === p.date ? "7" : "4.5"}
                      fill="#ffffff"
                      stroke="#ff5200"
                      strokeWidth="3"
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    <text
                      x={p.x}
                      y={paddingY + chartH + 18}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-stone-500"
                    >
                      {p.day}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip Popover */}
              {hoveredPoint && (
                <div
                  className="absolute pointer-events-none bg-stone-900 text-white px-3 py-1.5 rounded-xl shadow-xl text-xs z-20 flex flex-col gap-0.5 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                  }}
                >
                  <span className="font-extrabold text-[#ff5200]">₹{hoveredPoint.revenue.toLocaleString()}</span>
                  <span className="text-[10px] text-stone-400">{hoveredPoint.orders} orders on {hoveredPoint.date}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-400 border-t border-stone-100 pt-3 mt-2">
              <span>Updated automatically with delivered orders</span>
              <span className="font-bold text-stone-700">7-Day Total: ₹{dailyTrends.reduce((s, d) => s + d.revenue, 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Right Col: Peak Order Hours Heatmap */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Peak Order Hours</h3>
                <p className="text-xs text-stone-500 font-medium">Hourly order intensity across 24h</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff5200] flex items-center justify-center">
                <FaClock size={14} />
              </div>
            </div>

            {/* Vertical Bar Chart (Hours 8 AM to 11 PM) */}
            <div className="space-y-2 mt-3 flex-1 flex flex-col justify-center">
              {hourlyHeatmap
                .filter((h) => h.hour >= 8 && h.hour <= 23)
                .map((h) => {
                  const pct = Math.max((h.orders / maxHourlyOrders) * 100, 4);
                  const isPeak = h.orders === maxHourlyOrders && h.orders > 0;
                  return (
                    <div key={h.hour} className="flex items-center gap-2.5 text-xs">
                      <span className="w-12 text-stone-500 font-semibold shrink-0 text-right">{h.label}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-3.5 overflow-hidden flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPeak
                              ? "bg-gradient-to-r from-[#ff5200] to-rose-500"
                              : h.orders > 0
                              ? "bg-orange-400"
                              : "bg-transparent"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`w-6 font-extrabold text-right shrink-0 ${isPeak ? "text-[#ff5200]" : "text-stone-700"}`}>
                        {h.orders}
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="text-[11px] text-stone-400 text-center mt-3 pt-3 border-t border-stone-100">
              Peak slot helps optimize kitchen prep staff
            </div>
          </div>
        </div>

        {/* Bottom Section: Top Selling Dishes & Reel Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Dishes */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Top-Selling Dishes</h3>
                <p className="text-xs text-stone-500 font-medium">Ranked by order volume & total sales</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FaUtensils size={13} />
              </div>
            </div>

            {topDishes.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-xs">
                No dish sales recorded yet. Once orders are delivered, best-sellers will appear here.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {topDishes.map((dish, idx) => (
                  <div key={dish.id || idx} className="py-3.5 flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-xs font-black text-stone-400">{idx + 1}</span>
                      {dish.image ? (
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-11 h-11 rounded-xl object-cover border border-stone-100 shrink-0 group-hover:scale-105 transition"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#ff5200] flex items-center justify-center shrink-0">
                          <FaUtensils size={13} />
                        </div>
                      )}
                      <div className="truncate">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-800 truncate group-hover:text-[#ff5200] transition">
                          {dish.name}
                        </h4>
                        <p className="text-[11px] text-stone-400">
                          ₹{dish.price} each • <span className="text-stone-700 font-bold">{dish.quantity} sold</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black text-stone-900">
                        ₹{dish.revenue.toLocaleString()}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Gross
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reel Conversion & Video Reach */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Reel Content Engagement</h3>
                  <p className="text-xs text-stone-500 font-medium">Video views and food discovery conversion</p>
                </div>
                <button
                  onClick={() => navigate("/owner/reels")}
                  className="text-xs font-bold text-[#ff5200] hover:underline"
                >
                  Manage Reels →
                </button>
              </div>

              {/* Reel Metric Pills */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-stone-50 rounded-2xl p-3 text-center border border-stone-100">
                  <div className="text-lg font-black text-stone-900">{reelStats?.totalReels || 0}</div>
                  <div className="text-[11px] font-semibold text-stone-400">Total Reels</div>
                </div>
                <div className="bg-stone-50 rounded-2xl p-3 text-center border border-stone-100">
                  <div className="text-lg font-black text-[#ff5200] flex items-center justify-center gap-1">
                    <FaEye size={12} />
                    <span>{reelStats?.totalViews || 0}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-stone-400">Video Views</div>
                </div>
                <div className="bg-stone-50 rounded-2xl p-3 text-center border border-stone-100">
                  <div className="text-lg font-black text-rose-500 flex items-center justify-center gap-1">
                    <FaHeart size={12} />
                    <span>{reelStats?.totalLikes || 0}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-stone-400">Total Likes</div>
                </div>
              </div>

              {/* Top Performing Reels List */}
              {reelStats?.reels?.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  No video reels published yet. Upload your food videos in the Reels section to drive discovery!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {reelStats?.reels?.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="bg-stone-900 rounded-2xl overflow-hidden relative group aspect-[9/12] shadow-sm cursor-pointer"
                      onClick={() => navigate("/reels")}
                    >
                      {r.thumbnailUrl ? (
                        <img
                          src={r.thumbnailUrl}
                          alt="Reel"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-600 bg-stone-800">
                          <FaFilm size={24} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5">
                        <p className="text-[11px] font-bold text-white line-clamp-1">{r.caption || "Reel"}</p>
                        <div className="flex items-center justify-between text-[10px] text-stone-300 mt-1">
                          <span className="flex items-center gap-1 font-bold">
                            <FaEye size={10} /> {r.views}
                          </span>
                          <span className="flex items-center gap-1 text-rose-400 font-bold">
                            <FaHeart size={10} /> {r.likesCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>View-to-cart conversion tracked via Reel feed</span>
              <button
                onClick={() => navigate("/owner/reels")}
                className="text-xs font-bold text-[#ff5200] hover:text-[#e64526] flex items-center gap-1"
              >
                + Upload New Reel
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
