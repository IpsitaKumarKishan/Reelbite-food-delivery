import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverUrl } from "../../App";
import { setUserData } from "../../redux/userSlice";
import {
  FaLocationDot,
  FaPlus,
  FaTrash,
  FaCheck,
  FaXmark,
  FaHouse,
  FaBriefcase,
  FaLocationPin,
  FaArrowLeft,
} from "react-icons/fa6";

const SavedAddressesModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { userData, currentCity, currentState } = useSelector((state) => state.user);

  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState("Home");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState(currentCity || "");
  const [stateName, setStateName] = useState(currentState || "");
  const [isDefault, setIsDefault] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    setIsAdding(false);
    setError("");
    setCity(currentCity || "");
    setStateName(currentState || "");

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentCity, currentState]);

  if (!isOpen) return null;

  const addresses = userData?.addresses || [];

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!street.trim()) {
      setError("Street address is required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${serverUrl}/api/user/addresses`,
        {
          label,
          street: street.trim(),
          city: city.trim(),
          state: stateName.trim(),
          isDefault,
        },
        { withCredentials: true }
      );

      dispatch(setUserData({ ...userData, addresses: res.data.addresses }));
      setIsAdding(false);
      setStreet("");
      setIsDefault(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add address.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      const res = await axios.delete(`${serverUrl}/api/user/addresses/${addressId}`, {
        withCredentials: true,
      });
      dispatch(setUserData({ ...userData, addresses: res.data.addresses }));
    } catch (err) {
      console.error("Delete address error:", err);
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      const res = await axios.patch(
        `${serverUrl}/api/user/addresses/${addressId}/default`,
        {},
        { withCredentials: true }
      );
      dispatch(setUserData({ ...userData, addresses: res.data.addresses }));
    } catch (err) {
      console.error("Set default address error:", err);
    }
  };

  const getLabelIcon = (lbl) => {
    switch (lbl?.toLowerCase()) {
      case "home":
        return <FaHouse className="text-blue-500" />;
      case "work":
        return <FaBriefcase className="text-amber-500" />;
      default:
        return <FaLocationPin className="text-[#ff5200]" />;
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
        {/* Top-Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-2 rounded-full hover:bg-stone-100 transition z-10"
          title="Close (Esc)"
        >
          <FaXmark size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-2.5">
            {isAdding ? (
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition"
                title="Back to address list"
              >
                <FaArrowLeft size={12} />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-[#ff5200]/10 text-[#ff5200] flex items-center justify-center text-base shrink-0">
                <FaLocationDot />
              </div>
            )}
            <div>
              <h3 className="text-lg font-black text-stone-900">
                {isAdding ? "Add New Address" : "Saved Addresses"}
              </h3>
              <p className="text-xs text-stone-500">
                {isAdding
                  ? "Enter your delivery location details"
                  : "Manage addresses for quick checkout"}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold">
            {error}
          </div>
        )}

        {!isAdding ? (
          <div className="space-y-3 pt-1">
            {/* Address List */}
            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {addresses.length === 0 ? (
                <div className="text-center py-10 text-stone-400 space-y-2">
                  <div className="w-14 h-14 bg-stone-100 text-stone-400 rounded-3xl flex items-center justify-center mx-auto text-2xl">
                    <FaLocationDot />
                  </div>
                  <p className="text-xs font-bold text-stone-600">No saved addresses yet</p>
                  <p className="text-[11px] text-stone-400 max-w-[200px] mx-auto">
                    Add your home or office address to save time during checkout.
                  </p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr._id}
                    className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                      addr.isDefault
                        ? "border-[#ff5200]/40 bg-[#fff9f6] shadow-sm"
                        : "border-stone-200 bg-stone-50/60 hover:bg-stone-50"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {getLabelIcon(addr.label)}
                        <span className="text-xs font-black text-stone-800 uppercase tracking-wider">
                          {addr.label}
                        </span>
                        {addr.isDefault && (
                          <span className="bg-[#ff5200] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-700 font-medium leading-relaxed break-words">
                        {addr.street}
                      </p>
                      {(addr.city || addr.state) && (
                        <p className="text-[11px] text-stone-400">
                          {[addr.city, addr.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr._id)}
                          className="text-[11px] font-bold text-[#ff5200] hover:underline px-2 py-1"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="text-stone-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-stone-100 transition"
                        title="Delete Address"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add New Address Button */}
            <button
              onClick={() => {
                setIsAdding(true);
                setError("");
                setCity(currentCity || "");
                setStateName(currentState || "");
              }}
              className="w-full bg-[#ff5200]/10 hover:bg-[#ff5200] text-[#ff5200] hover:text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition active:scale-[0.99]"
            >
              <FaPlus size={12} />
              <span>+ Add New Address</span>
            </button>
          </div>
        ) : (
          /* Add Address Form */
          <form onSubmit={handleAddAddress} className="space-y-3 pt-1">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                Address Tag
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {["Home", "Work", "Other"].map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setLabel(lbl)}
                    className={`py-1.5 rounded-xl border transition ${
                      label === lbl
                        ? "bg-[#ff5200] text-white border-[#ff5200] shadow-sm"
                        : "bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                Street / Flat / House No. *
              </label>
              <textarea
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. Flat 402, Sunshine Apartments, Main Road"
                rows={2}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200] focus:bg-white resize-none transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200] focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="State"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200] focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefaultCheck"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-[#ff5200] rounded focus:ring-[#ff5200] accent-[#ff5200] cursor-pointer"
              />
              <label
                htmlFor="isDefaultCheck"
                className="text-xs font-bold text-stone-700 cursor-pointer"
              >
                Set as default delivery address
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#ff5200] hover:bg-[#c2410c] text-white py-2.5 rounded-xl text-xs font-extrabold shadow transition disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Address"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SavedAddressesModal;
