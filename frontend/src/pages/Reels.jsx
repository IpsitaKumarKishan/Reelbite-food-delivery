import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { addToCart } from "../redux/userSlice";
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
    currentUser ? reel.likes?.includes(currentUser._id) : false
  );
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
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
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);

    try {
      const res = await axios.patch(
        `${serverUrl}/api/reels/${reel._id}/like`,
        {},
        { withCredentials: true }
      );
      setLikesCount(res.data.likesCount);
      setIsLiked(res.data.isLiked);
    } catch (err) {
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (!reel.foodItem) return;
    dispatch(
      addToCart({
        id: reel.foodItem._id,
        name: reel.foodItem.name,
        price: reel.foodItem.price,
        image: reel.foodItem.image,
        quantity: 1,
        shop: reel.shop?._id || reel.foodItem.shop,
      })
    );
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2200);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: reel.caption || "Check out this food reel on Reelbite!",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Reel link copied to clipboard!");
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

  const shopImage = reel.shop?.image;
  const shopName = reel.shop?.name || reel.owner?.fullName || "Reelbite Kitchen";

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black flex items-center justify-center overflow-hidden font-sans">
      {/* Full-bleed Vertical Video Element */}
      <video
        ref={videoRef}
        src={videoSource}
        className="h-full w-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />

      {/* Top Mute/Unmute Control */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-20 right-4 z-20 bg-black/40 text-white p-3 rounded-full backdrop-blur-md hover:bg-black/60 transition"
      >
        {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
      </button>

      {/* Toast alert when item added to cart */}
      {addedToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-[#ff5200] text-white text-xs font-black px-5 py-2.5 rounded-full shadow-2xl transition animate-bounce flex items-center gap-2">
          <FaShoppingBag />
          <span>Added {reel.foodItem?.name} to Cart! 🛒</span>
        </div>
      )}

      {/* Instagram-style Right-side Icon Rail */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5 text-white">
        {/* Restaurant Avatar (Circular, Tap to go to Shop) */}
        <div
          onClick={handleNavigateToShop}
          className="relative group cursor-pointer"
          title={`Visit ${shopName}`}
        >
          <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#ff5200] via-amber-500 to-red-500 shadow-xl group-hover:scale-110 transition">
            {shopImage ? (
              <img
                src={shopImage}
                alt={shopName}
                className="w-full h-full object-cover rounded-full border-2 border-black"
              />
            ) : (
              <div className="w-full h-full bg-stone-900 rounded-full flex items-center justify-center border-2 border-black">
                <FaUtensils className="text-[#ff5200] text-sm" />
              </div>
            )}
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ff5200] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-black">
            +
          </span>
        </div>

        {/* Like Button */}
        <button onClick={handleLike} className="flex flex-col items-center group">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            {isLiked ? (
              <FaHeart className="text-red-500 text-2xl animate-pulse" />
            ) : (
              <FaRegHeart className="text-white text-2xl" />
            )}
          </div>
          <span className="text-[11px] font-bold mt-0.5 drop-shadow">{likesCount}</span>
        </button>

        {/* Comment Icon */}
        <div className="flex flex-col items-center group cursor-pointer opacity-80 hover:opacity-100">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            <FaComment className="text-white text-2xl" />
          </div>
          <span className="text-[11px] font-bold mt-0.5 drop-shadow">Chat</span>
        </div>

        {/* Share Button */}
        <button onClick={handleShare} className="flex flex-col items-center group">
          <div className="p-2.5 bg-black/30 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            <FaShare className="text-white text-2xl" />
          </div>
          <span className="text-[11px] font-bold mt-0.5 drop-shadow">Share</span>
        </button>

        {/* Bookmark / Save Icon */}
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
              <FaRegBookmark className="text-white text-2xl" />
            )}
          </div>
          <span className="text-[11px] font-bold mt-0.5 drop-shadow">Save</span>
        </button>
      </div>

      {/* Bottom-Left Overlay Details */}
      <div className="absolute bottom-6 left-4 right-16 z-20 text-white space-y-3">
        {/* Restaurant Handle Header */}
        <div className="flex items-center gap-2">
          <h4
            onClick={handleNavigateToShop}
            className="font-black text-sm text-white drop-shadow hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span>@{shopName.replace(/\s+/g, "").toLowerCase()}</span>
            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">✔</span>
          </h4>
          {reel.shop?.city && (
            <span className="text-[11px] text-stone-300 font-semibold">• {reel.shop.city}</span>
          )}
        </div>

        {/* Caption text with truncation toggle */}
        {reel.caption && (
          <p className="text-xs font-medium text-stone-100 leading-relaxed drop-shadow max-w-[85%]">
            {showFullCaption || reel.caption.length <= 60 ? (
              <span>
                {reel.caption}{" "}
                {reel.caption.length > 60 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullCaption(false);
                    }}
                    className="text-stone-400 font-bold ml-1 hover:text-white"
                  >
                    less
                  </button>
                )}
              </span>
            ) : (
              <span>
                {reel.caption.slice(0, 60)}...{" "}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullCaption(true);
                  }}
                  className="text-stone-300 font-bold ml-1 hover:text-white"
                >
                  more
                </button>
              </span>
            )}
          </p>
        )}

        {/* Linked Food Item Product Tag Pill */}
        {reel.foodItem && (
          <div className="inline-flex items-center gap-3 bg-stone-900/90 border border-amber-500/30 p-2 pr-4 rounded-2xl backdrop-blur-md shadow-2xl max-w-full">
            {reel.foodItem.image ? (
              <img
                src={reel.foodItem.image}
                alt={reel.foodItem.name}
                className="w-12 h-12 object-cover rounded-xl shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-amber-900/50 rounded-xl flex items-center justify-center text-amber-400 text-lg shrink-0">
                🍔
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-extrabold text-white truncate">
                {reel.foodItem.name}
              </h5>
              <p className="text-xs font-black text-[#ff5200]">
                ₹{reel.foodItem.price}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              className="bg-gradient-to-r from-[#ff5200] to-red-600 hover:from-red-600 hover:to-[#ff5200] text-white px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-lg shrink-0"
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
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${serverUrl}/api/reels`);
      setReels(res.data.reels || []);
    } catch (err) {
      setError("Failed to load food reels");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black font-sans">
      {/* Top Floating Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between text-white">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-black/40 hover:bg-black/70 px-3.5 py-1.5 rounded-full backdrop-blur-md transition text-xs font-bold"
        >
          <FaArrowLeft />
          <span>Home</span>
        </button>


        {userData?.role === "owner" ? (
          <button
            onClick={() => navigate("/owner/reels")}
            className="flex items-center gap-1.5 bg-[#ff5200] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow"
          >
            <FaPlus />
            <span>Upload Reel</span>
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Snap Scroll Reels Viewport */}
      {loading ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-white bg-black gap-3">
          <div className="w-12 h-12 border-4 border-[#ff5200] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-400 text-xs font-semibold">Loading Reels...</p>
        </div>
      ) : error ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-stone-300 bg-black gap-4 p-4 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchReels}
            className="bg-[#ff5200] text-white px-5 py-2 rounded-xl font-bold text-xs"
          >
            Try Again
          </button>
        </div>
      ) : reels.length === 0 ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-stone-300 bg-black p-6 text-center gap-4">
          <div className="text-6xl">🎬</div>
          <h2 className="text-2xl font-black text-white">No Reels Uploaded Yet!</h2>
          <p className="text-stone-400 text-xs max-w-sm">
            Restaurant owners haven't uploaded any food reels yet. Check back soon!
          </p>
          {userData?.role === "owner" && (
            <button
              onClick={() => navigate("/owner/reels")}
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-lg"
            >
              Upload First Reel
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
