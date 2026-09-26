import Shop from "../models/shop.model.js";
import Order from "../models/order.model.js";
import Reel from "../models/reel.model.js";
import mongoose from "mongoose";

/**
 * GET /api/analytics/owner
 * Returns comprehensive sales, order trends, peak hours, top dishes, and reel conversion stats for the owner's restaurant.
 */
export const getOwnerAnalytics = async (req, res) => {
  try {
    const userId = req.userId;
    const shop = await Shop.findOne({ owner: userId });

    if (!shop) {
      return res.status(200).json({
        hasShop: false,
        message: "No shop registered yet for this owner.",
        stats: {
          todayRevenue: 0,
          totalRevenue: 0,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          averageOrderValue: 0,
          pendingPayout: 0,
          settledPayout: 0,
        },
        dailyTrends: [],
        hourlyHeatmap: [],
        topDishes: [],
        reelStats: {
          totalReels: 0,
          totalViews: 0,
          totalLikes: 0,
          reels: [],
        },
      });
    }

    const shopId = shop._id;

    // Find all orders involving this shop
    const orders = await Order.find({ "shopOrders.shop": shopId })
      .populate("user", "fullName email")
      .populate("shopOrders.shopOrderItems.item", "name price image category")
      .sort({ createdAt: -1 })
      .lean();

    // 1. Compute summary metrics
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let todayRevenue = 0;
    let totalRevenue = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let pendingPayout = 0;
    let settledPayout = 0;

    const dishSalesMap = {}; // itemId -> { name, image, price, quantity, revenue }
    const hourlyCounts = new Array(24).fill(0);
    const dayMap = {}; // "YYYY-MM-DD" -> { revenue, orders }

    // Initialize last 7 days in dayMap
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      dayMap[dateKey] = { date: dateKey, day: dayLabel, revenue: 0, orders: 0 };
    }

    orders.forEach((order) => {
      const shopOrder = order.shopOrders.find(
        (so) => so.shop && so.shop.toString() === shopId.toString()
      );
      if (!shopOrder) return;

      const orderSubtotal = Number(shopOrder.subtotal) || 0;
      const payoutAmount = Number(shopOrder.restaurantPayout) || orderSubtotal * 0.8;
      const status = shopOrder.status;
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split("T")[0];
      const hour = orderDate.getHours();

      // Hourly distribution
      hourlyCounts[hour] += 1;

      // Status counters
      if (status === "delivered") {
        deliveredOrders += 1;
        totalRevenue += orderSubtotal;

        if (orderDate >= startOfToday) {
          todayRevenue += orderSubtotal;
        }

        // Payout buckets
        if (shopOrder.settlementStatus === "settled") {
          settledPayout += payoutAmount;
        } else {
          pendingPayout += payoutAmount;
        }

        // 7-day revenue bucket
        if (dayMap[dateKey]) {
          dayMap[dateKey].revenue += orderSubtotal;
          dayMap[dateKey].orders += 1;
        }

        // Track dish sales for delivered orders
        if (Array.isArray(shopOrder.shopOrderItems)) {
          shopOrder.shopOrderItems.forEach((soItem) => {
            const itemId = soItem.item?._id
              ? soItem.item._id.toString()
              : soItem.item
              ? soItem.item.toString()
              : soItem.name;
            const dishName = soItem.name || soItem.item?.name || "Dish";
            const dishImage = soItem.item?.image || "";
            const dishPrice = Number(soItem.price) || 0;
            const qty = Number(soItem.quantity) || 1;

            if (!dishSalesMap[itemId]) {
              dishSalesMap[itemId] = {
                id: itemId,
                name: dishName,
                image: dishImage,
                price: dishPrice,
                quantity: 0,
                revenue: 0,
              };
            }
            dishSalesMap[itemId].quantity += qty;
            dishSalesMap[itemId].revenue += dishPrice * qty;
          });
        }
      } else if (status === "cancelled") {
        cancelledOrders += 1;
      }
    });

    // Top 5 best selling dishes
    const topDishes = Object.values(dishSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Format hourly heatmap
    const hourlyHeatmap = hourlyCounts.map((count, hr) => ({
      hour: hr,
      label: hr === 0 ? "12 AM" : hr < 12 ? `${hr} AM` : hr === 12 ? "12 PM" : `${hr - 12} PM`,
      orders: count,
    }));

    // Format daily trends
    const dailyTrends = Object.values(dayMap);

    const totalOrders = orders.length;
    const averageOrderValue = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

    // 2. Fetch Reel performance
    const ownerReels = await Reel.find({ owner: userId })
      .populate("foodItem", "name price image")
      .sort({ views: -1 })
      .lean();

    const totalViews = ownerReels.reduce((sum, r) => sum + (r.views || 0), 0);
    const totalLikes = ownerReels.reduce((sum, r) => sum + (r.likes ? r.likes.length : 0), 0);

    return res.status(200).json({
      hasShop: true,
      shop: {
        id: shop._id,
        name: shop.name,
        image: shop.image,
        city: shop.city,
        rating: shop.rating,
        commissionRate: shop.commissionRate || 20,
      },
      stats: {
        todayRevenue,
        totalRevenue,
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        averageOrderValue,
        pendingPayout,
        settledPayout,
      },
      dailyTrends,
      hourlyHeatmap,
      topDishes,
      reelStats: {
        totalReels: ownerReels.length,
        totalViews,
        totalLikes,
        reels: ownerReels.slice(0, 6).map((r) => ({
          id: r._id,
          caption: r.caption,
          thumbnailUrl: r.thumbnailUrl,
          videoUrl: r.videoUrl,
          views: r.views || 0,
          likesCount: r.likes ? r.likes.length : 0,
          foodItem: r.foodItem
            ? {
                name: r.foodItem.name,
                price: r.foodItem.price,
                image: r.foodItem.image,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: `getOwnerAnalytics error: ${error.message || error}` });
  }
};
