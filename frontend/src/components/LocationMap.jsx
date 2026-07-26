import React from "react";
import { FaMapMarkerAlt, FaClock, FaPhoneAlt, FaEnvelope } from "react-icons/fa";

const LocationMap = () => {
  return (
    <section className="py-16 bg-stone-950 text-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-widest">
            <FaMapMarkerAlt />
            <span>Visit Us</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-amber-50">
            Location & Operating Hours
          </h2>
          <p className="text-stone-400 text-sm">
            Stop by our flagship location or get your favorite meals delivered fresh to your doorstep.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Map Frame (Left Column) */}
          <div className="lg:col-span-7 h-96 lg:h-auto rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl relative min-h-[350px]">
            <iframe
              title="Reelbite Restaurant Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3742.124673892015!2d85.824539875086!3d20.29605868118023!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a1909d2d5807e4d%3A0x889810a905a5a1f0!2sBhubaneswar%2C%20Odisha!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, filter: "contrast(1.1) brightness(0.9)" }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          {/* Info Card (Right Column) */}
          <div className="lg:col-span-5 bg-stone-900 border border-stone-800 p-8 rounded-3xl shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-amber-400 border-b border-stone-800 pb-3">
                Reelbite Flagship Hub
              </h3>

              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#ea580c]/15 text-[#ea580c] rounded-xl mt-1">
                  <FaMapMarkerAlt size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Address</h4>
                  <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                    124 Gourmet Boulevard, Culinary Quarter, <br />
                    Bhubaneswar, Odisha - 751001
                  </p>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl mt-1">
                  <FaClock size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Opening Hours</h4>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Monday – Sunday: <span className="text-amber-300 font-semibold">10:00 AM – 11:30 PM</span>
                  </p>
                  <p className="text-xs text-stone-400">Late night online delivery available!</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl mt-1">
                  <FaPhoneAlt size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Contact & Support</h4>
                  <p className="text-xs text-stone-300 mt-0.5">
                    Phone: <span className="text-emerald-300 font-semibold">+91 98765 43210</span>
                  </p>
                  <p className="text-xs text-stone-300">
                    Email: <span className="text-stone-300">support@reelbite.com</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
              <span>🚀 Delivery Range: <strong className="text-white">Up to 15km</strong></span>
              <span className="text-emerald-400 font-bold">● Open Now</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationMap;
