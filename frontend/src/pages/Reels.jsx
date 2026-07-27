import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { addToCart, updateUserDietPreference } from "../redux/userSlice";
import {
  FaHeart,
  FaRegHeart,
  FaVolumeMute,
  FaVolumeUp,
  FaShare,
  FaBookmark,
  FaRegBookmark,
  FaShoppingBag,
  FaArrowLeft,
  FaPlus,
  FaUtensils,
  FaComment,
} from "react-icons/fa";

const ReelCard = ({ reel, currentUser }) => {
  const videoRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(
    reel.likes?.includes(currentUser?._id)
  );
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoElement
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          } else {
            videoElement.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoElement);

    return () => {
      observer.unobserve(videoElement);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    try {
      const res = await axios.patch(
        `${serverUrl}/api/reels/${reel._id}/like`,
        {},
        { withCredentials: true }
      );
      setIsLiked(res.data.isLiked);
      setLikesCount(res.data.likesCount);
    } catch (err) {
      console.error("Like reel error", err);
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    if (reel.foodItem) {
      try {
        const res = await axios.post(`${serverUrl}/api/user/cart/add`, {
          itemId: reel.foodItem._id,
          quantity: 1
        }, { withCredentials: true });
        dispatch(addToCart(res.data));
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 2500);
      } catch (err) {
        console.error("Add to cart error", err);
      }
    }
  };

  const handleNavigateToShop = (e) => {
    e.stopPropagation();
    const targetShopId = reel.shop?._id || reel.foodItem?.shop;
    if (targetShopId) {
      navigate(`/shop/${targetShopId}`);
    }
  };

  const videoSource = reel.videoUrl.startsWith("http")
    ? reel.videoUrl
    : `${serverUrl}${reel.videoUrl}`;

  const shopName = reel.shop?.name || reel.owner?.fullName || "Reelbite Kitchen";

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black flex items-center justify-center overflow-hidden font-sans">
      <video
        ref={videoRef}
        src={videoSource}
        className="h-full w-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />

      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-20 right-4 z-20 bg-black/40 text-white p-3 rounded-full backdrop-blur-md hover:bg-black/60 transition"
      >
        {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
      </button>

      {addedToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-[#ff5200] text-white text-xs font-black px-5 py-2.5 rounded-full shadow-2xl transition animate-bounce flex items-center gap-2">
          <FaShoppingBag />
          <span>Added to Cart! 🛒</span>
        </div>
      )}

      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
        <button onClick={handleLike} className="flex flex-col items-center group">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            {isLiked ? (
              <FaHeart className="text-red-500 text-2xl animate-pulse" />
            ) : (
              <FaRegHeart className="text-2xl hover:text-red-400" />
            )}
          </div>
          <span className="text-[11px] font-bold mt-1 shadow-sm">{likesCount}</span>
        </button>

        <div className="flex flex-col items-center group cursor-pointer opacity-80 hover:opacity-100">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            <FaComment className="text-white text-2xl" />
          </div>
          <span className="text-[11px] font-bold mt-1 shadow-sm">Chat</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsBookmarked(!isBookmarked);
          }}
          className="flex flex-col items-center group"
        >
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            {isBookmarked ? (
              <FaBookmark className="text-amber-400 text-2xl" />
            ) : (
              <FaRegBookmark className="text-2xl hover:text-amber-300" />
            )}
          </div>
          <span className="text-[11px] font-bold mt-1 shadow-sm">Save</span>
        </button>
      </div>

      <div className="absolute left-3 right-20 bottom-8 z-20 text-white space-y-3">
        <div
          onClick={handleNavigateToShop}
          className="flex items-center gap-2.5 cursor-pointer w-fit"
        >
          <span className="font-extrabold text-sm hover:underline flex items-center gap-1 drop-shadow-md">
            @{shopName.replace(/\s+/g, "").toLowerCase()}
          </span>
          {reel.shop?.city && (
            <span className="bg-white/20 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-full text-stone-200">
              📍 {reel.shop.city}
            </span>
          )}
        </div>

        {reel.title && (
          <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed drop-shadow">
            {reel.title}
          </p>
        )}

        {reel.foodItem && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xl max-w-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              {reel.foodItem.image ? (
                <img
                  src={reel.foodItem.image}
                  alt={reel.foodItem.name}
                  className="w-11 h-11 object-cover rounded-xl border border-white/30"
                />
              ) : (
                <div className="w-11 h-11 bg-[#ff5200] rounded-xl flex items-center justify-center text-white">
                  <FaUtensils />
                </div>
              )}
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block ${
                      reel.foodItem.foodType === "veg"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                    title={reel.foodItem.foodType}
                  />
                  <h4 className="font-bold text-xs text-white truncate">
                    {reel.foodItem.name}
                  </h4>
                </div>
                <p className="text-[#ff5200] font-black text-xs">
                  ₹{reel.foodItem.price}
                </p>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shrink-0 shadow-lg active:scale-95"
            >
              <FaShoppingBag size={12} />
              <span>Add to Cart</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dispatch = useDispatch();
  const { userData, currentCity } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReels();
  }, [currentCity, userData?.dietPreference]);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/reels`, {
        params: {
          city: currentCity || "",
          dietPreference: userData?.dietPreference || "all",
        },
        withCredentials: true,
      });
      setReels(res.data.reels || []);
    } catch (err) {
      setError("Failed to load food reels");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDiet = async (pref) => {
    dispatch(updateUserDietPreference(pref));
    if (userData) {
      try {
        await axios.put(
          `${serverUrl}/api/user/diet-preference`,
          { dietPreference: pref },
          { withCredentials: true }
        );
      } catch (e) {}
    }
  };

  return (
    <div className="relative min-h-screen bg-black font-sans">
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between text-white">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-black/40 hover:bg-black/70 px-3.5 py-1.5 rounded-full backdrop-blur-md transition text-xs font-bold"
        >
          <FaArrowLeft />
          <span>Home</span>
        </button>

        <div className="flex items-center bg-black/50 p-1 rounded-full backdrop-blur-md border border-white/10 text-xs font-bold">
          <button
            onClick={() => handleToggleDiet("all")}
            className={`px-3 py-1 rounded-full transition ${
              (userData?.dietPreference || "all") === "all"
                ? "bg-[#ff5200] text-white shadow"
                : "text-stone-300 hover:text-white"
            }`}
          >
            All 🍕
          </button>
          <button
            onClick={() => handleToggleDiet("veg")}
            className={`px-3 py-1 rounded-full transition ${
              userData?.dietPreference === "veg"
                ? "bg-emerald-600 text-white shadow"
                : "text-stone-300 hover:text-white"
            }`}
          >
            Veg 🌱
          </button>
        </div>

        {userData?.role === "owner" ? (
          <button
            onClick={() => navigate("/owner/reels")}
            className="flex items-center gap-1.5 bg-[#ff5200] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow"
          >
            <FaPlus />
            <span>Upload</span>
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {loading ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-white bg-black gap-3">
          <div className="w-12 h-12 border-4 border-[#ff5200] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-stone-300 bg-black p-6 text-center gap-4">
          <p className="text-red-400">{error}</p>
        </div>
      ) : reels.length === 0 ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-stone-300 bg-black p-6 text-center gap-4">
          <div className="text-6xl">🎬</div>
          <h2 className="text-2xl font-black text-white">No Matching Reels Found!</h2>
          <p className="text-stone-400 text-xs max-w-sm">
            {userData?.dietPreference === "veg"
              ? `No vegetarian reels available in ${currentCity || "your area"}. Try switching to "All" reels.`
              : `No food reels uploaded in ${currentCity || "your city"} yet. Check back soon!`}
          </p>
          {userData?.dietPreference === "veg" && (
            <button
              onClick={() => handleToggleDiet("all")}
              className="bg-[#ff5200] text-white px-5 py-2 rounded-xl font-bold text-xs"
            >
              Show All Reels 🍕
            </button>
          )}
          {userData?.role === "owner" && (
            <button
              onClick={() => navigate("/owner/reels")}
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-lg mt-2"
            >
              Upload Reel
            </button>
          )}
        </div>
      ) : (
        <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
          {reels.map((reel) => (
            <ReelCard key={reel._id} reel={reel} currentUser={userData} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Reels;
