import React from "react";
import { FaLeaf, FaStar, FaArrowDownWideShort, FaXmark } from "react-icons/fa6";

export default function SearchFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  itemCount = 0
}) {
  const priceOptions = [
    { label: "All Prices", value: "all" },
    { label: "Under ₹150", value: "under150" },
    { label: "₹150 - ₹300", value: "150to300" },
    { label: "₹300+", value: "above300" },
  ];

  const sortOptions = [
    { label: "Relevance", value: "relevance" },
    { label: "Rating: High to Low", value: "rating_desc" },
    { label: "Price: Low to High", value: "price_asc" },
    { label: "Price: High to Low", value: "price_desc" },
  ];

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pure Veg Toggle */}
          <button
            onClick={() => onFilterChange("vegOnly", !filters.vegOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border shadow-xs ${
              filters.vegOnly
                ? "bg-emerald-700 text-white border-emerald-700 shadow-emerald-700/20"
                : "bg-white text-stone-700 border-stone-200 hover:border-emerald-600 hover:text-emerald-700"
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${filters.vegOnly ? "border-white" : "border-emerald-600"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${filters.vegOnly ? "bg-white" : "bg-emerald-600"}`} />
            </div>
            <span>Pure Veg</span>
          </button>

          {/* Rating 4.0+ Filter */}
          <button
            onClick={() => onFilterChange("minRating", filters.minRating === 4 ? null : 4)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border shadow-xs ${
              filters.minRating === 4
                ? "bg-[#ff5200] text-white border-[#ff5200] shadow-orange-500/20"
                : "bg-white text-stone-700 border-stone-200 hover:border-[#ff5200] hover:text-[#ff5200]"
            }`}
          >
            <FaStar className={filters.minRating === 4 ? "text-yellow-300" : "text-amber-400"} size={11} />
            <span>Ratings 4.0+</span>
          </button>

          {/* Price Brackets */}
          <div className="hidden sm:flex items-center gap-1.5 pl-1 border-l border-stone-200">
            {priceOptions.map((opt) => {
              const isActive = filters.priceBracket === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onFilterChange("priceBracket", opt.value)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isActive
                      ? "bg-stone-900 text-white border-stone-900 font-bold"
                      : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Taste & Cravings Quick Filter Pills */}
        <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-stone-100 pt-2.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 shrink-0 mr-1 flex items-center gap-1">
            <span>👅 Taste:</span>
          </span>
          {[
            { id: "all", label: "All Flavors", icon: "✨" },
            { id: "spicy", label: "Spicy & Fiery", icon: "🔥" },
            { id: "cheesy", label: "Cheesy & Loaded", icon: "🧀" },
            { id: "crispy", label: "Extra Crispy", icon: "🍗" },
            { id: "tangy", label: "Tangy / Chatpata", icon: "🍋" },
            { id: "creamy", label: "Rich & Creamy", icon: "🥛" },
            { id: "smoky", label: "Smoky / Tandoori", icon: "🍖" },
            { id: "sweet", label: "Sweet Tooth", icon: "🍯" },
            { id: "protein", label: "High Protein", icon: "💪" },
            { id: "light", label: "Light & Less Oil", icon: "🥗" }
          ].map((tag) => {
            const isSelected = (filters.tasteTag || "all") === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onFilterChange("tasteTag", tag.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1 border cursor-pointer ${
                  isSelected
                    ? "bg-[#ff5200] text-white border-[#ff5200] shadow-xs"
                    : "bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Sort Dropdown & Clear */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile Price Select */}
          <div className="sm:hidden">
            <select
              value={filters.priceBracket}
              onChange={(e) => onFilterChange("priceBracket", e.target.value)}
              className="text-xs font-semibold bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-stone-700 outline-none"
            >
              {priceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1">
            <FaArrowDownWideShort className="text-stone-500 text-xs" />
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange("sortBy", e.target.value)}
              className="text-xs font-bold text-stone-700 bg-transparent outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
              title="Reset all filters"
            >
              <FaXmark size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
