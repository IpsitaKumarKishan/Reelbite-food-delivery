import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Film, Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingNav({ onOpenLogin, onOpenSignUp }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHover, setActiveHover] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Restaurants', href: '#restaurants' },
    { label: 'Food Reels', href: '#reels' },
    { label: 'Metrics', href: '#stats' },
    { label: 'Reviews', href: '#reviews' },
  ];

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (href === '#reels') {
      navigate('/reels');
      return;
    }
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0f0e11]/85 backdrop-blur-xl border-b border-white/10 shadow-2xl py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#ff4d2d] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-[#ff4d2d]/30 group-hover:scale-105 transition-transform duration-200">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-2xl font-black tracking-tight text-white">
                Reel<span className="text-[#ff5200]">bite</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#ff5200]/15 px-2 py-0.5 text-[10px] font-bold text-[#ff5200] border border-[#ff5200]/30">
                <Sparkles className="h-2.5 w-2.5" /> 2.0
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Nav Links with Magnetic Pill Hover */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleScrollTo(e, link.href)}
              onMouseEnter={() => setActiveHover(link.label)}
              onMouseLeave={() => setActiveHover(null)}
              className="relative px-3.5 py-1.5 text-xs font-bold text-stone-300 hover:text-white transition-colors duration-200"
            >
              {activeHover === link.label && (
                <motion.div
                  layoutId="navPill"
                  className="absolute inset-0 rounded-full bg-white/10 -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Watch Reels Button */}
          <button
            onClick={() => navigate('/reels')}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff4d2d]/20 to-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300 border border-amber-500/30 hover:bg-[#ff5200] hover:text-white transition duration-200 cursor-pointer shadow-sm"
          >
            <Film className="h-3.5 w-3.5 animate-pulse text-[#ff5200]" />
            <span>Watch Reels</span>
          </button>

          {/* Sign In Button */}
          <button
            onClick={onOpenLogin}
            className="rounded-full px-4 py-2 text-xs font-bold text-stone-200 hover:text-white hover:bg-white/10 transition duration-200 cursor-pointer"
          >
            Sign In
          </button>

          {/* Sign Up / Order CTA */}
          <button
            onClick={onOpenSignUp}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff4d2d] to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#ff4d2d]/30 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenLogin}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white"
          >
            Sign In
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl bg-white/10 p-2 text-stone-300 hover:text-white transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-[#0f0e11]/95 backdrop-blur-2xl border-b border-white/10 px-4 pt-3 pb-6"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="rounded-xl px-4 py-2.5 text-sm font-bold text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/reels');
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-amber-300"
                >
                  <Film className="h-4 w-4 text-[#ff5200]" />
                  <span>Explore Food Reels</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSignUp();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-amber-500 py-3 text-xs font-bold text-white shadow-lg shadow-[#ff4d2d]/30"
                >
                  <span>Order Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
