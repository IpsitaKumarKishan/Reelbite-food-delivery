import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Nav from "../components/Nav";
import { serverUrl } from "../App";
import { setUserData } from "../redux/userSlice";
import {
  FaShieldHalved,
  FaCoins,
  FaMoneyBillTrendUp,
  FaStore,
  FaMotorcycle,
  FaUsers,
  FaArrowTrendUp,
  FaCheck,
  FaBan,
  FaRotateRight,
  FaMagnifyingGlass,
  FaTriangleExclamation,
  FaReceipt,
  FaBuilding,
  FaChartPie,
  FaUserGear,
  FaCircleCheck,
  FaTrashCan,
} from "react-icons/fa6";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview"); // overview, shops, users, disputes
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [shops, setShops] = useState([]);
  const [shopFilter, setShopFilter] = useState(searchParams.get("filter") || "all");
  const [shopSearch, setShopSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "shops", "users", "disputes"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const filterParam = searchParams.get("filter");
    if (filterParam) {
      setShopFilter(filterParam);
    }
  }, [searchParams]);

  // Fetch all admin data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [metricsRes, shopsRes, usersRes, disputesRes] = await Promise.all([
        axios.get(`${serverUrl}/api/admin/metrics`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/shops`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/users`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/disputes`, { withCredentials: true }),
      ]);

      setMetrics(metricsRes.data);
      setShops(shopsRes.data);
      setUsers(usersRes.data);
      setDisputes(disputesRes.data);
    } catch (err) {
      console.error("Admin data fetch error:", err);
      if (err.response?.status === 403) {
        toast.error("Access denied. Super Admin role required.");
      } else {
        toast.error("Failed to load platform data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      if (userData.role === "admin") {
        fetchAllData();
      } else {
        navigate("/");
      }
    }
  }, [userData, navigate]);

  // Handler to toggle shop status
  const handleUpdateShopStatus = async (shopId, newStatus) => {
    try {
      await axios.patch(
        `${serverUrl}/api/admin/shops/${shopId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success(`Restaurant status updated to ${newStatus}`);
      setShops((prev) =>
        prev.map((s) => (s._id === shopId ? { ...s, status: newStatus, isApproved: newStatus === "active" } : s))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update shop status");
    }
  };

  // Handler to settle shop payouts
  const handleSettlePayout = async (shopId, shopName) => {
    try {
      const res = await axios.post(
        `${serverUrl}/api/admin/shops/${shopId}/settle`,
        {},
        { withCredentials: true }
      );
      toast.success(res.data.message || `Settled payouts for ${shopName}`);
      fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to settle payouts");
    }
  };

  // Handler to update user role
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await axios.patch(
        `${serverUrl}/api/admin/users/${userId}/role`,
        { role: newRole },
        { withCredentials: true }
      );
      toast.success(`User role updated to ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      if (userId === userData?._id) {
        dispatch(setUserData({ ...userData, role: newRole }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user role");
    }
  };

  // Handler to update user status (active/suspended)
  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      const res = await axios.patch(
        `${serverUrl}/api/admin/users/${userId}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success(res.data.message || `User status changed to ${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user status");
    }
  };

  // Handler to permanently delete/remove user
  const handleDeleteUser = async (userId, userName) => {
    if (userId === userData?._id) {
      toast.error("You cannot delete your own admin account.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to permanently remove "${userName || "this user"}"? This will delete their account and history.`);
    if (!confirmed) return;

    try {
      const res = await axios.delete(
        `${serverUrl}/api/admin/users/${userId}`,
        { withCredentials: true }
      );
      toast.success(res.data.message || "User account removed successfully");
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  // If user is not admin, immediately redirect to home
  if (userData?.role !== "admin") {
    return null;
  }

  // Filtered Shops
  const filteredShops = shops.filter((s) => {
    const matchesStatus = shopFilter === "all" || s.status === shopFilter || (shopFilter === "active" && s.isApproved);
    const matchesSearch =
      !shopSearch.trim() ||
      s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.city.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.owner?.fullName?.toLowerCase().includes(shopSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === "all" ||
      (userStatusFilter === "suspended" && u.status === "suspended") ||
      (userStatusFilter === "active" && u.status !== "suspended");
    const matchesSearch =
      !userSearch.trim() ||
      u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.mobile?.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 pb-28 md:pb-20">
      <Nav />

      <main className="max-w-7xl mx-auto pt-24 px-3 sm:px-6 lg:px-8 space-y-6">
        {/* Governance Command Bar */}
        <div className="bg-stone-900 text-white rounded-3xl p-4 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-stone-800">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#ff5200] to-amber-500 flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg shrink-0">
              <FaShieldHalved />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight">Super Admin Command Center</h1>
                <span className="bg-[#ff5200]/20 text-[#ff5200] border border-[#ff5200]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Governance Live
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Multi-vendor marketplace oversight • Platform GMV • Restaurant verification & fraud auditing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchAllData}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-2xl text-xs font-bold transition"
            >
              <FaRotateRight size={12} className={loading ? "animate-spin" : ""} />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Ribbon */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* KPI 1: Gross Merchandise Value */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Platform GMV</span>
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-[#ff5200] flex items-center justify-center">
                  <FaCoins size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  ₹{metrics.overview.gmv.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-600">
                  <FaArrowTrendUp size={11} />
                  <span>Cumulative turnover</span>
                </div>
              </div>
            </div>

            {/* KPI 2: Platform Revenue (Commissions) */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Platform Net Cut</span>
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FaMoneyBillTrendUp size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  ₹{metrics.overview.platformRevenue.toLocaleString()}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-500">
                  <span>15-20% fee + platform charge</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Total Orders */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Total Orders</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FaReceipt size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  {metrics.overview.totalOrders}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-500">
                  <span className="text-emerald-600 font-extrabold">{metrics.overview.deliveredOrdersCount} delivered</span>
                  <span className="text-rose-500 ml-1">({metrics.overview.cancelledOrdersCount} cancelled)</span>
                </div>
              </div>
            </div>

            {/* KPI 4: Ecosystem Users */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm relative overflow-hidden group hover:border-[#ff5200]/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Registered Accounts</span>
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <FaUsers size={16} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  {metrics.userBreakdown.total}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-stone-500">
                  <span>{metrics.shopBreakdown.total} shops</span> • <span>{metrics.userBreakdown.deliveryPartners} riders</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 shrink-0 ${
              activeTab === "overview"
                ? "bg-[#ff5200] text-white shadow-md shadow-orange-500/20"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <FaChartPie size={14} />
            <span>Platform Financials & Radar</span>
          </button>

          <button
            onClick={() => setActiveTab("shops")}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 shrink-0 ${
              activeTab === "shops"
                ? "bg-[#ff5200] text-white shadow-md shadow-orange-500/20"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <FaStore size={14} />
            <span>Restaurants Governance ({shops.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 shrink-0 ${
              activeTab === "users"
                ? "bg-[#ff5200] text-white shadow-md shadow-orange-500/20"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <FaUserGear size={14} />
            <span>Fleet & Users Directory ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("disputes")}
            className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 shrink-0 ${
              activeTab === "disputes"
                ? "bg-[#ff5200] text-white shadow-md shadow-orange-500/20"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <FaTriangleExclamation size={14} />
            <span>Disputes & Refunds ({disputes.length})</span>
          </button>
        </div>

        {/* TAB 1: Platform Financials & City Radar */}
        {activeTab === "overview" && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Platform Order Volume Trend */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">7-Day Platform GMV Trend</h3>
                  <p className="text-xs text-stone-500 font-medium">Daily platform sales and order velocity</p>
                </div>
                <span className="text-xs font-bold text-stone-700 bg-stone-100 px-3 py-1 rounded-full">
                  AOV: ₹{metrics.overview.averageOrderValue}
                </span>
              </div>

              {/* 7-day Bar/Grid representation */}
              <div className="space-y-3.5 my-3">
                {metrics.sevenDayTrend.map((d, i) => {
                  const maxGmv = Math.max(...metrics.sevenDayTrend.map((t) => t.gmv), 100);
                  const pct = Math.max((d.gmv / maxGmv) * 100, 5);
                  return (
                    <div key={i} className="flex items-center gap-3 text-xs">
                      <span className="w-12 font-bold text-stone-500 text-right">{d.day}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden flex items-center">
                        <div
                          className="h-full bg-gradient-to-r from-[#ff5200] to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-20 font-black text-stone-900 text-right">
                        ₹{d.gmv.toLocaleString()}
                      </span>
                      <span className="w-14 text-[11px] text-stone-400 text-right">
                        ({d.orders} ord)
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>Total Delivery Charges Collected: <strong className="text-stone-800">₹{metrics.overview.totalDeliveryFees.toLocaleString()}</strong></span>
                <span>Platform Fees: <strong className="text-stone-800">₹{metrics.overview.totalPlatformFees.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* City Performance Radar */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">City Demand Radar</h3>
                  <p className="text-xs text-stone-500 font-medium">Top performing metropolitan markets</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff5200] flex items-center justify-center">
                  <FaBuilding size={14} />
                </div>
              </div>

              <div className="divide-y divide-stone-100 mt-2 flex-1 flex flex-col justify-center">
                {metrics.cityRadar.length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">No city orders recorded yet.</p>
                ) : (
                  metrics.cityRadar.map((city, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-xs font-black text-stone-400">{idx + 1}</span>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-stone-800">{city.city}</div>
                          <div className="text-[11px] text-stone-400">{city.orders} orders processed</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-stone-900">
                          ₹{city.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-[11px] text-stone-400 text-center pt-3 border-t border-stone-100">
                Data used for localized rider fleet allocation
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Restaurant Governance & Approvals */}
        {activeTab === "shops" && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Restaurant Partner Registry</h3>
                <p className="text-xs text-stone-500 font-medium">Verify kitchens, audit ratings, and settle weekly payouts</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                  <FaMagnifyingGlass size={12} className="text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search restaurant or city..."
                    value={shopSearch}
                    onChange={(e) => setShopSearch(e.target.value)}
                    className="bg-transparent text-xs font-semibold outline-none w-40"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="bg-stone-100 text-xs font-bold text-stone-700 px-3 py-2 rounded-xl border border-stone-200 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active & Approved</option>
                  <option value="pending">Pending Review</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Restaurant Cards / Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-extrabold">Restaurant</th>
                    <th className="pb-3 font-extrabold">Owner Contact</th>
                    <th className="pb-3 font-extrabold">City</th>
                    <th className="pb-3 font-extrabold">Rating & Menu</th>
                    <th className="pb-3 font-extrabold">Delivered Sales</th>
                    <th className="pb-3 font-extrabold">Status</th>
                    <th className="pb-3 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        No restaurants matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredShops.map((shop) => (
                      <tr key={shop._id} className="hover:bg-stone-50/70 transition">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            {shop.image ? (
                              <img
                                src={shop.image}
                                alt={shop.name}
                                className="w-10 h-10 rounded-xl object-cover border border-stone-100 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff5200] flex items-center justify-center shrink-0">
                                <FaStore size={16} />
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-stone-900">{shop.name}</div>
                              <div className="text-[10px] text-stone-400 truncate max-w-[160px]">{shop.address}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4">
                          <div className="font-bold text-stone-800">{shop.owner?.fullName || "Owner"}</div>
                          <div className="text-[11px] text-stone-400">{shop.owner?.mobile || shop.owner?.email || "-"}</div>
                        </td>

                        <td className="py-4 font-semibold text-stone-700">{shop.city}</td>

                        <td className="py-4">
                          <div className="font-bold text-amber-600">★ {shop.rating?.average || 4.2}</div>
                          <div className="text-[11px] text-stone-400">{shop.itemCount} items listed</div>
                        </td>

                        <td className="py-4">
                          <div className="font-black text-stone-900">₹{shop.totalRevenue.toLocaleString()}</div>
                          <div className="text-[11px] text-stone-400">{shop.completedOrders} orders</div>
                        </td>

                        <td className="py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              shop.status === "active" || shop.isApproved
                                ? "bg-emerald-100 text-emerald-700"
                                : shop.status === "suspended"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {shop.status || "active"}
                          </span>
                        </td>

                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {shop.status === "suspended" ? (
                              <button
                                onClick={() => handleUpdateShopStatus(shop._id, "active")}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition"
                              >
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateShopStatus(shop._id, "suspended")}
                                className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold hover:bg-rose-100 transition"
                              >
                                Suspend
                              </button>
                            )}

                            <button
                              onClick={() => handleSettlePayout(shop._id, shop.name)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold transition"
                              title="Settle all delivered orders for this shop"
                            >
                              Settle Payout
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Fleet & Users Directory */}
        {activeTab === "users" && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Fleet & Account Management</h3>
                <p className="text-xs text-stone-500 font-medium">Reassign roles, audit delivery partners, and promote admins</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                  <FaMagnifyingGlass size={12} className="text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, phone..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-transparent text-xs font-semibold outline-none w-44"
                  />
                </div>

                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-stone-100 text-xs font-bold text-stone-700 px-3 py-2 rounded-xl border border-stone-200 outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Consumers</option>
                  <option value="owner">Restaurant Owners</option>
                  <option value="deliveryBoy">Delivery Partners</option>
                  <option value="admin">Super Admins</option>
                </select>

                {/* Status Filter */}
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-stone-100 text-xs font-bold text-stone-700 px-3 py-2 rounded-xl border border-stone-200 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-extrabold">User</th>
                    <th className="pb-3 font-extrabold">Contact Info</th>
                    <th className="pb-3 font-extrabold">Role</th>
                    <th className="pb-3 font-extrabold">Status</th>
                    <th className="pb-3 font-extrabold">Activity</th>
                    <th className="pb-3 font-extrabold">Joined Date</th>
                    <th className="pb-3 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        No users found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 font-bold text-stone-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff5200] to-amber-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                              {u.fullName?.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[130px]">{u.fullName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 text-stone-600">
                          <div className="truncate max-w-[160px]">{u.email}</div>
                          <div className="text-[11px] text-stone-400">{u.mobile}</div>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : u.role === "owner"
                                ? "bg-orange-100 text-[#ff5200]"
                                : u.role === "deliveryBoy"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              u.status === "suspended"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {u.status || "active"}
                          </span>
                        </td>

                        <td className="py-3.5">
                          {u.isOnline ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          ) : (
                            <span className="text-stone-400">Offline</span>
                          )}
                        </td>

                        <td className="py-3.5 text-stone-400 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Role Select */}
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u._id, e.target.value)}
                              className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] px-2 py-1 rounded-lg border border-stone-200 outline-none cursor-pointer"
                            >
                              <option value="user">Consumer</option>
                              <option value="owner">Restaurant</option>
                              <option value="deliveryBoy">Rider</option>
                              <option value="admin">Admin</option>
                            </select>

                            {/* Suspend or Reactivate Button */}
                            {u._id !== userData?._id && (
                              u.status === "suspended" ? (
                                <button
                                  onClick={() => handleUpdateUserStatus(u._id, "active")}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition whitespace-nowrap"
                                  title="Reactivate user access"
                                >
                                  Reactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateUserStatus(u._id, "suspended")}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition whitespace-nowrap"
                                  title="Suspend user access"
                                >
                                  Suspend
                                </button>
                              )
                            )}

                            {/* Remove / Delete Button */}
                            {u._id !== userData?._id && (
                              <button
                                onClick={() => handleDeleteUser(u._id, u.fullName)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Remove user permanently"
                              >
                                <FaTrashCan size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Disputes & Refunds */}
        {activeTab === "disputes" && (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">Dispute Resolution & Refund Ledger</h3>
              <p className="text-xs text-stone-500 font-medium">Audit cancellation reasons, Razorpay refund IDs, and transaction reversals</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-extrabold">Order ID</th>
                    <th className="pb-3 font-extrabold">Customer</th>
                    <th className="pb-3 font-extrabold">Restaurant</th>
                    <th className="pb-3 font-extrabold">Cancellation Reason</th>
                    <th className="pb-3 font-extrabold">Payment & Amount</th>
                    <th className="pb-3 font-extrabold">Refund Status</th>
                    <th className="pb-3 font-extrabold text-right">Refund Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {disputes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        No cancellations or disputes recorded. Platform operations are running cleanly!
                      </td>
                    </tr>
                  ) : (
                    disputes.map((d) => (
                      <tr key={d.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-3.5 font-mono text-[11px] text-stone-500">
                          #{d.id?.slice(-6).toUpperCase()}
                        </td>

                        <td className="py-3.5 font-bold text-stone-800">
                          <div>{d.customerName}</div>
                          <div className="text-[11px] text-stone-400">{d.customerMobile || d.customerEmail}</div>
                        </td>

                        <td className="py-3.5 font-semibold text-stone-700">{d.shopName}</td>

                        <td className="py-3.5 text-stone-600 max-w-[200px]">
                          <div className="font-semibold text-rose-600">{d.reason}</div>
                          <div className="text-[10px] text-stone-400">Cancelled by: {d.cancelledBy}</div>
                        </td>

                        <td className="py-3.5">
                          <div className="font-black text-stone-900">₹{d.totalAmount}</div>
                          <div className="text-[10px] uppercase font-bold text-stone-400">{d.paymentMethod}</div>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              d.refundStatus === "processed"
                                ? "bg-emerald-100 text-emerald-700"
                                : d.refundStatus === "initiated"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {d.refundStatus}
                          </span>
                        </td>

                        <td className="py-3.5 text-right font-mono text-[11px] text-stone-400">
                          {d.refundId || d.razorpayPaymentId || "Auto Reversal"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
