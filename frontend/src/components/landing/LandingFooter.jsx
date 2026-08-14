import React from 'react';
import { UtensilsCrossed, Film, Heart, ArrowUp } from 'lucide-react';
import { FaInstagram, FaTwitter, FaYoutube, FaFacebook } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

export default function LandingFooter({ onOpenLogin, onOpenSignUp }) {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cuisines = [
    'Artisan Pizzas',
    'Smash Burgers',
    'Dum Biryani',
    'South Indian Dosa',
    'Pan-Asian Dim Sum',
    'Gourmet Desserts',
    'Street Chaat',
    'North Indian Curries',
  ];

  const quickLinks = [
    { label: 'Watch Food Reels', action: () => navigate('/reels') },
    { label: 'Sign In to Account', action: onOpenLogin },
    { label: 'Register New Account', action: onOpenSignUp },
    { label: 'Partner with Reelbite', action: onOpenSignUp },
  ];

  return (
    <footer className="relative bg-[#060508] text-stone-400 text-xs border-t border-white/5 pt-16 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/5">
          {/* Col 1 & 2: Brand Info */}
          <div className="lg:col-span-2">
            <div
              onClick={scrollToTop}
              className="flex items-center gap-2.5 cursor-pointer group mb-4 select-none inline-flex"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#ff4d2d] to-amber-500 flex items-center justify-center text-white shadow-lg shadow-[#ff4d2d]/30">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <span className="font-display text-2xl font-black tracking-tight text-white">
                Reel<span className="text-[#ff5200]">bite</span>
              </span>
            </div>

            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              Reelbite is the next-generation video-first food delivery network. Watch chefs prepare exquisite meals live on 4K reels and get hot food delivered in under 20 minutes.
            </p>

            <div className="flex items-center gap-3 mt-6">
              {[
                { icon: FaInstagram, href: '#' },
                { icon: FaTwitter, href: '#' },
                { icon: FaYoutube, href: '#' },
                { icon: FaFacebook, href: '#' },
              ].map((social, idx) => {
                const Icon = social.icon;
                return (
                  <a
                    key={idx}
                    href={social.href}
                    className="h-9 w-9 rounded-xl bg-white/5 hover:bg-[#ff5200] text-stone-300 hover:text-white flex items-center justify-center transition duration-200 border border-white/10"
                    aria-label="Social Link"
                  >
                    <Icon size={15} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Col 3: Popular Cuisines */}
          <div>
            <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-4">
              Top Cuisines
            </h4>
            <ul className="space-y-2.5">
              {cuisines.slice(0, 5).map((cuisine, idx) => (
                <li key={idx}>
                  <button
                    onClick={onOpenSignUp}
                    className="text-stone-400 hover:text-[#ff5200] transition cursor-pointer text-left"
                  >
                    {cuisine}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Quick Navigation */}
          <div>
            <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link, idx) => (
                <li key={idx}>
                  <button
                    onClick={link.action}
                    className="text-stone-400 hover:text-[#ff5200] transition cursor-pointer text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 5: Delivery & App */}
          <div>
            <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-4">
              Live Network
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed mb-3">
              Currently operating across major foodie hubs with 100% live rider telematics.
            </p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2 text-[11px] text-stone-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Kitchen Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} Reelbite Technologies Inc. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <button onClick={scrollToTop} className="hover:text-stone-300 transition flex items-center gap-1">
              <span>Back to Top</span>
              <ArrowUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
