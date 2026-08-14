import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Sparkles } from 'lucide-react';

export default function Preloader({ onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Check if user already saw preloader in this session
    const hasSeen = sessionStorage.getItem('reelbite_preloader_seen');
    if (hasSeen) {
      setShow(false);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem('reelbite_preloader_seen', 'true');
      setShow(false);
      setTimeout(() => {
        onComplete?.();
      }, 500); // Allow exit transition to complete
    }, 1100);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0d0d0f] text-white select-none overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute w-72 h-72 rounded-full bg-[#ff5200]/25 blur-[90px] pointer-events-none animate-pulse-glow" />

          {/* Icon Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4d2d] to-amber-500 shadow-2xl shadow-[#ff4d2d]/40"
          >
            <UtensilsCrossed className="h-8 w-8 text-white animate-bounce" />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -top-1.5 -right-1.5"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
            </motion.div>
          </motion.div>

          {/* Staggered Wordmark */}
          <div className="flex items-center gap-1 overflow-hidden font-display text-4xl sm:text-5xl font-black tracking-tight">
            {"Reelbite".split("").map((letter, idx) => (
              <motion.span
                key={idx}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.45,
                  delay: 0.15 + idx * 0.04,
                  ease: [0.215, 0.61, 0.355, 1],
                }}
                className={idx >= 4 ? "text-[#ff5200]" : "text-white"}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-3 text-xs sm:text-sm font-medium tracking-widest uppercase text-stone-400"
          >
            Taste the Experience
          </motion.p>

          {/* Progress Bar Line */}
          <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-stone-800">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
              className="h-full w-full bg-gradient-to-r from-transparent via-[#ff5200] to-amber-400"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
