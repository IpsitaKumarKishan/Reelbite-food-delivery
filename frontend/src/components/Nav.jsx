import React, { useState, useEffect, useRef } from 'react';
import { FaLocationDot, FaPlus, FaFilm, FaUtensils, FaMotorcycle, FaStore, FaHeart, FaGear, FaBell, FaChartLine, FaShieldHalved, FaCoins, FaUsers, FaTriangleExclamation } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { FiShoppingCart } from "react-icons/fi";
import { useDispatch, useSelector } from 'react-redux';
import { RxCross2 } from "react-icons/rx";
import axios from 'axios';
import { serverUrl } from '../App';
import { setSearchItems, setUserData } from '../redux/userSlice';
import { TbReceipt2 } from "react-icons/tb";
import { useNavigate } from 'react-router-dom';

import CuisinePreferencesModal from './modals/CuisinePreferencesModal';
import ProfileSettingsModal from './modals/ProfileSettingsModal';
import SavedAddressesModal from './modals/SavedAddressesModal';
import NotificationDropdown from './NotificationDropdown';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';

function Nav() {
    const { userData, currentCity, cartItems } = useSelector(state => state.user);
    const { myShopData } = useSelector(state => state.owner || {});
    const { unreadCount } = useNotifications();
    const { isConnected } = useSocket();
    const [showInfo, setShowInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [query, setQuery] = useState("");
    const [showCuisineModal, setShowCuisineModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAddressesModal, setShowAddressesModal] = useState(false);
    const [adminBadges, setAdminBadges] = useState({
        pendingShopsCount: 0,
        unresolvedDisputesCount: 0,
        unsettledPayoutsCount: 0,
        totalAlerts: 0,
    });
    const dropdownRef = useRef(null);
    const notifRef = useRef(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (userData?.role === "admin") {
            const fetchAdminBadges = async () => {
                try {
                    const res = await axios.get(`${serverUrl}/api/admin/quick-badges`, { withCredentials: true });
                    if (res.data) setAdminBadges(res.data);
                } catch (err) {
                    // silent fallback
                }
            };
            fetchAdminBadges();
            const interval = setInterval(fetchAdminBadges, 25000);
            return () => clearInterval(interval);
        }
    }, [userData?.role]);

    const handleLogOut = async () => {
        try {
            await axios.get(`${serverUrl}/api/auth/signout`, { withCredentials: true });
            dispatch(setUserData(null));
        } catch (error) {
            console.log(error);
        }
    };

    const handleSearchItems = async () => {
        try {
            const result = await axios.get(`${serverUrl}/api/item/search-items?query=${query}&city=${currentCity}`, { withCredentials: true });
            dispatch(setSearchItems(result.data));
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (query) {
            handleSearchItems();
        } else {
            dispatch(setSearchItems(null));
        }
    }, [query]);

    // Outside click to close avatar dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowInfo(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <>
        <header className='w-full h-[70px] sm:h-[80px] flex items-center justify-between px-3 sm:px-6 lg:px-12 fixed top-0 z-[9999] bg-[#fffcf7]/95 backdrop-blur-md border-b border-amber-900/10 shadow-sm'>

            {/* Mobile Search Overlay */}
            {showSearch && userData?.role === "user" && (
                <div className='w-[92%] h-[60px] bg-white shadow-2xl rounded-2xl items-center gap-3 flex fixed top-[75px] left-[4%] md:hidden z-[9999] border border-amber-500/20 px-3 transition-all'>
                    <div className='flex items-center w-[35%] overflow-hidden gap-1.5 border-r border-stone-200 pr-2 shrink-0'>
                        <FaLocationDot size={14} className="text-[#ff5200] shrink-0" />
                        <div className='truncate text-[11px] font-bold text-stone-700'>{currentCity || "Select City"}</div>
                    </div>
                    <div className='flex-1 flex items-center gap-2'>
                        <IoIosSearch size={18} className='text-[#ff5200] shrink-0' />
                        <input
                            type="text"
                            placeholder='Search food or dishes...'
                            className='text-xs font-semibold text-stone-800 outline-none w-full bg-transparent'
                            onChange={(e) => setQuery(e.target.value)}
                            value={query}
                            autoFocus
                        />
                    </div>
                    <RxCross2 size={18} className="text-stone-400 cursor-pointer" onClick={() => setShowSearch(false)} />
                </div>
            )}

            {/* Brand Logo & Reels Badge */}
            <div className='flex items-center gap-2 sm:gap-4 shrink-0'>
                <h1
                    className='text-xl sm:text-2xl md:text-3xl font-black text-[#ff5200] cursor-pointer tracking-tight flex items-center gap-1.5'
                    onClick={() => navigate("/")}
                >
                    <FaUtensils className="text-[#ff5200] text-lg sm:text-xl" />
                    <span>Reelbite</span>
                </h1>

                {/* Reels Link Button */}
                <button
                    onClick={() => navigate("/reels")}
                    className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-[#ff5200] to-amber-500 text-white px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold shadow hover:scale-105 transition"
                >
                    <FaFilm size={11} className="animate-pulse" />
                    <span>Reels</span>
                </button>

                {/* Owner Analytics Button */}
                {userData?.role === "owner" && (
                    <button
                        onClick={() => navigate("/owner/analytics")}
                        className="hidden sm:flex items-center gap-1.5 bg-orange-100 hover:bg-orange-200 text-[#ff5200] px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold border border-orange-200 shadow-sm transition hover:scale-105"
                    >
                        <FaChartLine size={11} />
                        <span>Analytics</span>
                    </button>
                )}

                {/* Super Admin Command Center Button */}
                {userData?.role === "admin" && (
                    <button
                        onClick={() => navigate("/admin")}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-extrabold shadow-md hover:scale-105 transition"
                    >
                        <FaShieldHalved size={11} />
                        <span>Super Admin</span>
                        {adminBadges.totalAlerts > 0 && (
                            <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm animate-pulse">
                                {adminBadges.totalAlerts}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Central Search Bar (Desktop - Customer Only) */}
            {userData?.role === "user" && (
                <div className='md:w-[40%] lg:w-[36%] h-[44px] bg-stone-100/90 border border-stone-200 shadow-inner rounded-full items-center gap-2 px-3 hidden md:flex focus-within:border-[#ff5200] focus-within:bg-white transition'>
                    <div className='flex items-center w-[32%] overflow-hidden gap-1.5 border-r border-stone-300 pr-2 shrink-0'>
                        <FaLocationDot size={14} className="text-[#ff5200] shrink-0" />
                        <div className='truncate text-xs font-bold text-stone-700'>{currentCity || "City"}</div>
                    </div>
                    <div className='flex-1 flex items-center gap-2'>
                        <IoIosSearch size={18} className='text-[#ff5200] shrink-0' />
                        <input
                            type="text"
                            placeholder='Search delicious food...'
                            className='text-xs font-medium text-stone-800 outline-none w-full bg-transparent'
                            onChange={(e) => setQuery(e.target.value)}
                            value={query}
                        />
                    </div>
                </div>
            )}

            {/* Right Side Navigation Actions */}
            <div className='flex items-center gap-2 sm:gap-3 shrink-0'>

                {/* Mobile Search Icon for Customers */}
                {userData?.role === "user" && (
                    showSearch ? (
                        <button className="p-2 rounded-full hover:bg-stone-100 md:hidden" onClick={() => setShowSearch(false)}>
                            <RxCross2 size={20} className='text-[#ff5200]' />
                        </button>
                    ) : (
                        <button className="p-2 rounded-full hover:bg-stone-100 md:hidden" onClick={() => setShowSearch(true)}>
                            <IoIosSearch size={20} className='text-[#ff5200]' />
                        </button>
                    )
                )}

                {/* Role Specific Quick Action Buttons */}
                {userData?.role === "owner" ? (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                            className='flex items-center gap-1 px-2.5 sm:px-3 py-1.5 cursor-pointer rounded-full bg-[#ff5200]/10 text-[#ff5200] hover:bg-[#ff5200] hover:text-white transition font-bold text-[11px] sm:text-xs'
                            onClick={() => navigate("/owner/reels")}
                        >
                            <FaFilm size={12} />
                            <span className="hidden sm:inline">Reels Hub</span>
                        </button>

                        {myShopData ? (
                            <button
                                className='flex items-center gap-1 px-2.5 sm:px-3 py-1.5 cursor-pointer rounded-full bg-[#ff5200] text-white hover:bg-[#c2410c] transition font-bold text-[11px] sm:text-xs shadow'
                                onClick={() => navigate("/add-item")}
                            >
                                <FaPlus size={11} />
                                <span className="hidden sm:inline">Add Food</span>
                            </button>
                        ) : (
                            <button
                                className='flex items-center gap-1 px-2.5 sm:px-3 py-1.5 cursor-pointer rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition font-bold text-[11px] sm:text-xs shadow'
                                onClick={() => navigate("/create-edit-shop")}
                            >
                                <FaStore size={11} />
                                <span className="hidden sm:inline">Create Shop</span>
                            </button>
                        )}

                        <button
                            className='flex items-center gap-1.5 cursor-pointer px-2.5 sm:px-3 py-1.5 rounded-full bg-stone-100 text-stone-800 hover:bg-stone-200 transition text-[11px] sm:text-xs font-bold border border-stone-200'
                            onClick={() => navigate("/my-orders")}
                        >
                            <TbReceipt2 size={15} className="text-[#ff5200]" />
                            <span className="hidden sm:inline">Orders</span>
                        </button>
                    </div>
                ) : userData?.role === "deliveryBoy" ? (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                            <FaMotorcycle size={14} />
                            <span className="hidden sm:inline">Delivery Partner</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 sm:gap-3">
                        {userData?.role === "user" && (
                            <div className='relative cursor-pointer p-1.5 sm:p-2 rounded-full hover:bg-stone-100 transition' onClick={() => navigate("/cart")}>
                                <FiShoppingCart size={20} className='text-stone-800' />
                                {cartItems?.length > 0 && (
                                    <span className='absolute -top-1 -right-1 bg-[#ff5200] text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm'>
                                        {cartItems.length}
                                    </span>
                                )}
                            </div>
                        )}

                        {userData?.role === "user" && (
                            <button
                                className='hidden md:block px-3.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold border border-stone-200 transition'
                                onClick={() => navigate("/my-orders")}
                            >
                                My Orders
                            </button>
                        )}
                    </div>
                )}

                {/* Real-Time Notification Bell */}
                {userData && (
                    <div className="relative" ref={notifRef}>
                        <div
                            className='relative cursor-pointer p-1.5 sm:p-2 rounded-full hover:bg-stone-100 transition text-stone-700 flex items-center justify-center'
                            onClick={() => setShowNotifications(prev => !prev)}
                            title="Notifications"
                        >
                            <FaBell size={18} />
                            {unreadCount > 0 && (
                                <span className='absolute -top-0.5 -right-0.5 bg-[#ff5200] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs'>
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </div>

                        {showNotifications && (
                            <NotificationDropdown onClose={() => setShowNotifications(false)} />
                        )}
                    </div>
                )}

                {/* User Avatar Dropdown (All Logged-in Users) */}
                {userData ? (
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className='w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#ff5200] to-amber-500 text-white text-xs sm:text-sm shadow-md font-extrabold cursor-pointer hover:scale-105 transition relative'
                            onClick={() => setShowInfo(prev => !prev)}
                        >
                            {userData?.fullName?.slice(0, 1).toUpperCase()}
                            {userData?.role === "admin" && adminBadges.totalAlerts > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-white"></span>
                            )}
                        </div>

                        {showInfo && (
                            <div className={`absolute top-12 right-0 ${userData.role === "admin" ? "w-80" : "w-64"} bg-white border border-stone-200/90 shadow-2xl rounded-3xl p-3 flex flex-col gap-1.5 z-[9999] animate-in fade-in slide-in-from-top-2`}>
                                {/* User Info Header */}
                                {userData.role === "admin" ? (
                                    <div className='p-3 rounded-2xl bg-gradient-to-br from-stone-900 via-purple-950 to-indigo-950 text-white border border-purple-500/30 shadow-md'>
                                        <div className='flex items-center gap-3'>
                                            <div className='w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-purple-500 to-indigo-500 text-white text-sm font-black shadow-inner border-2 border-purple-300 shrink-0'>
                                                {userData?.fullName?.slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <div className='text-xs font-black text-white truncate'>{userData.fullName}</div>
                                                <div className='text-[11px] text-purple-200/80 truncate'>{userData.email}</div>
                                                <div className='inline-flex items-center gap-1 text-[9px] font-black text-purple-200 bg-purple-500/30 border border-purple-400/40 px-2 py-0.5 rounded-full uppercase tracking-wider mt-1'>
                                                    <FaShieldHalved size={9} />
                                                    <span>Super Admin</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='pt-2 mt-2 border-t border-purple-800/40 flex items-center justify-between text-[10px] text-purple-200/90'>
                                            <div className='flex items-center gap-1.5'>
                                                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                                                <span>{isConnected ? "Platform Socket Live" : "Reconnecting Gateway"}</span>
                                            </div>
                                            <span 
                                                onClick={() => { setShowInfo(false); navigate("/admin?tab=overview"); }}
                                                className='text-purple-300 font-bold hover:underline cursor-pointer'
                                            >
                                                Console ➔
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='p-2 rounded-2xl bg-stone-50 border border-stone-100 flex items-center gap-3'>
                                        <div className='w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#ff5200] to-amber-500 text-white text-sm font-black shadow-sm shrink-0'>
                                            {userData?.fullName?.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='text-xs font-black text-stone-900 truncate'>{userData.fullName}</div>
                                            <div className='text-[11px] text-stone-400 truncate'>{userData.email}</div>
                                            <span className='inline-block text-[9px] font-black text-[#ff5200] bg-[#ff5200]/10 px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5'>
                                                {userData.role}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Section: Management & Orders */}
                                <div className='pt-1 space-y-0.5'>
                                    {userData.role === "admin" && (
                                        <>
                                            <div className='px-1 pt-0.5 pb-1 text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center justify-between'>
                                                <span>Platform Governance</span>
                                                {adminBadges.totalAlerts > 0 && (
                                                    <span className='bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded-full font-extrabold'>
                                                        {adminBadges.totalAlerts} Alert{adminBadges.totalAlerts > 1 ? "s" : ""}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Command Overview */}
                                            <div
                                                className='text-xs font-bold text-purple-800 hover:text-purple-950 hover:bg-purple-50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center justify-between transition group'
                                                onClick={() => { setShowInfo(false); navigate("/admin?tab=overview"); }}
                                            >
                                                <div className='flex items-center gap-2.5'>
                                                    <div className='w-7 h-7 rounded-xl bg-purple-100 group-hover:bg-purple-600 group-hover:text-white text-purple-600 flex items-center justify-center transition shrink-0'>
                                                        <FaShieldHalved size={12} />
                                                    </div>
                                                    <span>Command Overview</span>
                                                </div>
                                                <span className='text-[11px] text-purple-400 group-hover:text-purple-700'>➔</span>
                                            </div>

                                            {/* Restaurant Approvals */}
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center justify-between transition group'
                                                onClick={() => { setShowInfo(false); navigate("/admin?tab=shops"); }}
                                            >
                                                <div className='flex items-center gap-2.5'>
                                                    <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                        <FaStore size={12} />
                                                    </div>
                                                    <span>Restaurant Approvals</span>
                                                </div>
                                                {adminBadges.pendingShopsCount > 0 ? (
                                                    <span className='text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full'>
                                                        {adminBadges.pendingShopsCount} pending
                                                    </span>
                                                ) : (
                                                    <span className='text-[10px] font-medium text-stone-400'>All verified</span>
                                                )}
                                            </div>

                                            {/* Payout Settlements */}
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center justify-between transition group'
                                                onClick={() => { setShowInfo(false); navigate("/admin?tab=shops&filter=pending"); }}
                                            >
                                                <div className='flex items-center gap-2.5'>
                                                    <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                        <FaCoins size={12} />
                                                    </div>
                                                    <span>Vendor Settlements</span>
                                                </div>
                                                {adminBadges.unsettledPayoutsCount > 0 && (
                                                    <span className='text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full'>
                                                        {adminBadges.unsettledPayoutsCount} orders
                                                    </span>
                                                )}
                                            </div>

                                            {/* User Roles & Staff */}
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center justify-between transition group'
                                                onClick={() => { setShowInfo(false); navigate("/admin?tab=users"); }}
                                            >
                                                <div className='flex items-center gap-2.5'>
                                                    <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                        <FaUsers size={12} />
                                                    </div>
                                                    <span>User Roles & Staff</span>
                                                </div>
                                            </div>

                                            {/* Disputes & Refunds */}
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-red-600 hover:bg-red-50/50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center justify-between transition group'
                                                onClick={() => { setShowInfo(false); navigate("/admin?tab=disputes"); }}
                                            >
                                                <div className='flex items-center gap-2.5'>
                                                    <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-red-600 group-hover:text-white text-red-600 flex items-center justify-center transition shrink-0'>
                                                        <FaTriangleExclamation size={12} />
                                                    </div>
                                                    <span>Disputes & Refunds</span>
                                                </div>
                                                {adminBadges.unresolvedDisputesCount > 0 && (
                                                    <span className='text-[10px] font-black bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full animate-pulse'>
                                                        {adminBadges.unresolvedDisputesCount} active
                                                    </span>
                                                )}
                                            </div>

                                            {/* Operations & Analytics */}
                                            <div className='border-t border-stone-100 pt-1.5 mt-1'>
                                                <div className='px-1 pb-1 text-[10px] font-black uppercase tracking-wider text-stone-400'>
                                                    Operations & Analytics
                                                </div>
                                                <div
                                                    className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center gap-2.5 transition group'
                                                    onClick={() => { setShowInfo(false); navigate("/owner/analytics"); }}
                                                >
                                                    <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                        <FaChartLine size={12} />
                                                    </div>
                                                    <span>Kitchen Analytics</span>
                                                </div>
                                                <div
                                                    className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-1.5 cursor-pointer flex items-center gap-2.5 transition group'
                                                    onClick={() => { setShowInfo(false); navigate("/my-orders"); }}
                                                >
                                                    <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                        <TbReceipt2 size={13} />
                                                    </div>
                                                    <span>All Platform Orders</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {userData.role === "owner" && (
                                        <>
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                                onClick={() => { setShowInfo(false); navigate("/owner/reels"); }}
                                            >
                                                <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                    <FaFilm size={12} />
                                                </div>
                                                <span>Manage Reels</span>
                                            </div>
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                                onClick={() => { setShowInfo(false); navigate("/create-edit-shop"); }}
                                            >
                                                <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                    <FaStore size={12} />
                                                </div>
                                                <span>Restaurant Shop</span>
                                            </div>
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                                onClick={() => { setShowInfo(false); navigate("/owner/analytics"); }}
                                            >
                                                <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                    <FaChartLine size={13} />
                                                </div>
                                                <span>Kitchen Analytics</span>
                                            </div>
                                            <div
                                                className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                                onClick={() => { setShowInfo(false); navigate("/my-orders"); }}
                                            >
                                                <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                    <TbReceipt2 size={14} />
                                                </div>
                                                <span>Restaurant Orders</span>
                                            </div>
                                        </>
                                    )}

                                    {userData.role === "user" && (
                                        <div
                                            className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                            onClick={() => { setShowInfo(false); navigate("/my-orders"); }}
                                        >
                                            <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                <TbReceipt2 size={14} />
                                            </div>
                                            <span>My Orders</span>
                                        </div>
                                    )}

                                    {userData.role === "deliveryBoy" && (
                                        <div
                                            className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                            onClick={() => { setShowInfo(false); navigate("/my-orders"); }}
                                        >
                                            <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                <TbReceipt2 size={14} />
                                            </div>
                                            <span>My Deliveries</span>
                                        </div>
                                    )}
                                </div>

                                {/* Section: Personalization & Preferences */}
                                {userData.role !== "deliveryBoy" && (
                                    <div className='border-t border-stone-100 pt-1.5 space-y-0.5'>
                                        <div
                                            className='text-xs font-bold text-stone-700 hover:text-red-500 hover:bg-red-50/50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                            onClick={() => { setShowInfo(false); navigate("/liked-reels"); }}
                                        >
                                            <div className='w-7 h-7 rounded-xl bg-red-50 group-hover:bg-red-500 group-hover:text-white text-red-500 flex items-center justify-center transition shrink-0'>
                                                <FaHeart size={12} />
                                            </div>
                                            <span>Liked Reels</span>
                                        </div>

                                        <div
                                            className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                            onClick={() => { setShowInfo(false); setShowCuisineModal(true); }}
                                        >
                                            <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                <FaUtensils size={12} />
                                            </div>
                                            <span>Food Preferences</span>
                                        </div>

                                        <div
                                            className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                            onClick={() => { setShowInfo(false); setShowAddressesModal(true); }}
                                        >
                                            <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                                <FaLocationDot size={12} />
                                            </div>
                                            <span>Saved Addresses</span>
                                        </div>
                                    </div>
                                )}

                                {/* Section: Account & Logout */}
                                <div className='border-t border-stone-100 pt-1.5 space-y-0.5'>
                                    <div
                                        className='text-xs font-bold text-stone-700 hover:text-[#ff5200] hover:bg-stone-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center gap-2.5 transition group'
                                        onClick={() => { setShowInfo(false); setShowProfileModal(true); }}
                                    >
                                        <div className='w-7 h-7 rounded-xl bg-stone-100 group-hover:bg-[#ff5200] group-hover:text-white text-[#ff5200] flex items-center justify-center transition shrink-0'>
                                            <FaGear size={12} />
                                        </div>
                                        <span>Account Settings</span>
                                    </div>

                                    <div
                                        className='text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-2xl px-2.5 py-2 cursor-pointer flex items-center justify-between transition mt-0.5'
                                        onClick={() => { setShowInfo(false); handleLogOut(); }}
                                    >
                                        <span>Log Out</span>
                                        <span>➔</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate("/signin")}
                            className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow transition"
                        >
                            Sign In
                        </button>
                    </div>
                )}
            </div>
        </header>

        {/* Modals rendered outside header container */}
        <CuisinePreferencesModal
            isOpen={showCuisineModal}
            onClose={() => setShowCuisineModal(false)}
        />
        <ProfileSettingsModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
        />
        <SavedAddressesModal
            isOpen={showAddressesModal}
            onClose={() => setShowAddressesModal(false)}
        />
        </>
    );
}

export default Nav;
