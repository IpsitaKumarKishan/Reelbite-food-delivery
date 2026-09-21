import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { addToCart } from "../redux/userSlice";
import { FaHeart, FaShoppingBag, FaUtensils, FaFilm, FaArrowLeft, FaPlay, FaVolumeMute, FaVolumeUp } from "react-icons/fa";

const LikedReelCard = ({ reel, onAddToCart, onNavigate }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoSource = reel.videoUrl.startsWith("http")
    ? reel.videoUrl
    : `${serverUrl}${reel.videoUrl}`;

  const shopName = reel.shop?.name || reel.owner?.fullName || "Reelbite Kitchen";

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="bg-white border border-stone-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-200 flex flex-col group"
    >
      {/* Video Thumbnail / Preview */}
      <div
        className="relative h-72 bg-black cursor-pointer overflow-hidden"
        onClick={() => onNavigate("/reels")}
      >
        <video
          ref={videoRef}
          src={videoSource}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Liked Badge */}
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-red-500 p-2 rounded-full shadow border border-white/10">
          <FaHeart size={13} />
        </div>

        {/* Play indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white pl-0.5 border border-white/30 shadow-lg group-hover:scale-110 transition">
              <FaPlay size={14} />
            </div>
          </div>
        )}

        {/* Bottom overlay info */}
        <div className="absolute bottom-3 left-3 right-3 text-white space-y-1 pointer-events-none">
          <div className="flex items-center gap-1 text-[11px] font-extrabold text-stone-200 truncate">
            <span>@{shopName.replace(/\s+/g, "").toLowerCase()}</span>
            {reel.shop?.city && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[9px] font-semibold">
                📍 {reel.shop.city}
              </span>
            )}
          </div>
          {reel.caption && (
            <p className="text-xs text-stone-100 font-medium line-clamp-2 leading-tight drop-shadow">
              {reel.caption}
            </p>
          )}
        </div>
      </div>

      {/* Linked Food Item & Action */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 bg-white">
        {reel.foodItem ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {reel.foodItem.image ? (
                <img
                  src={reel.foodItem.image}
                  alt={reel.foodItem.name}
                  className="w-11 h-11 object-cover rounded-2xl border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 bg-[#ff5200]/10 text-[#ff5200] rounded-2xl flex items-center justify-center shrink-0">
                  <FaUtensils size={14} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {reel.foodItem.foodType && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        reel.foodItem.foodType === "veg" ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                  )}
                  <h4 className="text-xs font-black text-stone-800 truncate">
                    {reel.foodItem.name}
                  </h4>
                </div>
                <p className="text-xs font-black text-[#ff5200] mt-0.5">
                  ₹{reel.foodItem.price}
                </p>
              </div>
            </div>

            <button
              onClick={(e) => onAddToCart(reel.foodItem, e)}
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white p-2.5 rounded-2xl shadow-md transition active:scale-90 shrink-0 flex items-center justify-center"
              title="Add to Cart"
            >
              <FaShoppingBag size={13} />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-stone-400 italic py-1">
            Featured recipe reel
          </div>
        )}
      </div>
    </div>
  );
};

const LikedReels = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  const [likedReels, setLikedReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addedToast, setAddedToast] = useState("");

  useEffect(() => {
    if (!userData) {
      navigate("/signin");
      return;
    }
    fetchLikedReels();
  }, [userData]);

  const fetchLikedReels = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${serverUrl}/api/reels/liked`, {
        withCredentials: true,
      });
      setLikedReels(res.data || []);
    } catch (err) {
      console.error("Fetch liked reels error:", err);
      setError("Failed to load your liked reels.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (foodItem, e) => {
    e.stopPropagation();
    if (!foodItem) return;

    try {
      const res = await axios.post(
        `${serverUrl}/api/user/cart/add`,
        { itemId: foodItem._id, quantity: 1 },
        { withCredentials: true }
      );
      dispatch(addToCart(res.data));
      setAddedToast(foodItem.name);
      setTimeout(() => setAddedToast(""), 2200);
    } catch (err) {
      console.error("Add to cart error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffcf7] text-stone-900 font-sans pb-20">
      <Nav />

      {addedToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#ff5200] text-white text-xs font-black px-5 py-2.5 rounded-full shadow-2xl animate-bounce flex items-center gap-2">
          <FaShoppingBag />
          <span>Added "{addedToast}" to Cart! 🛒</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 pt-28 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-full hover:bg-stone-200 transition text-stone-600"
                title="Go Back"
              >
                <FaArrowLeft size={14} />
              </button>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 flex items-center gap-2.5">
                <FaHeart className="text-red-500" />
                <span>Liked Food Reels</span>
              </h1>
            </div>
            <p className="text-xs text-stone-500 mt-1 pl-8">
              All the delicious food reels and recipes you've loved.
            </p>
          </div>

          <button
            onClick={() => navigate("/reels")}
            className="flex items-center gap-2 bg-[#ff5200] hover:bg-[#c2410c] text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-md transition"
          >
            <FaFilm />
            <span>Open Reels Feed</span>
          </button>
        </div>

        {/* Reels Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-400">
            <div className="w-9 h-9 border-4 border-[#ff5200] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-stone-500">Loading your liked reels...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 text-xs font-bold bg-red-50 rounded-2xl border border-red-200">
            {error}
          </div>
        ) : likedReels.length === 0 ? (
          <div className="py-24 text-center text-stone-400 space-y-4 max-w-sm mx-auto">
            <div className="w-16 h-16 bg-red-50 text-red-400 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner">
              <FaHeart />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-stone-800">No Liked Reels Yet</h3>
              <p className="text-xs text-stone-500">
                Explore the food reels feed and tap the heart icon on reels you love!
              </p>
            </div>
            <button
              onClick={() => navigate("/reels")}
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-md transition inline-flex items-center gap-2"
            >
              <FaFilm />
              <span>Explore Reels Feed</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {likedReels.map((reel) => (
              <LikedReelCard
                key={reel._id}
                reel={reel}
                onAddToCart={handleAddToCart}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedReels;
