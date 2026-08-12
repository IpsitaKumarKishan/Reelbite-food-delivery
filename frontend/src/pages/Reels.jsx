import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { addToCart, updateUserDietPreference, updateUserPreferredCuisines } from "../redux/userSlice";
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

const ReelCard = ({ reel, currentUser, onSkip }) => {
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

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTimeRef.current = Date.now();
            hasLoggedRef.current = false;
            videoElement
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          } else {
            if (startTimeRef.current) {
              totalWatchTimeRef.current += Date.now() - startTimeRef.current;
              startTimeRef.current = null;
            }
            videoElement.pause();
            setIsPlaying(false);
            if (!hasLoggedRef.current) {
              sendInteractionLog();
              hasLoggedRef.current = true;
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoElement);

    return () => {
      observer.unobserve(videoElement);
      if (startTimeRef.current) {
        totalWatchTimeRef.current += Date.now() - startTimeRef.current;
      }
      if (!hasLoggedRef.current) {
        sendInteractionLog();
      }
    };
  }, [reel._id, currentUser]);

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Onboarding modal: shown to logged-in users whose preferredCuisines is empty.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const dispatch = useDispatch();
  const { userData, currentCity } = useSelector((state) => state.user);
  const navigate = useNavigate();

  // ── Session-level in-memory tracking (no DB, no Redis) ─────────────────────
  // Set of reel _id strings shown so far this session (capped to avoid
  // an unbounded query string). Passed to backend as excludeIds.
  const seenIdsRef = useRef(new Set());

  // Map of category -> skip count for reels strongly skipped this session.
  // Passed to backend as penalizedCategories when count >= 1.
  const skippedCategoryMapRef = useRef({});

  // Callback handed to ReelCard; fires when the user strongly skips a reel.
  const handleSkip = (category) => {
    if (!category) return;
    skippedCategoryMapRef.current[category] =
      (skippedCategoryMapRef.current[category] || 0) + 1;
  };

  // Sentinel div at the bottom of the feed; triggers next-page load.
  const loadMoreRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Reset session when city or diet changes (fresh feed context)
  useEffect(() => {
    seenIdsRef.current = new Set();
    skippedCategoryMapRef.current = {};
    setReels([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchReels(1, true);
  }, [currentCity, userData?.dietPreference]);

  // Show onboarding once when a logged-in user hasn't set any cuisine preferences.
  useEffect(() => {
    if (userData && Array.isArray(userData.preferredCuisines) && userData.preferredCuisines.length === 0) {
      setShowOnboarding(true);
    }
  }, [userData?._id]); // fire once per user session, not on every re-render

  // Called when user saves or skips onboarding. Reset and refetch so the
  // backend's preference-seed logic runs immediately on the first feed page.
  const handleOnboardingDone = () => {
    setShowOnboarding(false);
    seenIdsRef.current = new Set();
    skippedCategoryMapRef.current = {};
    setReels([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchReels(1, true);
  };

  // Infinite-scroll observer
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          setCurrentPage((prev) => {
            const next = prev + 1;
            fetchReels(next);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, currentCity, userData?.dietPreference]);

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
        dietPreference: userData?.dietPreference || "all",
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
      {/* Cuisine onboarding modal — shown once for new users with no preferences */}
      {showOnboarding && <CuisineOnboarding onDone={handleOnboardingDone} />}

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
            <ReelCard
              key={reel._id}
              reel={reel}
              currentUser={userData}
              onSkip={handleSkip}
            />
          ))}

          {/* Sentinel: entering viewport triggers next page load */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="h-screen w-full snap-start snap-always flex items-center justify-center bg-black"
            >
              {loadingMore && (
                <div className="w-10 h-10 border-4 border-[#ff5200] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reels;
