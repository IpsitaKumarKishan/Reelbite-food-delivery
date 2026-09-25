import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { serverUrl } from "../App";
import { addToCart, updateUserPreferredCuisines } from "../redux/userSlice";
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
  FaPlay,
} from "react-icons/fa";

const MAX_EXCLUDE_IDS = 100; // cap URL query string length

// ─────────────────────────────────────────────────────────────────────────────
// CuisineOnboarding – shown once on first Reels visit when the user has not
// yet chosen preferred cuisines. Skipping is always allowed.
// ─────────────────────────────────────────────────────────────────────────────
const CuisineOnboarding = ({ onDone }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`${serverUrl}/api/user/cuisine-categories`, {
        withCredentials: true,
      })
      .then((r) => setCategories(r.data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const toggle = (cat) =>
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const handleSave = async (cuisines) => {
    setSaving(true);
    try {
      const res = await axios.patch(
        `${serverUrl}/api/user/preferences`,
        { preferredCuisines: cuisines },
        { withCredentials: true }
      );
      dispatch(updateUserPreferredCuisines(res.data.preferredCuisines || cuisines));
    } catch (e) {
      // Non-blocking: if save fails the user still gets to the feed
    } finally {
      setSaving(false);
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#111] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-white space-y-5">
        <div className="text-center space-y-1">
          <div className="text-4xl">🍜</div>
          <h2 className="text-xl font-black">What do you love to eat?</h2>
          <p className="text-stone-400 text-xs">
            Pick your favourites and we'll personalise your first feed.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-[#ff5200] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                  selected.includes(cat)
                    ? "bg-[#ff5200] border-[#ff5200] text-white shadow-lg scale-105"
                    : "bg-white/5 border-white/15 text-stone-300 hover:border-[#ff5200]/60 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => handleSave([])}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-white/15 text-stone-400 hover:text-white hover:border-white/40 transition"
          >
            Skip
          </button>
          <button
            onClick={() => handleSave(selected)}
            disabled={saving || selected.length === 0}
            className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-[#ff5200] hover:bg-[#c2410c] text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? "Saving…" : `Let's Go${selected.length > 0 ? ` (${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReelCard = ({ reel, currentUser, onSkip, onImpression }) => {
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
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const startTimeRef = useRef(null);
  const totalWatchTimeRef = useRef(0);
  const hasLoggedRef = useRef(false);

  const sendInteractionLog = (extraFlags = {}) => {
    if (!currentUser) return;
    const videoElement = videoRef.current;
    const durationSec = videoElement?.duration || 15;
    const watchMs = totalWatchTimeRef.current;
    if (watchMs < 800 && !extraFlags.liked && !extraFlags.addedToCart && !extraFlags.shared) {
      return;
    }
    const watchPercentage = Math.min(100, Math.round((watchMs / (durationSec * 1000)) * 100));
    const isSkipped = watchPercentage < 15 && !extraFlags.liked && !extraFlags.addedToCart && !extraFlags.shared;

    // Notify parent about a strong skip so it can track the category client-side
    if (isSkipped && reel.foodItem?.category) {
      onSkip?.(reel.foodItem.category);
    }

    axios.post(
      `${serverUrl}/api/reels/${reel._id}/interaction`,
      {
        watchDurationMs: watchMs,
        watchPercentage,
        liked: extraFlags.liked !== undefined ? extraFlags.liked : isLiked,
        shared: extraFlags.shared || false,
        addedToCart: extraFlags.addedToCart || false,
        skipped: isSkipped
      },
      { withCredentials: true }
    ).catch(() => {});
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    startTimeRef.current = Date.now();
    hasLoggedRef.current = false;
    onImpression?.(reel._id);

    const playPromise = videoElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }

    return () => {
      if (startTimeRef.current) {
        totalWatchTimeRef.current += Date.now() - startTimeRef.current;
      }
      if (!hasLoggedRef.current) {
        sendInteractionLog();
        hasLoggedRef.current = true;
      }
    };
  }, [reel._id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 500);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate("/signin");
      return;
    }
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
    sendInteractionLog({ liked: newLikedState });

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
    sendInteractionLog({ addedToCart: true });
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

  const handleShare = (e) => {
    e.stopPropagation();
    sendInteractionLog({ shared: true });
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Reel link copied to clipboard!");
      }).catch(() => {
        toast.success("Link copied!");
      });
    } else {
      toast.success("Link copied!");
    }
  };

  const handleComment = (e) => {
    e.stopPropagation();
    toast("Comments & reviews coming soon!", { icon: "💬" });
  };

  const handleBookmark = (e) => {
    e.stopPropagation();
    const nextVal = !isBookmarked;
    setIsBookmarked(nextVal);
    toast.success(nextVal ? "Saved to collection!" : "Removed from saved");
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
    <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center select-none font-sans">
      {/* Video Player */}
      <video
        ref={videoRef}
        src={videoSource}
        className="h-full w-full object-cover cursor-pointer"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Ambient Gradient Overlays for readable text and controls */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-50% to-black/90 pointer-events-none" />

      {/* Play / Pause Animated Feedback Icon */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-all">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white scale-110 animate-ping">
            {isPlaying ? (
              <FaPlay className="text-xl ml-1" />
            ) : (
              <div className="flex gap-1.5">
                <div className="w-2 h-6 bg-white rounded" />
                <div className="w-2 h-6 bg-white rounded" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mute Button (Positioned cleanly inside the phone frame) */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/75 text-white p-2.5 rounded-full backdrop-blur-md border border-white/10 transition shadow-lg active:scale-95 cursor-pointer"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
      </button>

      {/* Added to Cart Feedback Toast */}
      {addedToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#ff5200] text-white text-xs font-black px-4 py-2 rounded-full shadow-2xl transition animate-bounce flex items-center gap-2 whitespace-nowrap border border-white/20">
          <FaShoppingBag />
          <span>Added to Cart! 🛒</span>
        </div>
      )}

      {/* Right Action Bar (Inside the Phone Preview Frame) */}
      <div className="absolute right-3.5 bottom-24 z-20 flex flex-col items-center gap-4 text-white">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center group cursor-pointer">
          <div className="p-2.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md group-hover:scale-110 group-active:scale-95 transition">
            {isLiked ? (
              <FaHeart className="text-red-500 text-xl animate-pulse" />
            ) : (
              <FaRegHeart className="text-xl hover:text-red-400" />
            )}
          </div>
          <span className="text-[11px] font-bold mt-1 drop-shadow">{likesCount}</span>
        </button>

        {/* Comment / Chat */}
        <button onClick={handleComment} className="flex flex-col items-center group cursor-pointer">
          <div className="p-2.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md group-hover:scale-110 group-active:scale-95 transition">
            <FaComment className="text-white text-xl" />
          </div>
          <span className="text-[11px] font-bold mt-1 drop-shadow">Chat</span>
        </button>

        {/* Bookmark / Save */}
        <button onClick={handleBookmark} className="flex flex-col items-center group cursor-pointer">
          <div className="p-2.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md group-hover:scale-110 group-active:scale-95 transition">
            {isBookmarked ? (
              <FaBookmark className="text-amber-400 text-xl" />
            ) : (
              <FaRegBookmark className="text-xl hover:text-amber-300" />
            )}
          </div>
          <span className="text-[11px] font-bold mt-1 drop-shadow">Save</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center group cursor-pointer">
          <div className="p-2.5 bg-black/40 border border-white/10 rounded-full backdrop-blur-md group-hover:scale-110 group-active:scale-95 transition">
            <FaShare className="text-white text-xl group-hover:text-[#ff5200]" />
          </div>
          <span className="text-[11px] font-bold mt-1 drop-shadow">Share</span>
        </button>
      </div>

      {/* Bottom Details & Add to Cart Container (Inside Phone Preview) */}
      <div className="absolute left-3.5 right-16 bottom-4 z-20 text-white space-y-2">
        {/* Shop Tag */}
        <div
          onClick={handleNavigateToShop}
          className="flex items-center gap-2 cursor-pointer w-fit group"
        >
          <span className="font-extrabold text-sm group-hover:underline flex items-center gap-1 drop-shadow-md text-white">
            @{shopName.replace(/\s+/g, "").toLowerCase()}
          </span>
          {reel.shop?.city && (
            <span className="bg-white/20 border border-white/10 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded-full text-stone-200">
              📍 {reel.shop.city}
            </span>
          )}
        </div>

        {/* Caption / Title */}
        {reel.title && (
          <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed drop-shadow-sm font-medium">
            {reel.title}
          </p>
        )}

        {/* Food Item Card with 'Add to Cart' */}
        {reel.foodItem && (
          <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-2 rounded-2xl flex items-center justify-between gap-2.5 shadow-2xl">
            <div className="flex items-center gap-2 min-w-0">
              {reel.foodItem.image ? (
                <img
                  src={reel.foodItem.image}
                  alt={reel.foodItem.name}
                  className="w-10 h-10 object-cover rounded-xl border border-white/20 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-[#ff5200] rounded-xl flex items-center justify-center text-white shrink-0">
                  <FaUtensils size={14} />
                </div>
              )}
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span
                    className={`w-2 h-2 rounded-full inline-block shrink-0 ${
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
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1 transition shrink-0 shadow-lg active:scale-95 cursor-pointer"
            >
              <FaShoppingBag size={11} />
              <span>Add</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const slideVariants = {
  enter: (dir) => ({
    y: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      y: { type: "spring", stiffness: 350, damping: 35 },
      opacity: { duration: 0.15 },
    },
  },
  exit: (dir) => ({
    y: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: {
      y: { type: "spring", stiffness: 350, damping: 35 },
      opacity: { duration: 0.15 },
    },
  }),
};

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Onboarding modal: shown to logged-in users whose preferredCuisines is empty.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const dispatch = useDispatch();
  const { userData, currentCity } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const isTransitioningRef = useRef(false);
  const lastWheelTimeRef = useRef(0);
  const touchStartY = useRef(null);

  const goToNext = () => {
    if (isTransitioningRef.current) return;
    if (currentIndex < reels.length - 1) {
      isTransitioningRef.current = true;
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 350);
    }
  };

  const goToPrev = () => {
    if (isTransitioningRef.current) return;
    if (currentIndex > 0) {
      isTransitioningRef.current = true;
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 350);
    }
  };

  const handleWheel = (e) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 450) return;
    if (e.deltaY > 25) {
      lastWheelTimeRef.current = now;
      goToNext();
    } else if (e.deltaY < -25) {
      lastWheelTimeRef.current = now;
      goToPrev();
    }
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (diff > 45) {
      goToNext();
    } else if (diff < -45) {
      goToPrev();
    }
    touchStartY.current = null;
  };

  // Keyboard navigation for desktop (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToPrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, reels.length]);

  // ── Session-level in-memory tracking (no DB, no Redis) ─────────────────────
  // Set of reel _id strings shown so far this session (capped to avoid
  // an unbounded query string). Passed to backend as excludeIds.
  const seenIdsRef = useRef(new Set());

  // Map of category -> skip count for reels strongly skipped this session.
  // Passed to backend as penalizedCategories when count >= 1.
  const skippedCategoryMapRef = useRef({});

  // Queue of reel IDs waiting to be flushed to /api/reels/impressions.
  const impressionQueueRef = useRef([]);

  // Callback handed to ReelCard; fires when the user strongly skips a reel.
  const handleSkip = (category) => {
    if (!category) return;
    skippedCategoryMapRef.current[category] =
      (skippedCategoryMapRef.current[category] || 0) + 1;
  };

  // Flushes the impression queue to the server
  const flushImpressions = () => {
    if (!userData || impressionQueueRef.current.length === 0) return;
    const idsToFlush = [...impressionQueueRef.current];
    impressionQueueRef.current = [];
    axios
      .post(
        `${serverUrl}/api/reels/impressions`,
        { reelIds: idsToFlush },
        { withCredentials: true }
      )
      .catch(() => {});
  };

  // Handed to ReelCard; fires when a reel becomes the active/watched reel.
  const handleImpression = (reelId) => {
    if (!userData || !reelId) return;
    impressionQueueRef.current.push(reelId);
    if (impressionQueueRef.current.length >= 5) {
      flushImpressions();
    }
  };

  // Periodically flush impression queue every 3 seconds, and flush on unmount
  useEffect(() => {
    const interval = setInterval(() => {
      if (impressionQueueRef.current.length > 0) {
        flushImpressions();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (impressionQueueRef.current.length > 0) {
        flushImpressions();
      }
    };
  }, [userData]);

  const isFetchingRef = useRef(false);

  // Reset session when city changes (fresh feed context)
  useEffect(() => {
    seenIdsRef.current = new Set();
    skippedCategoryMapRef.current = {};
    setReels([]);
    setCurrentIndex(0);
    setCurrentPage(1);
    setHasMore(true);
    fetchReels(1, true);
  }, [currentCity]);

  // Show onboarding once when a logged-in user hasn't set any cuisine preferences.
  useEffect(() => {
    if (userData && Array.isArray(userData.preferredCuisines) && userData.preferredCuisines.length === 0) {
      setShowOnboarding(true);
    }
  }, [userData?._id]);

  // Called when user saves or skips onboarding. Reset and refetch so the
  // backend's preference-seed logic runs immediately on the first feed page.
  const handleOnboardingDone = () => {
    setShowOnboarding(false);
    seenIdsRef.current = new Set();
    skippedCategoryMapRef.current = {};
    setReels([]);
    setCurrentIndex(0);
    setCurrentPage(1);
    setHasMore(true);
    fetchReels(1, true);
  };

  // Auto-fetch next page when approaching end of loaded reels
  useEffect(() => {
    if (hasMore && !isFetchingRef.current && reels.length > 0 && reels.length - currentIndex <= 2) {
      setCurrentPage((prev) => {
        const next = prev + 1;
        fetchReels(next);
        return next;
      });
    }
  }, [currentIndex, reels.length, hasMore]);

  /**
   * Fetches one page of reels, appending to the existing feed.
   * @param {number} page          - 1-indexed page number
   * @param {boolean} isReset      - true on first load / filter change
   */
  const fetchReels = async (page = 1, isReset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isReset) setLoading(true);
      else setLoadingMore(true);

      // Build excludeIds from session-seen set (capped at MAX_EXCLUDE_IDS)
      const seenArr = Array.from(seenIdsRef.current);
      const excludeIds = seenArr.slice(-MAX_EXCLUDE_IDS).join(",");

      // Build penalizedCategories from session skip map (include any category
      // with at least 1 strong skip this session)
      const penalizedCategories = Object.keys(skippedCategoryMapRef.current)
        .filter((cat) => skippedCategoryMapRef.current[cat] >= 1)
        .join(",");

      const params = {
        page,
        limit: 10,
        city: currentCity || "",
      };
      if (excludeIds) params.excludeIds = excludeIds;
      if (penalizedCategories) params.penalizedCategories = penalizedCategories;

      const res = await axios.get(`${serverUrl}/api/reels`, {
        params,
        withCredentials: true,
      });

      const incoming = res.data.reels || [];

      // Register new reel IDs as seen
      incoming.forEach((r) => seenIdsRef.current.add(r._id));

      setReels((prev) => (isReset ? incoming : [...prev, ...incoming]));
      setHasMore(res.data.currentPage < res.data.totalPages && incoming.length > 0);
    } catch (err) {
      setError("Failed to load food reels");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const activeReel = reels[currentIndex];

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative h-screen w-full bg-[#09090b] flex items-center justify-center overflow-hidden font-sans select-none"
    >
      {/* Desktop Ambient Background Glow */}
      <div className="hidden sm:block absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,82,0,0.07)_0%,transparent_70%)] pointer-events-none" />

      {/* Cuisine onboarding modal */}
      {showOnboarding && <CuisineOnboarding onDone={handleOnboardingDone} />}

      {/* Top Header Navigation Overlay */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 via-black/30 to-transparent p-4 flex items-center justify-between text-white pointer-events-none">
        <button
          onClick={() => navigate("/")}
          className="pointer-events-auto flex items-center gap-2 bg-black/60 hover:bg-black/90 px-3.5 py-1.5 rounded-full backdrop-blur-md transition text-xs font-bold border border-white/10 shadow active:scale-95 cursor-pointer"
        >
          <FaArrowLeft />
          <span>Home</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 pointer-events-none bg-black/40 px-3.5 py-1 rounded-full border border-white/10 text-xs font-semibold text-stone-300">
          <span className="w-2 h-2 rounded-full bg-[#ff5200] animate-pulse"></span>
          <span>Reelbite Shorts</span>
        </div>

        {userData?.role === "owner" ? (
          <button
            onClick={() => navigate("/owner/reels")}
            className="pointer-events-auto flex items-center gap-1.5 bg-[#ff5200] hover:bg-[#c2410c] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition shadow active:scale-95 cursor-pointer"
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
            No food reels uploaded in {currentCity || "your city"} yet. Check back soon!
          </p>
          {userData?.role === "owner" && (
            <button
              onClick={() => navigate("/owner/reels")}
              className="bg-[#ff5200] hover:bg-[#c2410c] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-lg mt-2 cursor-pointer"
            >
              Upload Reel
            </button>
          )}
        </div>
      ) : (
        /* STRICTLY ONE VIDEO AT A TIME ON THE SCREEN */
        <div className="relative w-full h-full sm:h-[92vh] sm:max-h-[850px] sm:w-[420px] md:w-[430px] sm:rounded-3xl overflow-hidden bg-black sm:border sm:border-white/10 sm:shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {activeReel && (
              <motion.div
                key={activeReel._id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 w-full h-full"
              >
                <ReelCard
                  reel={activeReel}
                  currentUser={userData}
                  onSkip={handleSkip}
                  onImpression={handleImpression}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Reels;
