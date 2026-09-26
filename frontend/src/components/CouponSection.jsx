import React, { useState, useEffect } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { FaTag, FaCheck, FaXmark, FaChevronDown, FaChevronUp } from "react-icons/fa6";
import { RiCoupon3Line } from "react-icons/ri";
import toast from "react-hot-toast";

export default function CouponSection({ subtotal = 0, appliedCoupon, onApplyCoupon, onRemoveCoupon }) {
  const [couponInput, setCouponInput] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showAllCoupons, setShowAllCoupons] = useState(false);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${serverUrl}/api/coupons/available`, { withCredentials: true });
        if (res.data?.success) {
          setAvailableCoupons(res.data.coupons || []);
        }
      } catch (err) {
        console.error("Failed to load coupons:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCoupons();
  }, []);

  const handleApplyCode = async (codeToApply) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      setApplying(true);
      const res = await axios.post(
        `${serverUrl}/api/coupons/apply`,
        { code, subtotal },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message);
        onApplyCoupon(res.data.coupon);
        setCouponInput("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply coupon");
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#ff5200]">
            <RiCoupon3Line size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">Offers & Benefits</h3>
            <p className="text-xs text-stone-500">Apply promo codes for instant savings</p>
          </div>
        </div>
      </div>

      {/* When a coupon is already applied */}
      {appliedCoupon ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-900">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">
              <FaCheck size={10} />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-emerald-800">
                  {appliedCoupon.code}
                </span>
                <span className="text-[10px] uppercase font-bold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded">
                  Applied
                </span>
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                You saved ₹{appliedCoupon.discountAmount} with this offer!
              </p>
            </div>
          </div>

          <button
            onClick={onRemoveCoupon}
            className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-100/50 p-1.5 rounded-lg transition shrink-0 ml-2"
            title="Remove coupon"
          >
            <FaXmark size={14} />
          </button>
        </div>
      ) : (
        /* Coupon Input Form */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <FaTag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
              <input
                type="text"
                placeholder="Enter coupon code (e.g. WELCOME50)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleApplyCode()}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-900 outline-none focus:border-[#ff5200] focus:bg-white transition"
              />
            </div>
            <button
              onClick={() => handleApplyCode()}
              disabled={applying || !couponInput.trim()}
              className="px-4 py-2.5 bg-stone-900 hover:bg-[#ff5200] disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
            >
              {applying ? "Checking..." : "Apply"}
            </button>
          </div>

          {/* List of Available Coupons */}
          {availableCoupons.length > 0 && (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAllCoupons(!showAllCoupons)}
                className="text-xs font-bold text-[#ff5200] hover:text-[#e04800] flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllCoupons ? "Hide available coupons" : `View available coupons (${availableCoupons.length})`}</span>
                {showAllCoupons ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
              </button>

              {showAllCoupons && (
                <div className="space-y-2.5 pt-1 max-h-[220px] overflow-y-auto pr-1">
                  {availableCoupons.map((c) => {
                    const isEligible = !c.minOrderValue || subtotal >= c.minOrderValue;

                    return (
                      <div
                        key={c._id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          c.isExhausted
                            ? "bg-stone-50/50 border-stone-200 opacity-60"
                            : isEligible
                            ? "bg-orange-50/30 border-orange-200 hover:border-orange-400"
                            : "bg-stone-50/50 border-stone-200"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs tracking-wider text-stone-900 border border-dashed border-orange-400 px-2 py-0.5 rounded bg-white">
                              {c.code}
                            </span>
                            <span className="text-xs font-bold text-stone-800 truncate">
                              {c.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-1 truncate">
                            {c.description}
                          </p>
                          {c.minOrderValue > 0 && !isEligible && (
                            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                              Add ₹{c.minOrderValue - subtotal} more to unlock
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleApplyCode(c.code)}
                          disabled={c.isExhausted || !isEligible || applying}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0 ${
                            c.isExhausted || !isEligible
                              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                              : "bg-[#ff5200] hover:bg-[#e04800] text-white shadow-2xs cursor-pointer"
                          }`}
                        >
                          {c.isExhausted ? "Used" : "Apply"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
