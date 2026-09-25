import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FaHome, FaSearch, FaFilm, FaShoppingBag, FaUser, FaTimes, FaUtensils } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import axios from "axios";
import { serverUrl } from "../App";
import { setSearchItems, addToCart } from "../redux/userSlice";
import { toast } from "react-hot-toast";

const MobileBottomTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { userData, cartItems, currentCity } = useSelector((state) => state.user);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

  const isReels = location.pathname === "/reels";

  // Check active routes
  const isHomeActive = location.pathname === "/" || location.pathname === "/landing";
  const isReelsActive = location.pathname === "/reels";
  const isCartActive = location.pathname === "/cart";
  const isProfileActive =
    location.pathname === "/my-orders" ||
    location.pathname === "/owner/reels" ||
    location.pathname === "/liked-reels" ||
    location.pathname === "/signin";

  // Focus search input when search modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isSearchOpen]);

  // Live search debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const cityParam = currentCity ? `&city=${encodeURIComponent(currentCity)}` : "";
        const res = await axios.get(
          `${serverUrl}/api/item/search-items?query=${encodeURIComponent(searchQuery)}${cityParam}`,
          { withCredentials: true }
        );
        setSearchResults(res.data || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, currentCity]);

  const handleSelectSearchItem = (item) => {
    setIsSearchOpen(false);
    if (item.shop?._id || item.shop) {
      const shopId = item.shop._id || item.shop;
      navigate(`/shop/${shopId}`);
    } else {
      navigate("/");
    }
  };

  const handleViewAllOnHome = () => {
    dispatch(setSearchItems(searchResults));
    setIsSearchOpen(false);
    navigate("/");
  };

  const handleProfileClick = () => {
    if (!userData) {
      navigate("/signin");
    } else if (userData.role === "owner") {
      navigate("/owner/reels");
    } else {
      navigate("/my-orders");
    }
  };

  return (
    <>
      {/* Mobile Search Overlay Drawer */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex flex-col justify-end md:hidden">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Search Header */}
            <div className="p-4 border-b border-stone-200 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2.5 bg-stone-100 rounded-full px-3.5 py-2.5 border border-stone-200 focus-within:border-[#ff5200] focus-within:bg-white transition">
                <FaSearch size={15} className="text-[#ff5200] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search dishes, restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-stone-800 outline-none w-full"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-stone-400 hover:text-stone-700">
                    <FaTimes size={13} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-stone-600 font-bold text-xs px-2 py-1 hover:text-black transition"
              >
                Cancel
              </button>
            </div>

            {/* City Tag */}
            {currentCity && (
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center gap-1.5 text-[11px] font-semibold text-stone-600">
                <FaLocationDot size={12} className="text-[#ff5200]" />
                <span>Searching in: <strong className="text-stone-800">{currentCity}</strong></span>
              </div>
            )}

            {/* Search Results List */}
            <div className="overflow-y-auto flex-1 p-3 space-y-2 max-h-[50vh]">
              {isSearching && (
                <div className="py-8 text-center text-xs text-stone-500 font-medium">
                  Searching dishes...
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="py-8 text-center space-y-1">
                  <p className="text-sm font-bold text-stone-700">No dishes found</p>
                  <p className="text-xs text-stone-400">Try searching for pizza, burger, biryani...</p>
                </div>
              )}

              {!isSearching &&
                searchResults.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => handleSelectSearchItem(item)}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-stone-50 border border-stone-100 cursor-pointer transition active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-100"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#ff5200] flex items-center justify-center shrink-0">
                          <FaUtensils size={16} />
                        </div>
                      )}
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
                        <p className="text-[11px] text-stone-500 truncate">
                          {item.shop?.name || "Restaurant"} • <span className="font-bold text-[#ff5200]">₹{item.price}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(addToCart(item));
                        toast.success(`${item.name} added!`);
                      }}
                      className="bg-[#ff5200] text-white px-3 py-1.5 rounded-xl text-[11px] font-extrabold shrink-0 shadow-sm active:scale-95 transition"
                    >
                      + Add
                    </button>
                  </div>
                ))}
            </div>

            {/* Footer action to view all on Home page */}
            {searchResults.length > 0 && (
              <div className="p-3 border-t border-stone-200 bg-stone-50">
                <button
                  onClick={handleViewAllOnHome}
                  className="w-full bg-[#ff5200] hover:bg-[#e64526] text-white font-extrabold text-xs py-2.5 rounded-2xl transition shadow"
                >
                  View All {searchResults.length} Results on Home
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fixed Phone Preview Navigation Bar ── */}
      <nav
        aria-label="Mobile Navigation"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[99999] px-2 py-2 flex items-center justify-around transition-colors duration-200 ${
          isReels
            ? "bg-black/90 backdrop-blur-xl border-t border-white/10 text-stone-300 shadow-[0_-5px_25px_rgba(0,0,0,0.8)]"
            : "bg-white/95 backdrop-blur-xl border-t border-stone-200/80 text-stone-500 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        }`}
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* 1. Home Tab */}
        <button
          onClick={() => navigate("/")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition active:scale-90 ${
            isHomeActive
              ? "text-[#ff5200]"
              : isReels
              ? "text-stone-400 hover:text-white"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div className="relative">
            <FaHome size={20} />
            {isHomeActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#ff5200] rounded-full" />
            )}
          </div>
          <span>Home</span>
        </button>

        {/* 2. Search Tab */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition active:scale-90 ${
            isSearchOpen
              ? "text-[#ff5200]"
              : isReels
              ? "text-stone-400 hover:text-white"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div className="relative">
            <FaSearch size={18} />
          </div>
          <span>Search</span>
        </button>

        {/* 3. Reel Tab */}
        <button
          onClick={() => navigate("/reels")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold relative transition active:scale-90 ${
            isReelsActive
              ? "text-[#ff5200]"
              : isReels
              ? "text-stone-400 hover:text-white"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div className="relative">
            <FaFilm size={19} />
            <span className="absolute -top-1 -right-2.5 bg-gradient-to-r from-red-500 to-[#ff5200] text-white text-[7px] font-black px-1 rounded-full animate-pulse">
              HOT
            </span>
            {isReelsActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#ff5200] rounded-full" />
            )}
          </div>
          <span>Reel</span>
        </button>

        {/* 4. Cart Tab */}
        <button
          onClick={() => navigate("/cart")}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold relative transition active:scale-90 ${
            isCartActive
              ? "text-[#ff5200]"
              : isReels
              ? "text-stone-400 hover:text-white"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div className="relative">
            <FaShoppingBag size={19} />
            {cartItems?.length > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#ff5200] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cartItems.length}
              </span>
            )}
            {isCartActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#ff5200] rounded-full" />
            )}
          </div>
          <span>Cart</span>
        </button>

        {/* 5. Profile Tab */}
        <button
          onClick={handleProfileClick}
          className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition active:scale-90 ${
            isProfileActive
              ? "text-[#ff5200]"
              : isReels
              ? "text-stone-400 hover:text-white"
              : "text-stone-500 hover:text-stone-900"
          }`}
        >
          <div className="relative">
            <FaUser size={18} />
            {isProfileActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#ff5200] rounded-full" />
            )}
          </div>
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
};

export default MobileBottomTab;
