import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { serverUrl } from "../../App";
import { setUserData } from "../../redux/userSlice";
import { FaUser, FaPhone, FaLock, FaEnvelope, FaXmark, FaCircleCheck, FaGear } from "react-icons/fa6";

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    if (userData) {
      setFullName(userData.fullName || "");
      setMobile(userData.mobile || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordChange(false);
      setMessage({ type: "", text: "" });
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, userData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!fullName.trim()) {
      setMessage({ type: "error", text: "Full name is required." });
      return;
    }

    if (mobile && mobile.trim().length < 10) {
      setMessage({ type: "error", text: "Mobile number must be at least 10 digits." });
      return;
    }

    if (showPasswordChange && newPassword) {
      if (newPassword.length < 6) {
        setMessage({ type: "error", text: "New password must be at least 6 characters." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage({ type: "error", text: "New passwords do not match." });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
      };

      if (showPasswordChange && newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await axios.put(`${serverUrl}/api/user/profile`, payload, {
        withCredentials: true,
      });

      dispatch(setUserData(res.data.user));
      setMessage({ type: "success", text: "Profile updated successfully! ✨" });

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update profile.",
      });
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
          <FaXmark size={16} />
        </button>

        {/* Header */}
        <div className="space-y-1 pr-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#ff5200]/10 text-[#ff5200] flex items-center justify-center text-base shrink-0">
              <FaGear />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Account Settings</h3>
              <p className="text-xs text-stone-500">Manage your profile details and security.</p>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`p-3 rounded-xl text-xs font-bold ${
              message.type === "error"
                ? "bg-red-50 text-red-600 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5"
            }`}
          >
            {message.type === "success" && <FaCircleCheck />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {/* Full Name */}
          <div>
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <div className="relative flex items-center">
              <FaUser className="absolute left-3.5 text-stone-400 text-xs" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Email (Read only) */}
          <div>
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
              Email Address (Read-only)
            </label>
            <div className="relative flex items-center">
              <FaEnvelope className="absolute left-3.5 text-stone-400 text-xs" />
              <input
                type="email"
                value={userData?.email || ""}
                disabled
                className="w-full bg-stone-100 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-500 font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
              Mobile Number
            </label>
            <div className="relative flex items-center">
              <FaPhone className="absolute left-3.5 text-stone-400 text-xs" />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200] focus:bg-white transition"
              />
            </div>
          </div>

          {/* Toggle Password Change Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPasswordChange((prev) => !prev)}
              className="text-xs font-bold text-[#ff5200] hover:underline flex items-center gap-1.5 py-1"
            >
              <FaLock size={11} />
              <span>{showPasswordChange ? "Cancel Password Change" : "Change Password"}</span>
            </button>
          </div>

          {showPasswordChange && (
            <div className="space-y-2.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 animate-in fade-in">
              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 font-semibold focus:outline-none focus:border-[#ff5200]"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 transition border border-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#ff5200] hover:bg-[#c2410c] text-white py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition disabled:opacity-50"
            >
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileSettingsModal;
