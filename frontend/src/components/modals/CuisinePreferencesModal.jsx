import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverUrl } from "../../App";
import { updateUserPreferredCuisines } from "../../redux/userSlice";
import { FaUtensils, FaCheck, FaTimes, FaSearch } from "react-icons/fa";

const CuisinePreferencesModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Handle ESC key press
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    // Initialize selected from current userData
    if (userData?.preferredCuisines && Array.isArray(userData.preferredCuisines)) {
      setSelected([...userData.preferredCuisines]);
    } else {
      setSelected([]);
    }
    setSearchTerm("");
    setMessage("");

    // Fetch categories
    setLoading(true);
    axios
      .get(`${serverUrl}/api/user/cuisine-categories`, { withCredentials: true })
      .then((res) => {
        setCategories(res.data.categories || []);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, userData]);

  if (!isOpen) return null;

  const toggleCategory = (cat) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectAll = () => {
    setSelected([...new Set([...selected, ...filteredCategories])]);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await axios.patch(
        `${serverUrl}/api/user/preferences`,
        { preferredCuisines: selected },
        { withCredentials: true }
      );
      dispatch(updateUserPreferredCuisines(res.data.preferredCuisines || selected));
      setMessage("Preferences saved! 🍜");
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 900);
    } catch (err) {
      console.error("Error saving preferences:", err);
      setMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-stone-100 space-y-4 relative my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition z-10"
          title="Close (Esc)"
        >
          <FaTimes size={16} />
        </button>

        {/* Header */}
        <div className="space-y-1 text-center pr-8 pl-8">
          <div className="w-12 h-12 bg-[#ff5200]/10 text-[#ff5200] rounded-2xl flex items-center justify-center mx-auto text-xl font-bold shadow-sm">
            <FaUtensils />
          </div>
          <h3 className="text-lg font-black text-stone-900">Food Preferences</h3>
          <p className="text-xs text-stone-500">
            Pick your favourite cuisines to personalize your food and reel recommendations.
          </p>
        </div>

        {/* Search & Quick Action Bar */}
        <div className="space-y-2 pt-1">
          <div className="relative flex items-center">
            <FaSearch className="absolute left-3 text-stone-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cuisines (e.g. Pizza, Biryani, Burgers)..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 px-1">
            <span>
              {selected.length} cuisine{selected.length !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              {filteredCategories.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[#ff5200] hover:underline"
                >
                  Select All
                </button>
              )}
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-stone-400 hover:text-stone-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Categories Selection */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
            <div className="w-8 h-8 border-4 border-[#ff5200] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">Loading cuisines...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto py-1 justify-center">
            {filteredCategories.map((cat) => {
              const isSelected = selected.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  type="button"
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? "bg-[#ff5200] text-white shadow-md scale-105"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {isSelected && <FaCheck size={10} />}
                  <span>{cat}</span>
                </button>
              );
            })}
            {filteredCategories.length === 0 && (
              <p className="text-xs text-stone-400 py-6 text-center">
                No cuisines match "{searchTerm}".
              </p>
            )}
          </div>
        )}

        {message && (
          <p className="text-center text-xs font-bold text-emerald-600 animate-pulse">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 transition border border-stone-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#ff5200] hover:bg-[#c2410c] text-white py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition disabled:opacity-50"
          >
            {saving ? "Saving..." : `Save Preferences (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CuisinePreferencesModal;
