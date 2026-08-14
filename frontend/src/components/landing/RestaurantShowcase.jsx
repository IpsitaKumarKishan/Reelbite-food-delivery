import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, Clock, Flame, Film, ArrowUpRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import image1 from '../../assets/image1.jpg';
import image2 from '../../assets/image2.webp';
import image4 from '../../assets/image4.avif';
import image5 from '../../assets/image5.jpg';
import image7 from '../../assets/image7.jpg';
import image9 from '../../assets/image9.jpg';

gsap.registerPlugin(ScrollTrigger);

export default function RestaurantShowcase({ onOpenSignUp }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const navigate = useNavigate();

  const showcaseItems = [
    {
      id: 1,
      name: 'La Pizzeria Bella',
      cuisine: 'Italian • Artisan Wood-Fired',
      rating: '4.9',
      reviews: '1.2k',
      time: '18-22 min',
      price: '$$',
      image: image4,
      tag: 'Chef Choice 🔥',
      dish: 'Truffle Burrata Margherita',
    },
    {
      id: 2,
      name: 'The Burger Foundry',
      cuisine: 'Gourmet American • Burgers',
      rating: '4.8',
      reviews: '890',
      time: '15-20 min',
      price: '$',
      image: image5,
      tag: 'Trending 🚀',
      dish: 'Double Smoked Angus Burger',
    },
    {
      id: 3,
      name: 'Royal Dawat Palace',
      cuisine: 'Mughlai • Dum Biryani',
      rating: '4.9',
      reviews: '2.5k',
      time: '20-25 min',
      price: '$$$',
      image: image2,
      tag: 'Heritage Special 👑',
      dish: 'Zafrani Mutton Dum Biryani',
    },
    {
      id: 4,
      name: 'Dakshin Aroma',
      cuisine: 'South Indian • Traditional',
      rating: '4.7',
      reviews: '640',
      time: '12-18 min',
      price: '$',
      image: image7,
      tag: 'Pure Veg 🌱',
      dish: 'Ghee Roast Mysore Masala Dosa',
    },
    {
      id: 5,
      name: 'Dragon Wok Express',
      cuisine: 'Pan-Asian • Dim Sum',
      rating: '4.8',
      reviews: '920',
      time: '16-22 min',
      price: '$$',
      image: image9,
      tag: 'Spicy Delight 🌶️',
      dish: 'Schezwan Chili Garlic Noodles',
    },
    {
      id: 6,
      name: 'Chaat Chowk',
      cuisine: 'Street Food • Snacks',
      rating: '4.9',
      reviews: '1.8k',
      time: '10-15 min',
      price: '$',
      image: image1,
      tag: 'Local Favorite ⭐',
      dish: 'Crispy Pani Puri & Sev Puri',
    },
  ];

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const track = trackRef.current;
    const section = sectionRef.current;
    if (!track || !section) return;

    const ctx = gsap.context(() => {
      // Calculate total horizontal scroll distance
      const scrollDistance = track.scrollWidth - window.innerWidth + 80;

      if (scrollDistance > 0 && window.innerWidth >= 768) {
        gsap.to(track, {
          x: () => -scrollDistance,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${scrollDistance}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="restaurants"
      ref={sectionRef}
      className="relative min-h-screen w-full bg-[#08070b] text-white flex flex-col justify-center py-20 overflow-hidden"
    >
      {/* Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md mb-3">
              <Sparkles className="h-3.5 w-3.5 text-[#ff5200]" />
              <span className="text-xs font-bold text-stone-300 uppercase tracking-widest">
                Featured Partners & Reels
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white">
              Cuisines That <span className="text-[#ff5200]">Steal the Show</span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reels')}
              className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 text-xs font-bold text-stone-200 transition cursor-pointer"
            >
              <Film className="h-4 w-4 text-[#ff5200]" />
              <span>Explore All Reels Feed</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div className="w-full overflow-x-auto md:overflow-hidden pl-4 sm:pl-8 lg:pl-12 no-scrollbar">
        <div
          ref={trackRef}
          className="flex gap-6 py-4 w-max pr-8 sm:pr-16"
        >
          {showcaseItems.map((item) => (
            <div
              key={item.id}
              onClick={onOpenSignUp}
              className="group relative w-[280px] sm:w-[340px] rounded-3xl overflow-hidden bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 p-3.5 backdrop-blur-xl shadow-xl transition-all duration-300 hover:scale-[1.03] hover:border-[#ff5200]/50 cursor-pointer shrink-0"
            >
              {/* Image Container with Zoom Reveal */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-amber-300 border border-white/10">
                  {item.tag}
                </div>

                {/* Reel Trigger Button */}
                <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-[#ff5200] text-white flex items-center justify-center shadow-lg shadow-[#ff5200]/40 group-hover:scale-110 transition">
                  <Film className="h-4 w-4" />
                </div>

                {/* Dish Overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                    Signature Dish
                  </span>
                  <div className="text-xs font-bold text-white truncate">{item.dish}</div>
                </div>
              </div>

              {/* Card Metadata */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-white group-hover:text-[#ff5200] transition-colors">
                    {item.name}
                  </h3>
                  <span className="text-xs font-bold text-stone-400">{item.price}</span>
                </div>

                <p className="text-xs text-stone-400 mt-0.5">{item.cuisine}</p>

                {/* Stats Footer */}
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/10 text-xs font-semibold text-stone-300">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-current" />
                    <span className="text-white font-bold">{item.rating}</span>
                    <span className="text-stone-500">({item.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
