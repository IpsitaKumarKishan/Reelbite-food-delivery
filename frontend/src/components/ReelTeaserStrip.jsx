import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { FaPlay, FaFilm } from "react-icons/fa";

const ReelTeaserStrip = () => {
  const [reels, setReels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTeaserReels = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/reels?limit=6`);
        setReels(res.data.reels || []);
      } catch (err) {
        console.error("Failed to load reel teasers:", err);
      }
    };
    fetchTeaserReels();
  }, []);

  if (!reels || reels.length === 0) return null;

  return (
    <section className="py-12 bg-gradient-to-b from-stone-950 to-stone-900 text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-[#ea580c] font-bold text-xs uppercase tracking-widest mb-1">
              <FaFilm />
              <span>Watch & Taste</span>
            </div>
            <h2 className="text-3xl font-black text-amber-50 tracking-tight">
              Food Shorts & Reels
            </h2>
          </div>
          <button
            onClick={() => navigate("/reels")}
            className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-5 py-2.5 rounded-full text-xs font-bold transition shadow-lg flex items-center gap-2"
          >
            <span>Watch All Reels</span>
            <FaPlay size={10} />
          </button>
        </div>

        {/* Horizontal Scroll Strip */}
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x">
          {reels.map((reel) => {
            const videoSource = reel.videoUrl.startsWith("http")
              ? reel.videoUrl
              : `${serverUrl}${reel.videoUrl}`;

            return (
              <div
                key={reel._id}
                onClick={() => navigate("/reels")}
                className="flex-none w-44 sm:w-56 h-80 rounded-2xl overflow-hidden relative group cursor-pointer snap-start border border-amber-500/20 shadow-2xl bg-black"
              >
                <video
                  src={videoSource}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition" />

                {/* Play Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#ea580c]/80 text-white flex items-center justify-center shadow-xl group-hover:scale-125 transition backdrop-blur-sm">
                    <FaPlay className="ml-1 text-sm" />
                  </div>
                </div>

                {/* Bottom Overlay Text */}
                <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                  <p className="text-xs font-bold text-amber-300 truncate">
                    {reel.shop?.name || reel.owner?.fullName || "Reelbite"}
                  </p>
                  {reel.caption && (
                    <p className="text-[11px] text-stone-200 line-clamp-2 font-medium leading-snug">
                      {reel.caption}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ReelTeaserStrip;
