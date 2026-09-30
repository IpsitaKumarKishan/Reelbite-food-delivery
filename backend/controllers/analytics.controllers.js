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
    const shopObjId = new mongoose.Types.ObjectId(shopId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [analyticsAgg, ownerReels] = await Promise.all([
      Order.aggregate([
        { $match: { "shopOrders.shop": shopObjId } },
        {
          $facet: {
            orderCounts: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                },
              },
            ],
            hourlyCounts: [
              {
                $group: {
                  _id: { $hour: "$createdAt" },
                  orders: { $sum: 1 },
                },
              },
            ],
            shopOrderStats: [
              { $unwind: "$shopOrders" },
              { $match: { "shopOrders.shop": shopObjId } },
              {
                $group: {
                  _id: null,
                  deliveredOrders: {
                    $sum: { $cond: [{ $eq: ["$shopOrders.status", "delivered"] }, 1, 0] },
                  },
                  cancelledOrders: {
                    $sum: { $cond: [{ $eq: ["$shopOrders.status", "cancelled"] }, 1, 0] },
                  },
                  totalRevenue: {
                    $sum: {
                      $cond: [
                        { $eq: ["$shopOrders.status", "delivered"] },
                        { $ifNull: ["$shopOrders.subtotal", 0] },
                        0,
                      ],
                    },
                  },
                  todayRevenue: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$shopOrders.status", "delivered"] },
                            { $gte: ["$createdAt", startOfToday] },
                          ],
                        },
                        { $ifNull: ["$shopOrders.subtotal", 0] },
                        0,
                      ],
                    },
                  },
                  pendingPayout: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$shopOrders.status", "delivered"] },
                            { $ne: ["$shopOrders.settlementStatus", "settled"] },
                          ],
                        },
                        {
                          $ifNull: [
                            "$shopOrders.restaurantPayout",
                            { $multiply: [{ $ifNull: ["$shopOrders.subtotal", 0] }, 0.8] },
                          ],
                        },
                        0,
                      ],
                    },
                  },
                  settledPayout: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$shopOrders.status", "delivered"] },
                            { $eq: ["$shopOrders.settlementStatus", "settled"] },
                          ],
                        },
                        {
                          $ifNull: [
                            "$shopOrders.restaurantPayout",
                            { $multiply: [{ $ifNull: ["$shopOrders.subtotal", 0] }, 0.8] },
                          ],
                        },
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            dailyTrends: [
              { $match: { createdAt: { $gte: sevenDaysAgo } } },
              { $unwind: "$shopOrders" },
              { $match: { "shopOrders.shop": shopObjId, "shopOrders.status": "delivered" } },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  revenue: { $sum: { $ifNull: ["$shopOrders.subtotal", 0] } },
                  orders: { $sum: 1 },
                },
              },
            ],
            topDishes: [
              { $unwind: "$shopOrders" },
              { $match: { "shopOrders.shop": shopObjId, "shopOrders.status": "delivered" } },
              { $unwind: "$shopOrders.shopOrderItems" },
              {
                $group: {
                  _id: {
                    $ifNull: [
                      "$shopOrders.shopOrderItems.item",
                      "$shopOrders.shopOrderItems.name",
                    ],
                  },
                  name: { $first: "$shopOrders.shopOrderItems.name" },
                  price: { $first: "$shopOrders.shopOrderItems.price" },
                  quantity: { $sum: "$shopOrders.shopOrderItems.quantity" },
                  revenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$shopOrders.shopOrderItems.price", 0] },
                        { $ifNull: ["$shopOrders.shopOrderItems.quantity", 1] },
                      ],
                    },
                  },
                },
              },
              { $sort: { quantity: -1 } },
              { $limit: 5 },
              {
                $lookup: {
                  from: "items",
                  localField: "_id",
                  foreignField: "_id",
                  as: "itemDoc",
                },
              },
              {
                $project: {
                  id: "$_id",
                  name: { $ifNull: [{ $arrayElemAt: ["$itemDoc.name", 0] }, "$name"] },
                  image: { $ifNull: [{ $arrayElemAt: ["$itemDoc.image", 0] }, ""] },
                  price: { $ifNull: [{ $arrayElemAt: ["$itemDoc.price", 0] }, "$price"] },
                  quantity: 1,
                  revenue: 1,
                },
              },
            ],
          },
        },
      ]),
      Reel.find({ owner: userId })
        .populate("foodItem", "name price image")
        .sort({ views: -1 })
        .lean(),
    ]);

    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      dayMap[dateKey] = { date: dateKey, day: dayLabel, revenue: 0, orders: 0 };
    }

    const dailyTrendsAgg = analyticsAgg[0]?.dailyTrends || [];
    dailyTrendsAgg.forEach((t) => {
      if (dayMap[t._id]) {
        dayMap[t._id].revenue = Math.round(t.revenue);
        dayMap[t._id].orders = t.orders;
      }
    });

    const hourlyCounts = new Array(24).fill(0);
    const hourlyAgg = analyticsAgg[0]?.hourlyCounts || [];
    hourlyAgg.forEach((h) => {
      if (h._id >= 0 && h._id < 24) {
        hourlyCounts[h._id] = h.orders;
      }
    });

    const hourlyHeatmap = hourlyCounts.map((count, hr) => ({
      hour: hr,
      label: hr === 0 ? "12 AM" : hr < 12 ? `${hr} AM` : hr === 12 ? "12 PM" : `${hr - 12} PM`,
      orders: count,
    }));

    const orderCounts = analyticsAgg[0]?.orderCounts?.[0] || { totalOrders: 0 };
    const shopOrderStats = analyticsAgg[0]?.shopOrderStats?.[0] || {
      deliveredOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      todayRevenue: 0,
      pendingPayout: 0,
      settledPayout: 0,
    };

    const topDishes = (analyticsAgg[0]?.topDishes || []).map((d) => ({
      id: d.id ? d.id.toString() : d._id.toString(),
      name: d.name || "Dish",
      image: d.image || "",
      price: Math.round(d.price || 0),
      quantity: d.quantity || 0,
      revenue: Math.round(d.revenue || 0),
    }));

    const totalOrders = orderCounts.totalOrders;
    const deliveredOrders = shopOrderStats.deliveredOrders;
    const totalRevenue = Math.round(shopOrderStats.totalRevenue);
    const todayRevenue = Math.round(shopOrderStats.todayRevenue);
    const pendingPayout = Math.round(shopOrderStats.pendingPayout);
    const settledPayout = Math.round(shopOrderStats.settledPayout);
    const averageOrderValue = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;

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
        cancelledOrders: shopOrderStats.cancelledOrders,
        averageOrderValue,
        pendingPayout,
        settledPayout,
      },
      dailyTrends: Object.values(dayMap),
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
