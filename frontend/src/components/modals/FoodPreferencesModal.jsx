import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverUrl } from "../../App";
import { updateUserFoodPreferences } from "../../redux/userSlice";
import { FaTimes, FaCheck, FaFire, FaLeaf, FaShieldAlt } from "react-icons/fa";
import { GiChiliPepper, GiCheeseWedge } from "react-icons/gi";
import { MdOutlineFoodBank } from "react-icons/md";

const DIET_OPTIONS = [
  { id: "all", label: "All Dishes", icon: "🍗", desc: "No restrictions, all cuisines" },
  { id: "veg", label: "Pure Veg", icon: "🌱", desc: "100% vegetarian food" },
  { id: "vegan", label: "Vegan", icon: "🌿", desc: "Plant-based, dairy-free" },
  { id: "jain", label: "Jain", icon: "🧅❌", desc: "No onion, no garlic, root-free" },
  { id: "eggetarian", label: "Eggetarian", icon: "🥚", desc: "Vegetarian including eggs" }
];

const SPICE_LEVELS = [
  { id: "mild", label: "Mild", icon: "🟢", desc: "Gentle & kid-friendly", heat: "🌶️" },
  { id: "medium", label: "Medium", icon: "🟡", desc: "Balanced & flavorful", heat: "🌶️🌶️" },
  { id: "spicy", label: "Spicy", icon: "🔴", desc: "Desi heat & tadka", heat: "🌶️🌶️🌶️" },
  { id: "extra-spicy", label: "Extra Spicy", icon: "🔥", desc: "Fiery & ghost pepper level", heat: "🌶️🌶️🌶️🌶️" }
];

const FLAVOR_TAGS = [
  { id: "Cheesy", label: "Cheesy & Loaded", icon: "🧀" },
  { id: "Crispy", label: "Extra Crispy", icon: "🍗" },
  { id: "Tangy", label: "Tangy / Chatpata", icon: "🍋" },
  { id: "Creamy", label: "Rich & Creamy", icon: "🥛" },
  { id: "Smoky", label: "Smoky / Tandoori", icon: "🍖" },
  { id: "Sweet", label: "Sweet Tooth", icon: "🍯" },
  { id: "High-Protein", label: "High Protein", icon: "💪" },
  { id: "Light-Oil", label: "Light & Less Oil", icon: "🥗" }
];

const ALLERGY_OPTIONS = [
  { id: "Gluten", label: "Gluten-Free", icon: "🌾" },
  { id: "Dairy", label: "Dairy-Free", icon: "🥛" },
  { id: "Peanuts", label: "Nut-Free", icon: "🥜" },
  { id: "Seafood", label: "Seafood-Free", icon: "🦐" }
];

const FoodPreferencesModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const existingPrefs = userData?.foodPreferences || {};
  const [dietType, setDietType] = useState(existingPrefs.dietType || userData?.dietPreference || "all");
  const [spiceLevel, setSpiceLevel] = useState(existingPrefs.spiceLevel || "medium");
  const [flavorTags, setFlavorTags] = useState(existingPrefs.flavorTags || []);
  const [allergies, setAllergies] = useState(existingPrefs.allergies || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    const prefs = userData?.foodPreferences || {};
    setDietType(prefs.dietType || userData?.dietPreference || "all");
    setSpiceLevel(prefs.spiceLevel || "medium");
    setFlavorTags(Array.isArray(prefs.flavorTags) ? [...prefs.flavorTags] : []);
    setAllergies(Array.isArray(prefs.allergies) ? [...prefs.allergies] : []);
    setMessage("");

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, userData]);

  if (!isOpen) return null;

  const toggleFlavor = (tagId) => {
    setFlavorTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const toggleAllergy = (allergyId) => {
    setAllergies((prev) =>
      prev.includes(allergyId) ? prev.filter((a) => a !== allergyId) : [...prev, allergyId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        foodPreferences: {
          dietType,
          spiceLevel,
          flavorTags,
          allergies
        }
      };

      const res = await axios.patch(`${serverUrl}/api/user/preferences`, payload, {
        withCredentials: true
      });

      dispatch(
        updateUserFoodPreferences({
          dietType,
          spiceLevel,
          flavorTags,
          allergies
        })
      );

      setMessage("Preferences saved! Feeds updated 🍜");
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 800);
    } catch (err) {
      console.error("Error saving food preferences:", err);
      setMessage("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-stone-200/80 space-y-5 relative my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff5200] to-amber-500 text-white flex items-center justify-center shadow-md">
              <GiChiliPepper size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                Food & Taste Preferences
              </h2>
              <p className="text-[11px] font-semibold text-stone-500">
                Personalizes your Reels, recommendations & dishes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition cursor-pointer"
            aria-label="Close"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Section 1: Dietary Lifestyle */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <FaLeaf className="text-emerald-600" size={13} />
            <span>1. Dietary Preference</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DIET_OPTIONS.map((opt) => {
              const isSelected = dietType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDietType(opt.id)}
                  className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                    isSelected
                      ? "border-[#ff5200] bg-orange-50/70 shadow-xs ring-1 ring-[#ff5200]"
                      : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg">{opt.icon}</span>
                    {isSelected && <FaCheck size={11} className="text-[#ff5200]" />}
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-bold text-stone-900">{opt.label}</div>
                    <div className="text-[10px] text-stone-500 leading-tight truncate">{opt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Spice Tolerance Gauge */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FaFire className="text-red-500" size={13} />
              <span>2. Spice Tolerance</span>
            </span>
            <span className="text-[11px] font-bold text-[#ff5200]">
              {SPICE_LEVELS.find((s) => s.id === spiceLevel)?.heat}
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SPICE_LEVELS.map((level) => {
              const isSelected = spiceLevel === level.id;
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setSpiceLevel(level.id)}
                  className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center transition cursor-pointer ${
                    isSelected
                      ? "border-red-500 bg-red-50/70 text-red-950 font-bold shadow-xs ring-1 ring-red-500"
                      : "border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold"
                  }`}
                >
                  <span className="text-base">{level.icon}</span>
                  <span className="text-xs font-bold mt-1">{level.label}</span>
                  <span className="text-[9px] text-stone-500 leading-tight mt-0.5">{level.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Flavor Cravings */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <GiCheeseWedge className="text-amber-500" size={14} />
            <span>3. Favorite Flavor Profiles (Multi-select)</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FLAVOR_TAGS.map((tag) => {
              const isSelected = flavorTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleFlavor(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                    isSelected
                      ? "bg-stone-900 text-white border-stone-900 shadow-xs"
                      : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                  {isSelected && <FaCheck size={9} className="text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Allergens & Sensitivities */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <label className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <FaShieldAlt className="text-indigo-600" size={12} />
            <span>4. Dietary Exclusions / Allergies</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ALLERGY_OPTIONS.map((opt) => {
              const isSelected = allergies.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleAllergy(opt.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs"
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && <FaCheck size={10} className="text-indigo-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-2.5 rounded-xl text-center text-xs font-bold ${
              message.includes("saved")
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff5200] to-amber-500 hover:from-[#e04800] hover:to-amber-600 text-white text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Saving Preferences..." : "Save Preferences"}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default FoodPreferencesModal;
