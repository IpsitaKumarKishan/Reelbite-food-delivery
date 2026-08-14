import React from 'react';
import { Flame, Sparkles, Utensils, Star, Heart, Clock } from 'lucide-react';
import image1 from '../../assets/image1.jpg';
import image2 from '../../assets/image2.webp';
import image3 from '../../assets/image3.jpg';
import image4 from '../../assets/image4.avif';
import image5 from '../../assets/image5.jpg';
import image6 from '../../assets/image6.jpg';
import image7 from '../../assets/image7.jpg';
import image8 from '../../assets/image8.avif';
import image9 from '../../assets/image9.jpg';
import image10 from '../../assets/image10.avif';

export default function MarqueeStrip() {
  const cuisinesRow1 = [
    { title: 'Neapolitan Wood-Fired Pizza', tag: '🔥 Sizzling', image: image4, time: '20m' },
    { title: 'Signature Truffle Smash Burgers', tag: '⭐ Best Seller', image: image5, time: '15m' },
    { title: 'Hyderabadi Dum Biryani', tag: '👑 Royal', image: image2, time: '25m' },
    { title: 'Authentic Crispy Dosa', tag: '🌱 Veg Delight', image: image7, time: '15m' },
    { title: 'Artisanal Gelato & Lava Cakes', tag: '✨ Sweet Treats', image: image3, time: '12m' },
    { title: 'Pan-Asian Dim Sum & Noodles', tag: '🥢 Handcrafted', image: image9, time: '18m' },
  ];

  const cuisinesRow2 = [
    { title: 'Mumbai Gourmet Street Chaat', tag: '🌶️ Spicy', image: image1, time: '10m' },
    { title: 'Creamy Butter Chicken & Naan', tag: '🍲 Classic', image: image8, time: '22m' },
    { title: 'Loaded Gourmet Sandwiches', tag: '🥪 Quick Bite', image: image6, time: '14m' },
    { title: 'Crispy Wings & Loaded Fries', tag: '⚡ Fast Food', image: image10, time: '16m' },
    { title: 'Sourdough Margherita Pizza', tag: '🧀 Cheesy', image: image4, time: '18m' },
    { title: 'Belgian Chocolate Waffles', tag: '🍫 Decadent', image: image3, time: '12m' },
  ];

  return (
    <section className="relative py-12 bg-[#09080c] overflow-hidden border-y border-white/5 select-none">
      {/* Ambient Side Gradient Fades */}
      <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-[#09080c] to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-[#09080c] to-transparent z-10 pointer-events-none" />

      {/* Row 1: Scrolling Left */}
      <div className="flex overflow-hidden py-2">
        <div className="animate-marquee-left flex items-center gap-4">
          {[...cuisinesRow1, ...cuisinesRow1].map((item, index) => (
            <div
              key={`row1-${index}`}
              className="flex items-center gap-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-4 py-2.5 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-[#ff5200]/50 cursor-pointer shadow-lg shrink-0"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-11 w-11 rounded-xl object-cover border border-white/15"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">{item.title}</span>
                  <span className="rounded-full bg-[#ff5200]/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-300">
                    {item.tag}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#ff5200]" /> {item.time}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">Live Kitchen</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Scrolling Right */}
      <div className="flex overflow-hidden py-2 mt-2">
        <div className="animate-marquee-right flex items-center gap-4">
          {[...cuisinesRow2, ...cuisinesRow2].map((item, index) => (
            <div
              key={`row2-${index}`}
              className="flex items-center gap-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-4 py-2.5 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-amber-400/50 cursor-pointer shadow-lg shrink-0"
            >
              <img
                src={item.image}
                alt={item.title}
                className="h-11 w-11 rounded-xl object-cover border border-white/15"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">{item.title}</span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-extrabold text-amber-300">
                    {item.tag}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-stone-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-current" /> 4.9
                  </span>
                  <span>•</span>
                  <span className="text-stone-300 font-medium">Fast Dispatch</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
