import React from 'react';
import { Star, Quote, Heart, CheckCircle, Sparkles } from 'lucide-react';
import image3 from '../../assets/image3.jpg';
import image5 from '../../assets/image5.jpg';
import image6 from '../../assets/image6.jpg';

export default function Testimonials() {
  const testimonials = [
    {
      id: 1,
      name: 'Aanya Sharma',
      role: 'Food Blogger & Connoisseur',
      city: 'Bhubaneswar',
      rating: 5,
      comment:
        'The Reels feed is revolutionary! Being able to see the pizza crust bubble up in 4K before placing my order gave me total confidence. Arrived in just 17 minutes steaming hot!',
      favoriteDish: 'Truffle Burrata Pizza',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 2,
      name: 'Rohan Mehta',
      role: 'Tech Lead & Late Night Foodie',
      city: 'Bengaluru',
      rating: 5,
      comment:
        'Live tracking is dead accurate. I watched the rider navigate straight to my apartment gate. The packaging was completely spill-proof and the smash burgers were exceptional.',
      favoriteDish: 'Double Truffle Smash Burger',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    },
    {
      id: 3,
      name: 'Priyanka Sen',
      role: 'Culinary Enthusiast',
      city: 'Kolkata',
      rating: 5,
      comment:
        'Reelbite brings the street vibrancy of local kitchens directly to your phone. We order every weekend for family gatherings. 10/10 recommendation!',
      favoriteDish: 'Zafrani Dum Biryani',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    },
  ];

  return (
    <section
      id="reviews"
      className="relative py-24 bg-[#0c0a0f] text-white overflow-hidden border-t border-white/5"
    >
      {/* Background Ambience */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md mb-4">
            <Sparkles className="h-3.5 w-3.5 text-[#ff5200]" />
            <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">
              Community Love
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white">
            Loved by <span className="text-[#ff5200]">Over 10,000+ Foodies</span>
          </h2>
          <p className="mt-4 text-stone-400 text-sm sm:text-base">
            Discover why food lovers choose Reelbite for genuine food discovery and blazing-fast delivery.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-3xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#ff5200]/40 flex flex-col justify-between"
            >
              <div>
                {/* Header with Avatar and Stars */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="h-12 w-12 rounded-2xl object-cover border-2 border-[#ff5200]/40"
                    />
                    <div>
                      <h4 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{item.name}</span>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
                      </h4>
                      <p className="text-[11px] text-stone-400 font-medium">
                        {item.role} • {item.city}
                      </p>
                    </div>
                  </div>
                  <Quote className="h-6 w-6 text-[#ff5200]/40 group-hover:text-[#ff5200] transition-colors" />
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(item.rating)].map((_, idx) => (
                    <Star
                      key={idx}
                      className="h-4 w-4 text-amber-400 fill-current"
                    />
                  ))}
                </div>

                {/* Review Body */}
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed italic">
                  "{item.comment}"
                </p>
              </div>

              {/* Card Footer: Favorite Dish */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-stone-400 font-medium">Top Craving:</span>
                <span className="font-bold text-[#ff5200]">{item.favoriteDish}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
