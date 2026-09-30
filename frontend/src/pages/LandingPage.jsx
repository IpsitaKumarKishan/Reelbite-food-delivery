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
  const [preloaderDone, setPreloaderDone] = useState(() => {
    return Boolean(sessionStorage.getItem('reelbite_preloader_seen'));
  });

  useEffect(() => {
    // Respect user's motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setPreloaderDone(true);
      return;
    }

    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.6,
    });

    window.__lenis = lenis;

    // Synchronize Lenis scroll position with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Drive Lenis RAF directly from GSAP ticker for 100% unified 60/120fps frame loop
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger at initial mount, layout settlement, and window resize
    const handleRefresh = () => {
      ScrollTrigger.refresh();
    };

    const timer1 = setTimeout(handleRefresh, 250);
    const timer2 = setTimeout(handleRefresh, 800);
    const timer3 = setTimeout(handleRefresh, 1800);

    window.addEventListener('resize', handleRefresh);

    return () => {
      window.removeEventListener('resize', handleRefresh);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      window.__lenis = null;
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  // When preloader finishes, refresh ScrollTrigger to recalculate exact viewport pins
  useEffect(() => {
    if (preloaderDone) {
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [preloaderDone]);

  const openSignIn = () => {
    setAuthMode('signin');
    setLoginModalOpen(true);
  };

  const openSignUp = () => {
    setAuthMode('signup');
    setLoginModalOpen(true);
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#0c0a0f] text-white selection:bg-[#ff5200] selection:text-white">
      {/* Animated Preloader */}
      <Preloader onComplete={() => setPreloaderDone(true)} />

      {/* Main Navigation */}
      <LandingNav onOpenLogin={openSignIn} onOpenSignUp={openSignUp} />

      {/* Hero Section */}
      <LandingHero
        isReady={preloaderDone}
        onOpenSignUp={openSignUp}
        onOpenLogin={openSignIn}
      />

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
