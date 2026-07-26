import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaHome, FaSearch, FaFilm, FaShoppingBag, FaUser } from "react-icons/fa";

const MobileBottomTab = ({ onSearchClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, cartItems } = useSelector((state) => state.user);

  const isActive = (path) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-stone-200 shadow-2xl px-2 py-2 flex items-center justify-around">
      {/* Home Tab */}
      <button
        onClick={() => navigate("/")}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${
          isActive("/") ? "text-[#ff5200]" : "text-stone-500 hover:text-stone-800"
        }`}
      >
        <FaHome size={18} />
        <span>Home</span>
      </button>

      {/* Search Tab */}
      <button
        onClick={() => {
          if (onSearchClick) onSearchClick();
          else navigate("/");
        }}
        className="flex flex-col items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-stone-800 transition"
      >
        <FaSearch size={17} />
        <span>Search</span>
      </button>

      {/* Reels Tab */}
      <button
        onClick={() => navigate("/reels")}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold relative transition ${
          isActive("/reels") ? "text-[#ff5200]" : "text-stone-500 hover:text-stone-800"
        }`}
      >
        <div className="relative">
          <FaFilm size={18} />
          <span className="absolute -top-1 -right-2 bg-gradient-to-r from-red-500 to-[#ff5200] text-white text-[8px] px-1 rounded-full animate-pulse">
            HOT
          </span>
        </div>
        <span>Reels</span>
      </button>

      {/* Cart Tab */}
      <button
        onClick={() => navigate("/cart")}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold relative transition ${
          isActive("/cart") ? "text-[#ff5200]" : "text-stone-500 hover:text-stone-800"
        }`}
      >
        <div className="relative">
          <FaShoppingBag size={18} />
          {cartItems?.length > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#ff5200] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
              {cartItems.length}
            </span>
          )}
        </div>
        <span>Cart</span>
      </button>

      {/* Profile / Account Tab */}
      <button
        onClick={() => {
          if (userData?.role === "owner") navigate("/owner/reels");
          else if (userData) navigate("/my-orders");
          else navigate("/signin");
        }}
        className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${
          isActive("/my-orders") || isActive("/signin")
            ? "text-[#ff5200]"
            : "text-stone-500 hover:text-stone-800"
        }`}
      >
        <FaUser size={17} />
        <span>{userData ? "Account" : "Sign In"}</span>
      </button>
    </div>
  );
};

export default MobileBottomTab;
