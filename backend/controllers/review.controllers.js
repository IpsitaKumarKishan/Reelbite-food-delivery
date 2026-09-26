import mongoose from "mongoose";
import Review from "../models/review.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import Item from "../models/item.model.js";

/**
 * POST /api/reviews/submit
 * Submits verified review after order delivery
 */
export const submitReview = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      orderId,
      shopId,
      shopRating,
      reviewText = "",
      itemReviews = [],
      deliveryRating = 5,
      photos = [],
    } = req.body;

    if (!orderId || !shopId || !shopRating) {
      return res.status(400).json({
        success: false,
        message: "orderId, shopId, and shopRating (1-5) are required",
      });
    }

    if (shopRating < 1 || shopRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // 1. Verify Order existence and completion
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const orderUserId = order.user?._id ? order.user._id.toString() : order.user?.toString();
    if (orderUserId !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only review your own orders" });
    }

    // Check if shop order was delivered
    const targetShopOrder = order.shopOrders?.find(
      (so) => so.shop?.toString() === shopId.toString()
    );

    if (!targetShopOrder) {
      return res.status(404).json({ success: false, message: "Shop order not found in this order" });
    }

    if (targetShopOrder.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Reviews can only be submitted after the order has been delivered",
      });
    }

    // 2. Check for duplicate review
    const existing = await Review.findOne({
      user: userId,
      order: orderId,
      shop: shopId,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this restaurant for this order",
      });
    }

    // 3. Create Review
    const newReview = new Review({
      user: userId,
      order: orderId,
      shop: shopId,
      shopRating: Number(shopRating),
      reviewText: reviewText.trim(),
      itemReviews: itemReviews.map((ir) => ({
        item: ir.item,
        rating: Math.min(5, Math.max(1, Number(ir.rating || shopRating))),
        comment: (ir.comment || "").trim(),
      })),
      deliveryRating: Number(deliveryRating || 5),
      photos: Array.isArray(photos) ? photos : [],
    });

    await newReview.save();

    // 4. Update Shop rolling average rating
    const shopReviews = await Review.find({ shop: shopId }).select("shopRating").lean();
    if (shopReviews.length > 0) {
      const totalScore = shopReviews.reduce((sum, r) => sum + r.shopRating, 0);
      const newAverage = Math.round((totalScore / shopReviews.length) * 10) / 10;
      await Shop.findByIdAndUpdate(shopId, {
        "rating.average": newAverage,
        "rating.count": shopReviews.length,
      });
    }

    // 5. Update Item rolling ratings if items were evaluated
    for (const ir of itemReviews) {
      if (ir.item && ir.rating) {
        const item = await Item.findById(ir.item);
        if (item) {
          const oldCount = item.rating?.count || 0;
          const oldAvg = item.rating?.average || 0;
          const newCount = oldCount + 1;
          const newAvg = Math.round((((oldAvg * oldCount) + Number(ir.rating)) / newCount) * 10) / 10;

          item.rating = {
            average: newAvg,
            count: newCount,
          };
          await item.save();
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Thank you for your feedback! Review submitted successfully.",
      review: newReview,
    });
  } catch (error) {
    console.error("submitReview error:", error);
    return res.status(500).json({ success: false, message: `Submit review error: ${error.message}` });
  }
};

/**
 * GET /api/reviews/shop/:shopId
 * Fetches all verified reviews for a restaurant with rating statistics
 */
export const getShopReviews = async (req, res) => {
  try {
    const { shopId } = req.params;

    const reviews = await Review.find({ shop: shopId })
      .sort({ createdAt: -1 })
      .populate("user", "fullName")
      .populate("itemReviews.item", "name image")
      .lean();

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScore = 0;

    reviews.forEach((r) => {
      const rounded = Math.round(r.shopRating);
      if (starCounts[rounded] !== undefined) {
        starCounts[rounded]++;
      }
      totalScore += r.shopRating;
    });

    const average = reviews.length > 0
      ? Math.round((totalScore / reviews.length) * 10) / 10
      : 4.2;

    return res.status(200).json({
      success: true,
      stats: {
        average,
        count: reviews.length,
        starCounts,
      },
      reviews,
    });
  } catch (error) {
    console.error("getShopReviews error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/reviews/order/:orderId
 * Checks if current user has already reviewed this order
 */
export const getOrderReviewStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    const reviews = await Review.find({
      order: orderId,
      user: userId,
    }).lean();

    return res.status(200).json({
      success: true,
      hasReviewed: reviews.length > 0,
      reviewedShopIds: reviews.map((r) => r.shop.toString()),
      reviews,
    });
  } catch (error) {
    console.error("getOrderReviewStatus error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
