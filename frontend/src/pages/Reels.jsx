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
  FaShoppingBag,
  FaArrowLeft,
  FaPlus,
  FaUtensils,
} from "react-icons/fa";
import Nav from "../components/Nav";

const ReelCard = ({ reel, currentUser, onLikeToggle }) => {
  const videoRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(
    currentUser ? reel.likes?.includes(currentUser._id) : false
  );
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
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
    setTimeout(() => setAddedToast(false), 2000);
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

  const videoSource = reel.videoUrl.startsWith("http")
    ? reel.videoUrl
    : `${serverUrl}${reel.videoUrl}`;

  return (
    <div className="h-screen w-full snap-start snap-always relative bg-black flex items-center justify-center overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSource}
        className="h-full w-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* Mute/Unmute Toggle */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-20 right-4 z-20 bg-black/50 text-white p-3 rounded-full backdrop-blur-md hover:bg-black/70 transition"
      >
        {isMuted ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
      </button>

      {/* Toast alert when item added to cart */}
      {addedToast && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-[#ea580c] text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg transition animate-bounce">
          Added {reel.foodItem?.name} to Cart! 🛒
        </div>
      )}

      {/* Action Buttons Sidebar (Right) */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6 text-white">
        {/* Like Button */}
        <button onClick={handleLike} className="flex flex-col items-center group">
          <div className="p-3 bg-black/40 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            {isLiked ? (
              <FaHeart className="text-red-500 text-2xl animate-pulse" />
            ) : (
              <FaRegHeart className="text-white text-2xl" />
            )}
          </div>
          <span className="text-xs font-medium mt-1 drop-shadow">{likesCount}</span>
        </button>

        {/* Share Button */}
        <button onClick={handleShare} className="flex flex-col items-center group">
          <div className="p-3 bg-black/40 rounded-full backdrop-blur-md group-hover:scale-110 transition">
            <FaShare className="text-white text-2xl" />
          </div>
          <span className="text-xs font-medium mt-1 drop-shadow">Share</span>
        </button>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-6 left-4 right-16 z-20 text-white space-y-3">
        {/* Shop / Owner Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ea580c] to-[#f59e0b] p-[2px] flex items-center justify-center">
            <div className="w-full h-full bg-stone-900 rounded-full flex items-center justify-center">
              <FaUtensils className="text-[#ea580c] text-sm" />
            </div>
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-300 drop-shadow">
              {reel.shop?.name || reel.owner?.fullName || "Reelbite Kitchen"}
            </h4>
            {reel.shop?.city && (
              <p className="text-xs text-stone-300">{reel.shop.city}</p>
            )}
          </div>
        </div>

        {/* Caption */}
        {reel.caption && (
          <p className="text-sm font-medium text-stone-100 line-clamp-2 leading-relaxed drop-shadow">
            {reel.caption}
          </p>
        )}

        {/* Tagged Food Item Pill */}
        {reel.foodItem && (
          <div className="inline-flex items-center gap-3 bg-stone-900/90 border border-amber-500/30 p-2 pr-4 rounded-xl backdrop-blur-md shadow-2xl max-w-full">
            {reel.foodItem.image ? (
              <img
                src={reel.foodItem.image}
                alt={reel.foodItem.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <div className="w-12 h-12 bg-amber-900/50 rounded-lg flex items-center justify-center text-amber-400">
                🍔
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white truncate">
                {reel.foodItem.name}
              </h5>
              <p className="text-xs font-bold text-amber-400">
                ₹{reel.foodItem.price}
              </p>
            </div>
            <button
              onClick={handleAddToCart}
              className="bg-[#ea580c] hover:bg-[#c2410c] text-white p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow"
            >
              <FaShoppingBag size={12} />
              <span>Order</span>
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
    <div className="relative min-h-screen bg-stone-950 font-sans">
      {/* Top Floating Navbar Overlay */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between text-white">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-black/40 hover:bg-black/70 px-3 py-1.5 rounded-full backdrop-blur-md transition text-sm font-semibold"
        >
          <FaArrowLeft />
          <span>Home</span>
        </button>

        <h1 className="text-xl font-extrabold tracking-wide bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
          Reelbite Shorts
        </h1>

        {userData?.role === "owner" ? (
          <button
            onClick={() => navigate("/owner/reels")}
            className="flex items-center gap-1.5 bg-[#ea580c] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow"
          >
            <FaPlus />
            <span>Upload Reel</span>
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* Main Snap Scroll Container */}
      {loading ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-white bg-stone-950 gap-3">
          <div className="w-12 h-12 border-4 border-[#ea580c] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-stone-400 text-sm font-medium">Fetching appetizing reels...</p>
        </div>
      ) : error ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-stone-300 bg-stone-950 gap-4 p-4 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchReels}
            className="bg-[#ea580c] text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            Try Again
          </button>
        </div>
      ) : reels.length === 0 ? (
        <div className="h-screen w-full flex flex-col items-center justify-center text-stone-300 bg-stone-950 p-6 text-center gap-4">
          <div className="text-6xl">🎬</div>
          <h2 className="text-2xl font-bold text-white">No Reels Yet!</h2>
          <p className="text-stone-400 max-w-sm">
            Restaurant owners haven't uploaded any food reels yet. Check back soon!
          </p>
          {userData?.role === "owner" && (
            <button
              onClick={() => navigate("/owner/reels")}
              className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-lg"
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
