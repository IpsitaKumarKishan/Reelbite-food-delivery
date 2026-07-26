import React, { useEffect, useState } from 'react';
import { FaLocationDot } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { FiShoppingCart } from "react-icons/fi";
import { useDispatch, useSelector } from 'react-redux';
import { RxCross2 } from "react-icons/rx";
import axios from 'axios';
import { serverUrl } from '../App';
import { setSearchItems, setUserData } from '../redux/userSlice';
import { FaPlus, FaFilm, FaUtensils } from "react-icons/fa6";
import { TbReceipt2 } from "react-icons/tb";
import { useNavigate } from 'react-router-dom';

function Nav() {
    const { userData, currentCity, cartItems } = useSelector(state => state.user);
    const { myShopData } = useSelector(state => state.owner || {});
    const [showInfo, setShowInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [query, setQuery] = useState("");
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

    return (
        <div className='w-full h-[80px] flex items-center justify-between md:justify-between px-4 lg:px-12 fixed top-0 z-[9999] bg-[#fffcf7]/95 backdrop-blur-md border-b border-amber-900/10 shadow-sm'>

            {/* Mobile Search Overlay */}
            {showSearch && userData?.role === "user" && (
                <div className='w-[90%] h-[70px] bg-white shadow-xl rounded-xl items-center gap-[20px] flex fixed top-[80px] left-[5%] md:hidden z-[9999] border border-amber-500/20 px-3'>
                    <div className='flex items-center w-[35%] overflow-hidden gap-[6px] border-r border-stone-300 pr-2'>
                        <FaLocationDot size={18} className="text-[#ea580c]" />
                        <div className='w-[80%] truncate text-xs font-semibold text-stone-700'>{currentCity}</div>
                    </div>
                    <div className='w-[65%] flex items-center gap-[8px]'>
                        <IoIosSearch size={20} className='text-[#ea580c]' />
                        <input
                            type="text"
                            placeholder='search delicious food...'
                            className='text-xs text-stone-800 outline-none w-full bg-transparent'
                            onChange={(e) => setQuery(e.target.value)}
                            value={query}
                        />
                    </div>
                </div>
            )}

            {/* Brand Logo & Reels Button */}
            <div className='flex items-center gap-6'>
                <h1
                    className='text-2xl sm:text-3xl font-black text-[#ea580c] cursor-pointer tracking-tight flex items-center gap-1.5'
                    onClick={() => navigate("/")}
                >
                    <FaUtensils className="text-[#ea580c] text-xl" />
                    <span>Reelbite</span>
                </h1>

                {/* Reels Link Badge */}
                <button
                    onClick={() => navigate("/reels")}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-[#ea580c] to-amber-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md hover:shadow-lg hover:scale-105 transition"
                >
                    <FaFilm size={12} className="animate-pulse" />
                    <span>Reels</span>
                </button>
            </div>

            {/* Central Search Bar (Desktop) */}
            {userData?.role === "user" && (
                <div className='md:w-[45%] lg:w-[38%] h-[50px] bg-stone-100/90 border border-stone-200 shadow-inner rounded-full items-center gap-3 px-4 hidden md:flex focus-within:border-[#ea580c] focus-within:bg-white transition'>
                    <div className='flex items-center w-[30%] overflow-hidden gap-2 border-r border-stone-300 pr-2'>
                        <FaLocationDot size={16} className="text-[#ea580c]" />
                        <div className='truncate text-xs font-bold text-stone-700'>{currentCity}</div>
                    </div>
                    <div className='flex-1 flex items-center gap-2'>
                        <IoIosSearch size={20} className='text-[#ea580c]' />
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
            <div className='flex items-center gap-4'>
                {userData?.role === "user" && (
                    showSearch ? (
                        <RxCross2 size={22} className='text-[#ea580c] md:hidden cursor-pointer' onClick={() => setShowSearch(false)} />
                    ) : (
                        <IoIosSearch size={22} className='text-[#ea580c] md:hidden cursor-pointer' onClick={() => setShowSearch(true)} />
                    )
                )}

                {userData?.role === "owner" ? (
                    <>
                        <button
                            className='flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded-full bg-[#ea580c]/10 text-[#ea580c] hover:bg-[#ea580c] hover:text-white transition font-bold text-xs'
                            onClick={() => navigate("/owner/reels")}
                        >
                            <FaFilm size={14} />
                            <span className="hidden sm:inline">Reels Hub</span>
                        </button>

                        {myShopData && (
                            <button
                                className='flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded-full bg-[#ea580c] text-white hover:bg-[#c2410c] transition font-bold text-xs shadow'
                                onClick={() => navigate("/add-item")}
                            >
                                <FaPlus size={14} />
                                <span className="hidden sm:inline">Add Food</span>
                            </button>
                        )}

                        <button
                            className='flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-full bg-stone-100 text-stone-800 hover:bg-stone-200 transition text-xs font-bold border border-stone-200'
                            onClick={() => navigate("/my-orders")}
                        >
                            <TbReceipt2 size={16} className="text-[#ea580c]" />
                            <span className="hidden sm:inline">Orders</span>
                        </button>
                    </>
                ) : (
                    <>
                        {userData?.role === "user" && (
                            <div className='relative cursor-pointer p-2 rounded-full hover:bg-stone-100 transition' onClick={() => navigate("/cart")}>
                                <FiShoppingCart size={22} className='text-stone-800' />
                                {cartItems?.length > 0 && (
                                    <span className='absolute -top-1 -right-1 bg-[#ea580c] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm'>
                                        {cartItems.length}
                                    </span>
                                )}
                            </div>
                        )}

                        <button
                            className='hidden md:block px-4 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold border border-stone-200 transition'
                            onClick={() => navigate("/my-orders")}
                        >
                            My Orders
                        </button>
                    </>
                )}

                {/* User Avatar Dropdown */}
                {userData ? (
                    <div className="relative">
                        <div
                            className='w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#ea580c] to-amber-500 text-white text-sm shadow-md font-bold cursor-pointer hover:scale-105 transition'
                            onClick={() => setShowInfo(prev => !prev)}
                        >
                            {userData?.fullName?.slice(0, 1).toUpperCase()}
                        </div>

                        {showInfo && (
                            <div className='absolute top-12 right-0 w-48 bg-white border border-stone-200 shadow-2xl rounded-2xl p-4 flex flex-col gap-3 z-[9999]'>
                                <div className='border-b border-stone-100 pb-2'>
                                    <div className='text-sm font-bold text-stone-900 truncate'>{userData.fullName}</div>
                                    <div className='text-[11px] text-stone-500 capitalize'>{userData.role}</div>
                                </div>

                                <div
                                    className='text-xs font-bold text-stone-700 hover:text-[#ea580c] cursor-pointer flex items-center gap-2 py-1'
                                    onClick={() => { setShowInfo(false); navigate("/reels"); }}
                                >
                                    <FaFilm className="text-[#ea580c]" />
                                    <span>Food Reels Feed</span>
                                </div>

                                {userData.role === "owner" && (
                                    <div
                                        className='text-xs font-bold text-stone-700 hover:text-[#ea580c] cursor-pointer flex items-center gap-2 py-1'
                                        onClick={() => { setShowInfo(false); navigate("/owner/reels"); }}
                                    >
                                        <FaFilm className="text-[#ea580c]" />
                                        <span>Manage Reels</span>
                                    </div>
                                )}

                                <div
                                    className='md:hidden text-xs font-bold text-stone-700 hover:text-[#ea580c] cursor-pointer py-1'
                                    onClick={() => { setShowInfo(false); navigate("/my-orders"); }}
                                >
                                    My Orders
                                </div>

                                <div
                                    className='text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer pt-2 border-t border-stone-100'
                                    onClick={() => { setShowInfo(false); handleLogOut(); }}
                                >
                                    Log Out
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => navigate("/signin")}
                        className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-4 py-1.5 rounded-full text-xs font-bold shadow transition"
                    >
                        Sign In
                    </button>
                )}
            </div>
        </div>
    );
}

export default Nav;
