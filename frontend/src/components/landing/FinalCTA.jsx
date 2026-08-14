import React from 'react';
import { ArrowRight, Sparkles, UtensilsCrossed, ShieldCheck, Clock, Zap } from 'lucide-react';
import useMagnetic from '../../hooks/useMagnetic';

export default function FinalCTA({ onOpenSignUp }) {
  const ctaMagneticRef = useMagnetic(0.35, 25);

  return (
    <section className="relative py-28 px-4 sm:px-6 lg:px-8 bg-[#09080c] overflow-hidden text-white border-t border-white/5">
      {/* Background Ambience & Glow Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-[#ff4d2d]/25 via-amber-500/20 to-purple-600/20 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative max-w-5xl mx-auto text-center z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md mb-6 shadow-inner">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">
            Join the Reelbite Tribe
          </span>
        </div>

        {/* Big Kinetic Title */}
        <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.08] text-white">
          Ready to taste the <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#ff4d2d] via-amber-400 to-[#ff6b4a] bg-clip-text text-transparent">
            food revolution?
          </span>
        </h2>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl mx-auto text-stone-300 text-base sm:text-lg font-normal leading-relaxed">
          Order from your neighborhood’s finest kitchens, explore 4K video reels, and enjoy hot delivery in under 20 minutes.
        </p>

        {/* Magnetic Primary CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div ref={ctaMagneticRef}>
            <button
              onClick={onOpenSignUp}
              className="flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#ff4d2d] via-[#ff5b36] to-amber-500 px-9 py-4 font-display text-base sm:text-lg font-extrabold text-white shadow-2xl shadow-[#ff4d2d]/40 hover:shadow-[#ff4d2d]/60 hover:scale-[1.04] active:scale-[0.98] transition duration-200 cursor-pointer"
            >
              <UtensilsCrossed className="h-5 w-5" />
              <span>Start Your Order Now</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-semibold text-stone-400">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#ff5200]" />
            <span>20 Min Avg Dispatch</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>100% Hygienic Packaging</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Live GPS Tracking</span>
          </div>
        </div>
      </div>
    </section>
  );
}
