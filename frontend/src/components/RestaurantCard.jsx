import React from "react";
import { FaStar, FaClock, FaTag, FaMapMarkerAlt } from "react-icons/fa";

const RestaurantCard = ({ shop, onClick }) => {
  if (!shop) return null;

  // Generate consistent rating / delivery time estimations based on shop id length or values
  const rating = shop.rating?.average || 4.2;
  const deliveryTime = "25-35 mins";
  const costForTwo = "₹350 for two";
  const offerText = "50% OFF up to ₹100";

  return (
    <div
      onClick={onClick}
      className="w-full sm:w-[280px] md:w-[300px] bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group flex flex-col"
    >
      {/* Cover Image Container */}
      <div className="relative w-full h-[180px] bg-stone-100 overflow-hidden">
        <img
          src={shop.image}
          alt={shop.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Offer Tag Badge (Bottom Left of Image) */}
        <div className="absolute bottom-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
          <FaTag size={10} />
          <span>{offerText}</span>
        </div>

        {/* Rating Badge (Top Right of Image) */}
        <div className="absolute top-3 right-3 bg-emerald-700 text-white text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow">
          <span>{rating}</span>
          <FaStar size={10} className="text-yellow-300" />
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <h3 className="font-extrabold text-stone-900 text-base group-hover:text-[#ff5200] transition truncate">
            {shop.name}
          </h3>

          <p className="text-xs font-semibold text-stone-500 truncate mt-0.5">
            North Indian • Biryani • Fast Food
          </p>
        </div>

        {/* Footer Info: Delivery Time & Cost for Two */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600 font-medium">
          <div className="flex items-center gap-1 text-stone-700 font-bold">
            <FaClock className="text-[#ff5200]" size={12} />
            <span>{deliveryTime}</span>
          </div>

          <div className="flex items-center gap-1 text-stone-500 font-semibold">
            <FaMapMarkerAlt className="text-stone-400" size={11} />
            <span>{shop.city || "Nearby"}</span>
          </div>

          <span className="font-bold text-stone-800">{costForTwo}</span>
        </div>
      </div>
    </div>
  );
};

export default RestaurantCard;
