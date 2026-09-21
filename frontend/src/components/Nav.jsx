import React, { useEffect, useState, useRef } from 'react';
import { FaLocationDot, FaPlus, FaFilm, FaUtensils, FaMotorcycle, FaStore, FaHeart, FaGear } from "react-icons/fa6";
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

function Nav() {
    const { userData, currentCity, cartItems } = useSelector(state => state.user);
    const { myShopData } = useSelector(state => state.owner || {});
    const [showInfo, setShowInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [query, setQuery] = useState("");
    const [showCuisineModal, setShowCuisineModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAddressesModal, setShowAddressesModal] = useState(false);
    const dropdownRef = useRef(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

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

                {/* User Avatar Dropdown (All Logged-in Users) */}
                {userData ? (
                    <div className="relative" ref={dropdownRef}>
                        <div
                            className='w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#ff5200] to-amber-500 text-white text-xs sm:text-sm shadow-md font-extrabold cursor-pointer hover:scale-105 transition'
                            onClick={() => setShowInfo(prev => !prev)}
                        >
                            {userData?.fullName?.slice(0, 1).toUpperCase()}
                        </div>

                        {showInfo && (
                            <div className='absolute top-12 right-0 w-64 bg-white border border-stone-200/90 shadow-2xl rounded-3xl p-3 flex flex-col gap-1 z-[9999] animate-in fade-in slide-in-from-top-2'>
                                {/* User Info Header */}
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

                                {/* Section: Management & Orders */}
                                <div className='pt-1.5 space-y-0.5'>
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
