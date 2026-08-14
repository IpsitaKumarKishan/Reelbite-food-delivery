import React, { useState, useEffect, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Preloader from '../components/landing/Preloader';
import LandingNav from '../components/landing/LandingNav';
import LandingHero from '../components/landing/LandingHero';
import MarqueeStrip from '../components/landing/MarqueeStrip';
import HowItWorks from '../components/landing/HowItWorks';
import LoginModal from '../components/landing/LoginModal';

// Code-splitting below-the-fold components
const RestaurantShowcase = lazy(() => import('../components/landing/RestaurantShowcase'));
const StatsCounter = lazy(() => import('../components/landing/StatsCounter'));
const Testimonials = lazy(() => import('../components/landing/Testimonials'));
const FinalCTA = lazy(() => import('../components/landing/FinalCTA'));
const LandingFooter = lazy(() => import('../components/landing/LandingFooter'));

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [preloaderDone, setPreloaderDone] = useState(false);

  useEffect(() => {
    // Respect user's motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };
    const rafId = requestAnimationFrame(raf);

    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger when DOM is fully settled
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeout);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  const openSignIn = () => {
    setAuthMode('signin');
    setLoginModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setLoginModalOpen(true);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0c0a0f] text-white selection:bg-[#ff5200] selection:text-white">
      {/* Animated Preloader */}
      <Preloader onComplete={() => setPreloaderDone(true)} />

      {/* Main Navigation */}
      <LandingNav onOpenLogin={openSignIn} onOpenSignUp={openSignUp} />

      {/* Hero Section */}
      <LandingHero onOpenSignUp={openSignUp} onOpenLogin={openSignIn} />

      {/* Infinite Marquee Strip */}
      <MarqueeStrip />

      {/* Pinned How It Works */}
      <HowItWorks onOpenSignUp={openSignUp} />

      {/* Below-the-fold Lazy Loaded Sections */}
      <Suspense
        fallback={
          <div className="py-20 flex items-center justify-center text-stone-500 text-xs">
            Loading delicious experience...
          </div>
        }
      >
        {/* Horizontal Restaurant / Reel Showcase */}
        <RestaurantShowcase onOpenSignUp={openSignUp} />

        {/* Animated Metrics */}
        <StatsCounter />

        {/* Community Testimonials */}
        <Testimonials />

        {/* Full-bleed Final CTA */}
        <FinalCTA onOpenSignUp={openSignUp} />

        {/* Footer */}
        <LandingFooter onOpenLogin={openSignIn} onOpenSignUp={openSignUp} />
      </Suspense>

      {/* Auth Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
