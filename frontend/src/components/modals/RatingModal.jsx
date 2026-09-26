import React, { useState } from "react";
import axios from "axios";
import { serverUrl } from "../../App";
import { FaStar, FaRegStar, FaXmark, FaMotorcycle, FaUtensils } from "react-icons/fa6";
import toast from "react-hot-toast";

export default function RatingModal({ order, shopOrder, onClose, onReviewSubmitted }) {
  const [shopRating, setShopRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [itemRatings, setItemRatings] = useState(() => {
    return (shopOrder?.shopOrderItems || []).map((oi) => ({
      item: oi.item?._id || oi.item,
      name: oi.name,
      rating: 5,
      comment: "",
    }));
  });
  const [submitting, setSubmitting] = useState(false);

  const ratingLabels = {
    1: "Poor 😞",
    2: "Fair 🙁",
    3: "Average 😐",
    4: "Good 🙂",
    5: "Excellent! 🌟",
  };

  const handleItemRatingChange = (itemId, rating) => {
    setItemRatings((prev) =>
      prev.map((ir) => (ir.item === itemId ? { ...ir, rating } : ir))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${serverUrl}/api/reviews/submit`,
        {
          orderId: order._id,
          shopId: shopOrder.shop?._id || shopOrder.shop,
          shopRating,
          reviewText,
          deliveryRating,
          itemReviews: itemRatings.map((ir) => ({
            item: ir.item,
            rating: ir.rating,
            comment: ir.comment,
          })),
        },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Review submitted!");
        if (onReviewSubmitted) onReviewSubmitted(res.data.review);
        if (onClose) onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-orange-100 text-[#ff5200] flex items-center justify-center text-sm font-bold">
              <FaUtensils size={14} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Rate & Review
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                {shopOrder.shop?.name || "Restaurant"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition"
          >
            <FaXmark size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Restaurant Rating */}
          <div className="space-y-2 text-center bg-stone-50 p-4 rounded-2xl border border-stone-200/70">
            <label className="text-xs font-bold text-stone-700 block">
              How was your experience with {shopOrder.shop?.name || "this kitchen"}?
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setShopRating(star)}
                  className="p-1 text-2xl transition hover:scale-125 focus:outline-none"
                >
                  {star <= shopRating ? (
                    <FaStar className="text-amber-400 drop-shadow-xs" />
                  ) : (
                    <FaRegStar className="text-stone-300" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-amber-600 tracking-wide">
              {ratingLabels[shopRating]}
            </p>
          </div>

          {/* Feedback Text Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">Write a Review (Optional)</label>
            <textarea
              rows={3}
              placeholder="Tell others what you loved about the food, taste, or portion size..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs text-stone-800 outline-none focus:border-[#ff5200] focus:bg-white transition resize-none"
            />
          </div>

          {/* Individual Dishes Rating */}
          {itemRatings.length > 0 && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-stone-700 block">Rate the Dishes</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {itemRatings.map((ir) => (
                  <div
                    key={ir.item}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-stone-100 bg-stone-50/50"
                  >
                    <span className="text-xs font-bold text-stone-800 truncate max-w-[200px]">
                      {ir.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => handleItemRatingChange(ir.item, s)}
                          className="text-sm transition hover:scale-115 focus:outline-none"
                        >
                          {s <= ir.rating ? (
                            <FaStar className="text-amber-400" />
                          ) : (
                            <FaRegStar className="text-stone-300" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Boy Rating */}
          <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
            <div className="flex items-center gap-2 text-stone-700">
              <FaMotorcycle size={14} className="text-[#ff5200]" />
              <span className="text-xs font-bold">Delivery Experience</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setDeliveryRating(s)}
                  className="text-sm transition hover:scale-115"
                >
                  {s <= deliveryRating ? (
                    <FaStar className="text-amber-400" />
                  ) : (
                    <FaRegStar className="text-stone-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#ff5200] hover:bg-[#e04800] text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
