import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { FaTimes, FaCheck, FaFire, FaUtensils, FaPlus } from "react-icons/fa";
import { GiChiliPepper } from "react-icons/gi";

const SPICE_OPTIONS = [
  { id: "mild", label: "Mild", icon: "🟢", desc: "Less spicy, kid-friendly" },
  { id: "medium", label: "Medium", icon: "🟡", desc: "Balanced standard heat" },
  { id: "spicy", label: "Spicy", icon: "🔴", desc: "Extra tadka & chili" },
  { id: "extra-spicy", label: "Extra Spicy", icon: "🔥", desc: "Fiery ghost pepper heat" }
];

const COOKING_STYLES = [
  { id: "standard", label: "Chef's Special", desc: "Authentic restaurant style" },
  { id: "crispy", label: "Extra Crispy", desc: "Crisp fried or roasted longer" },
  { id: "less-oil", label: "Less Oil / Homestyle", desc: "Light on butter and oil" }
];

const ADDON_OPTIONS = [
  { id: "cheese", label: "Extra Cheese", price: 35, icon: "🧀" },
  { id: "garlic_dip", label: "Garlic Mayo Dip", price: 25, icon: "🧄" },
  { id: "chutney", label: "Mint & Sweet Chutney", price: 15, icon: "🌿" }
];

export default function ItemCustomizationModal({ isOpen, onClose, item, onConfirm }) {
  const { userData } = useSelector((state) => state.user);

  const defaultSpice = userData?.foodPreferences?.spiceLevel || item?.tasteProfile?.spiceLevel || "medium";
  const [spiceLevel, setSpiceLevel] = useState(defaultSpice);
  const [cookingStyle, setCookingStyle] = useState("Chef's Special");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const prefSpice = userData?.foodPreferences?.spiceLevel || item?.tasteProfile?.spiceLevel || "medium";
    setSpiceLevel(prefSpice);
    setCookingStyle("Chef's Special");
    setSelectedAddons([]);
    setNotes("");

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, item, userData]);

  if (!isOpen || !item) return null;

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) =>
      prev.some((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const finalItemPrice = (item.price || 0) + addonTotal;

  const handleApply = () => {
    onConfirm({
      spiceLevel,
      cookingStyle,
      addons: selectedAddons.map((a) => a.label),
      notes: notes.trim(),
      extraPrice: addonTotal
    });
    onClose();
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-stone-200/80 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-3">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 rounded-2xl object-cover border border-stone-100 shadow-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#ff5200] text-white flex items-center justify-center shadow-sm">
                <FaUtensils size={18} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.foodType === "veg" ? "bg-emerald-600" : "bg-red-600"
                  }`}
                />
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-tight">
                  {item.name}
                </h3>
              </div>
              <p className="text-xs font-black text-[#ff5200] mt-0.5">
                Base Price: ₹{item.price}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition cursor-pointer"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Spice Level Selector */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <GiChiliPepper className="text-red-500" size={15} />
              <span>Choose Spice Level</span>
            </span>
            <span className="text-[10px] text-stone-400 font-bold">
              {userData?.foodPreferences?.spiceLevel === spiceLevel ? "(Matches Your Saved Taste)" : ""}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SPICE_OPTIONS.map((opt) => {
              const isSelected = spiceLevel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSpiceLevel(opt.id)}
                  className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "border-red-500 bg-red-50 text-red-950 font-bold ring-1 ring-red-500"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{opt.icon}</span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </div>
                  {isSelected && <FaCheck size={11} className="text-red-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cooking Style */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <FaUtensils className="text-amber-500" size={12} />
            <span>Preparation Style</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {COOKING_STYLES.map((style) => {
              const isSelected = cookingStyle === style.label;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setCookingStyle(style.label)}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    isSelected
                      ? "border-[#ff5200] bg-orange-50 text-[#ff5200] font-bold ring-1 ring-[#ff5200]"
                      : "border-stone-200 hover:bg-stone-50 text-stone-600"
                  }`}
                >
                  <div className="text-xs font-bold">{style.label}</div>
                  <div className="text-[9px] text-stone-400 leading-tight mt-0.5">{style.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Add-ons */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span>Extra Add-ons</span>
            <span className="text-[10px] text-stone-400 font-bold">Optional</span>
          </label>
          <div className="space-y-1.5">
            {ADDON_OPTIONS.map((addon) => {
              const isSelected = selectedAddons.some((a) => a.id === addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => toggleAddon(addon)}
                  className={`w-full p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                      : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{addon.icon}</span>
                    <span>{addon.label}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#ff5200]">+₹{addon.price}</span>
                    {isSelected && <FaCheck size={11} className="text-emerald-600" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Instructions Note */}
        <div className="space-y-1.5 pt-1 border-t border-stone-100">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700">
            Special Instructions
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Extra lemons, no raw onions..."
            maxLength={100}
            className="w-full text-xs font-medium p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-[#ff5200] focus:bg-white transition"
          />
        </div>

        {/* Total & Action Button */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Item Total</div>
            <div className="text-base font-black text-stone-900">₹{finalItemPrice}</div>
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5200] to-amber-500 hover:from-[#e04800] hover:to-amber-600 text-white text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <FaPlus size={11} />
            <span>Add With Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
