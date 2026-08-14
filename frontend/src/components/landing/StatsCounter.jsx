import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShoppingBag, Store, Clock, Award, TrendingUp, Users } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function StatsCounter() {
  const sectionRef = useRef(null);
  const [counts, setCounts] = useState({
    orders: 0,
    restaurants: 0,
    time: 0,
    satisfaction: 0,
  });

  const stats = [
    {
      id: 'orders',
      target: 10000,
      prefix: '',
      suffix: '+',
      label: 'Delivered Orders',
      description: 'Piping-hot meals delivered across neighborhoods',
      icon: ShoppingBag,
      accent: 'from-[#ff4d2d] to-amber-500',
    },
    {
      id: 'restaurants',
      target: 500,
      prefix: '',
      suffix: '+',
      label: 'Partner Kitchens',
      description: 'Top-tier curated dining spots & cloud kitchens',
      icon: Store,
      accent: 'from-amber-500 to-yellow-400',
    },
    {
      id: 'time',
      target: 20,
      prefix: '~',
      suffix: ' min',
      label: 'Avg. Delivery Time',
      description: 'Hyper-local route optimization for maximum freshness',
      icon: Clock,
      accent: 'from-emerald-500 to-teal-400',
    },
    {
      id: 'satisfaction',
      target: 99.8,
      prefix: '',
      suffix: '%',
      label: 'Satisfaction Rate',
      description: 'Based on over 50,000+ verified customer reviews',
      icon: Award,
      accent: 'from-[#ff4d2d] to-pink-500',
      isDecimal: true,
    },
  ];

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCounts({
        orders: 10000,
        restaurants: 500,
        time: 20,
        satisfaction: 99.8,
      });
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          const proxy = {
            orders: 0,
            restaurants: 0,
            time: 0,
            satisfaction: 0,
          };

          gsap.to(proxy, {
            orders: 10000,
            restaurants: 500,
            time: 20,
            satisfaction: 99.8,
            duration: 2.2,
            ease: 'power2.out',
            onUpdate: () => {
              setCounts({
                orders: Math.floor(proxy.orders),
                restaurants: Math.floor(proxy.restaurants),
                time: Math.floor(proxy.time),
                satisfaction: Number(proxy.satisfaction.toFixed(1)),
              });
            },
          });
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="relative py-24 bg-[#0a090e] text-white overflow-hidden border-t border-white/5"
    >
      {/* Glow Centerpiece */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#ff4d2d]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md mb-4">
            <TrendingUp className="h-3.5 w-3.5 text-[#ff5200]" />
            <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">
              Impact in Numbers
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white">
            Fast, Fresh & <span className="text-[#ff5200]">Proven</span>
          </h2>
          <p className="mt-4 text-stone-400 text-sm sm:text-base">
            Every day, thousands of food lovers count on Reelbite for their daily meals and celebratory feasts.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const displayValue = counts[stat.id];

            return (
              <div
                key={stat.id}
                className="group relative rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 p-6 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.03] hover:border-[#ff5200]/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${stat.accent} text-white shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Verified
                    </span>
                  </div>

                  {/* Counter Value */}
                  <div className="font-display text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
                    <span className="text-[#ff5200]">{stat.prefix}</span>
                    {stat.isDecimal
                      ? displayValue.toFixed(1)
                      : displayValue.toLocaleString()}
                    <span className="text-amber-400">{stat.suffix}</span>
                  </div>

                  <h3 className="font-display text-base font-bold text-white mb-1">
                    {stat.label}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {stat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-stone-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Real-time platform metrics</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
