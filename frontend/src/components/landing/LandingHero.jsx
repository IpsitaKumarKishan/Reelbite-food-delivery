import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Zap, Film, Star, Play, Sparkles } from 'lucide-react';
import useMagnetic from '../../hooks/useMagnetic';
import { useNavigate } from 'react-router-dom';
import homeImg from '../../assets/home.png';
import burgerImg from '../../assets/image5.jpg';
import pizzaImg from '../../assets/image4.avif';
import dessertImg from '../../assets/image3.jpg';

export default function LandingHero({ onOpenSignUp, onOpenLogin }) {
  const primaryMagneticRef = useMagnetic(0.3, 20);
  const secondaryMagneticRef = useMagnetic(0.2, 15);
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const headlineWords = [
    { text: 'Craving', highlight: false },
    { text: 'something', highlight: false },
    { text: 'delicious?', highlight: true },
    { text: "We're", highlight: false },
    { text: 'already', highlight: false },
    { text: 'on', highlight: false },
    { text: 'the', highlight: false },
    { text: 'way.', highlight: true },
  ];

  return (
    <section
      ref={heroRef}
      className="relative min-h-[92vh] sm:min-h-screen w-full flex items-center justify-center pt-28 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0c0a0f] text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#ff4d2d]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Pattern Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left Column: Kinetic Text & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
          {/* Tagline Pill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md mb-6 shadow-inner"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#ff5200] animate-ping" />
            <span className="text-xs font-bold text-stone-300 tracking-wide">
              ⚡ Ultra-fast 20-min delivery & live video reels
            </span>
          </motion.div>

          {/* Kinetic Headline with Staggered Word Reveal */}
          <h1 className="font-display text-4xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[1.08] text-white">
            {headlineWords.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 35, rotateZ: 2 }}
                animate={{ opacity: 1, y: 0, rotateZ: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + index * 0.06,
                  ease: [0.215, 0.61, 0.355, 1],
                }}
                className={`inline-block mr-2.5 sm:mr-3.5 ${
                  word.highlight
                    ? 'bg-gradient-to-r from-[#ff4d2d] via-[#ff6b4a] to-amber-400 bg-clip-text text-transparent'
                    : 'text-white'
                }`}
              >
                {word.text}
              </motion.span>
            ))}
          </h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-6 max-w-2xl text-base sm:text-lg text-stone-300 font-normal leading-relaxed"
          >
            Explore top-rated local eateries, watch real-time 4K food reels, and indulge in gourmet flavors delivered piping-hot to your doorstep with live GPS tracking.
          </motion.p>

          {/* CTA Button Group with Magnetic Physics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            {/* Primary Magnetic CTA */}
            <div ref={primaryMagneticRef} className="w-full sm:w-auto">
              <button
                onClick={onOpenSignUp}
                className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ff4d2d] via-[#ff5b36] to-amber-500 px-8 py-4 font-display text-base font-bold text-white shadow-xl shadow-[#ff4d2d]/35 hover:shadow-2xl hover:shadow-[#ff4d2d]/50 hover:scale-[1.03] active:scale-[0.98] transition duration-200 cursor-pointer"
              >
                <span>Order Now</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>

            {/* Secondary Magnetic CTA */}
            <div ref={secondaryMagneticRef} className="w-full sm:w-auto">
              <button
                onClick={() => {
                  const el = document.getElementById('restaurants');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                  else navigate('/reels');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 px-7 py-4 font-display text-base font-bold text-stone-200 hover:text-white transition duration-200 backdrop-blur-md cursor-pointer"
              >
                <Film className="h-4 w-4 text-[#ff5200]" />
                <span>Explore Restaurants</span>
              </button>
            </div>
          </motion.div>

          {/* Trust Metrics Pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.05 }}
            className="mt-10 flex items-center gap-6 text-stone-400 text-xs font-semibold"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border-2 border-[#0c0a0f] bg-gradient-to-tr from-[#ff4d2d] to-amber-400 flex items-center justify-center text-[9px] font-black text-white"
                  >
                    ★
                  </div>
                ))}
              </div>
              <span className="text-stone-300 font-bold ml-1">4.9/5 Rating</span>
            </div>
            <div className="h-3 w-[1px] bg-white/20" />
            <div>
              <span className="text-white font-bold">10,000+</span> Satisfied Foodies
            </div>
          </motion.div>
        </div>

        {/* Right Column: Visual Hero Montage / Parallax Cards */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          {/* Main Visual Centerpiece */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[420px] aspect-square rounded-3xl overflow-hidden p-2 bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-2xl backdrop-blur-xl group"
          >
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-stone-900">
              <img
                src={homeImg || pizzaImg}
                alt="Delicious Gourmet Feast"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Bottom Card Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src={burgerImg}
                    alt="Smash Burger"
                    className="h-11 w-11 rounded-xl object-cover border border-white/20"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">The Artisan Smash</h4>
                    <p className="text-[11px] text-[#ff5200] font-semibold">Free Delivery • 18 min</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/reels')}
                  className="h-9 w-9 rounded-full bg-[#ff5200] text-white flex items-center justify-center shadow-lg shadow-[#ff5200]/40 hover:scale-110 transition"
                  aria-label="Play Reel"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Floating Pill 1: Fast Delivery (Top Right) */}
          <motion.div
            initial={{ opacity: 0, x: 40, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="absolute -top-6 -right-2 sm:-right-6 flex items-center gap-2.5 rounded-2xl bg-stone-900/90 border border-white/15 px-4 py-2.5 backdrop-blur-xl shadow-2xl animate-float-gentle"
          >
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Average Speed</div>
              <div className="text-xs font-black text-white">⚡ 18-22 Mins</div>
            </div>
          </motion.div>

          {/* Floating Pill 2: 4K Reels (Bottom Left) */}
          <motion.div
            initial={{ opacity: 0, x: -40, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="absolute -bottom-6 -left-2 sm:-left-8 flex items-center gap-3 rounded-2xl bg-stone-900/90 border border-white/15 px-4 py-3 backdrop-blur-xl shadow-2xl"
          >
            <div className="h-9 w-9 rounded-xl bg-[#ff4d2d]/20 text-[#ff4d2d] flex items-center justify-center">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white">Video Feed</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-stone-400 font-medium">Watch chefs craft dishes</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
