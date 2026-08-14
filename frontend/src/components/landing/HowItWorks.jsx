import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Film, ShoppingBag, MapPin, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import image4 from '../../assets/image4.avif';
import image5 from '../../assets/image5.jpg';
import scooterImg from '../../assets/scooter.png';
import homeImg from '../../assets/home.png';

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks({ onOpenSignUp }) {
  const containerRef = useRef(null);
  const leftColRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 1,
      title: 'Watch & Browse',
      subtitle: 'Video-First Discovery',
      description:
        'Swipe through 4K food reels from top neighborhood kitchens. See how dishes are prepared fresh before you decide what to eat.',
      badge: 'Reel Feed',
      icon: Film,
      image: image5,
      accent: 'from-[#ff4d2d] to-amber-500',
    },
    {
      id: 2,
      title: 'Customize & Order',
      subtitle: 'One-Tap Precision',
      description:
        'Tailor your cravings with flexible toppings, portion choices, and secure instant payments via cards, UPI, or Cash on Delivery.',
      badge: 'Instant Cart',
      icon: ShoppingBag,
      image: image4,
      accent: 'from-amber-500 to-yellow-400',
    },
    {
      id: 3,
      title: 'Live GPS Tracking',
      subtitle: 'Real-Time Precision',
      description:
        'Watch your delivery partner cruise across the map in real-time. Transparent milestones from the stove to your front door.',
      badge: 'Live Map',
      icon: MapPin,
      image: scooterImg,
      accent: 'from-emerald-500 to-teal-400',
    },
    {
      id: 4,
      title: 'Unbox & Devour',
      subtitle: 'Pure Satisfaction',
      description:
        'Receive your sealed, thermally insulated order right on time. Fresh, aromatic, and piping-hot flavors every single time.',
      badge: 'Delivered',
      icon: Sparkles,
      image: homeImg,
      accent: 'from-[#ff4d2d] to-pink-500',
    },
  ];

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: '+=200%',
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress;
          const stepIndex = Math.min(
            steps.length - 1,
            Math.floor(progress * steps.length)
          );
          setActiveStep(stepIndex);
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [steps.length]);

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative min-h-screen w-full bg-[#0c0a0f] text-white flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-96 h-96 rounded-full bg-[#ff4d2d]/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md mb-4">
            <span className="h-2 w-2 rounded-full bg-[#ff5200]" />
            <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">
              The Reelbite Flow
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white">
            How Reelbite Delivers <span className="text-[#ff5200]">Magic</span>
          </h2>
          <p className="mt-4 text-stone-400 text-sm sm:text-base">
            From craving to doorbell in 4 frictionless steps. Experience food delivery reimagined.
          </p>
        </div>

        {/* Interactive Pinned Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Interactive Step Cards */}
          <div ref={leftColRef} className="lg:col-span-6 space-y-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`group relative rounded-2xl p-5 sm:p-6 transition-all duration-500 cursor-pointer border ${
                    isActive
                      ? 'bg-white/[0.08] border-[#ff5200]/50 shadow-xl shadow-[#ff5200]/10 scale-[1.02]'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] opacity-50 hover:opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${step.accent} text-white shadow-md transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#ff5200]">
                            Step 0{step.id}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-stone-500" />
                          <span className="text-xs font-semibold text-stone-400">{step.subtitle}</span>
                        </div>
                        {isActive && (
                          <span className="rounded-full bg-[#ff5200]/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-[#ff5200]/30">
                            {step.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-lg sm:text-xl font-bold text-white mt-1">
                        {step.title}
                      </h3>

                      <p
                        className={`text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed transition-all duration-300 ${
                          isActive ? 'block' : 'hidden sm:line-clamp-1'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Progress Line on Active Card */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-2xl bg-white/10">
                      <div className="h-full w-full bg-gradient-to-r from-[#ff4d2d] to-amber-400 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Visual Showcase Preview */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative w-full max-w-[460px] aspect-[4/3] rounded-3xl overflow-hidden p-2 bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-2xl backdrop-blur-xl">
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-stone-950 flex items-center justify-center">
                <img
                  src={steps[activeStep].image}
                  alt={steps[activeStep].title}
                  className="w-full h-full object-cover transition-all duration-700 ease-out transform scale-100 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Live Preview Floating Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[11px] font-bold text-white">Live Step 0{activeStep + 1}</span>
                </div>

                {/* Bottom Card Context */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-black text-[#ff5200] tracking-wider">
                        {steps[activeStep].subtitle}
                      </span>
                      <h4 className="text-sm font-black text-white">{steps[activeStep].title}</h4>
                    </div>
                    <button
                      onClick={onOpenSignUp}
                      className="flex items-center gap-1.5 rounded-full bg-[#ff5200] px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-[#ff5200]/30 hover:opacity-90 transition cursor-pointer"
                    >
                      <span>Try It</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
