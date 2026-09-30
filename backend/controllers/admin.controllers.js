import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import Order from "../models/order.model.js";
import Item from "../models/item.model.js";
import Reel from "../models/reel.model.js";

/**
 * GET /api/admin/metrics
 * Returns platform-level executive metrics: GMV, commission, order volumes, user breakdown, and city radar.
 */
export const getPlatformMetrics = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [userBreakdownAgg, shopBreakdownAgg, orderAgg] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            consumers: { $sum: { $cond: [{ $eq: ["$role", "user"] }, 1, 0] } },
            owners: { $sum: { $cond: [{ $eq: ["$role", "owner"] }, 1, 0] } },
            deliveryPartners: { $sum: { $cond: [{ $eq: ["$role", "deliveryBoy"] }, 1, 0] } },
            admins: { $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] } },
            onlineUsers: { $sum: { $cond: ["$isOnline", 1, 0] } },
          },
        },
      ]),
      Shop.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$status", "active"] }, { $eq: ["$isApproved", true] }] },
                  1,
                  0,
                ],
              },
            },
            pending: {
              $sum: {
                $cond: [
                  { $or: [{ $eq: ["$status", "pending"] }, { $eq: ["$isApproved", false] }] },
                  1,
                  0,
                ],
              },
            },
            suspended: {
              $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
            },
          },
        },
      ]),
      Order.aggregate([
        {
          $addFields: {
            isFullyCancelled: {
              $or: [
                { $eq: ["$cancellation.isCancelled", true] },
                {
                  $eq: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ["$shopOrders", []] },
                          as: "so",
                          cond: { $ne: ["$$so.status", "cancelled"] },
                        },
                      },
                    },
                    0,
                  ],
                },
              ],
            },
            effectiveAmount: { $ifNull: ["$totalAmount", 0] },
            effectiveCommission: {
              $ifNull: [
                "$commissionAmount",
                { $multiply: [{ $ifNull: ["$subtotal", { $ifNull: ["$totalAmount", 0] }] }, 0.15] },
              ],
            },
            pRevenue: {
              $ifNull: [
                "$platformRevenue",
                {
                  $add: [
                    {
                      $ifNull: [
                        "$commissionAmount",
                        { $multiply: [{ $ifNull: ["$subtotal", { $ifNull: ["$totalAmount", 0] }] }, 0.15] },
                      ],
                    },
                    { $ifNull: ["$platformFee", 5] },
                  ],
                },
              ],
            },
          },
        },
        {
          $facet: {
            overviewTotals: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  cancelledOrdersCount: { $sum: { $cond: ["$isFullyCancelled", 1, 0] } },
                  deliveredOrdersCount: { $sum: { $cond: ["$isFullyCancelled", 0, 1] } },
                  gmv: {
                    $sum: { $cond: ["$isFullyCancelled", 0, "$effectiveAmount"] },
                  },
                  platformRevenue: {
                    $sum: { $cond: ["$isFullyCancelled", 0, "$pRevenue"] },
                  },
                  totalDeliveryFees: {
                    $sum: { $cond: ["$isFullyCancelled", 0, { $ifNull: ["$deliveryFee", 0] }] },
                  },
                  totalPlatformFees: {
                    $sum: { $cond: ["$isFullyCancelled", 0, { $ifNull: ["$platformFee", 0] }] },
                  },
                },
              },
            ],
            sevenDayTrend: [
              {
                $match: {
                  isFullyCancelled: false,
                  createdAt: { $gte: sevenDaysAgo },
                },
              },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  gmv: { $sum: "$effectiveAmount" },
                  orders: { $sum: 1 },
                },
              },
            ],
            cityRadar: [
              {
                $match: {
                  isFullyCancelled: false,
                },
              },
              {
                $project: {
                  effectiveAmount: 1,
                  city: {
                    $let: {
                      vars: {
                        parts: {
                          $split: [{ $ifNull: ["$deliveryAddress.text", "Local"] }, ","],
                        },
                      },
                      in: {
                        $trim: {
                          input: {
                            $cond: [
                              { $gt: [{ $size: "$$parts" }, 1] },
                              { $arrayElemAt: ["$$parts", -2] },
                              { $arrayElemAt: ["$$parts", 0] },
                            ],
                          },
                        },
                      },
                    },
                  },
                },
              },
              {
                $group: {
                  _id: "$city",
                  orders: { $sum: 1 },
                  revenue: { $sum: "$effectiveAmount" },
                },
              },
              { $sort: { revenue: -1 } },
              { $limit: 6 },
            ],
          },
        },
      ]),
    ]);

    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      dayMap[dateKey] = { date: dateKey, day: dayLabel, gmv: 0, orders: 0 };
    }

    const trendResults = orderAgg[0]?.sevenDayTrend || [];
    trendResults.forEach((t) => {
      if (dayMap[t._id]) {
        dayMap[t._id].gmv = Math.round(t.gmv);
        dayMap[t._id].orders = t.orders;
      }
    });

    const cityRadar = (orderAgg[0]?.cityRadar || []).map((c) => ({
      city: c._id || "Local",
      orders: c.orders,
      revenue: Math.round(c.revenue),
    }));

    const totals = orderAgg[0]?.overviewTotals?.[0] || {
      totalOrders: 0,
      cancelledOrdersCount: 0,
      deliveredOrdersCount: 0,
      gmv: 0,
      platformRevenue: 0,
      totalDeliveryFees: 0,
      totalPlatformFees: 0,
    };

    const activeOrdersCount = totals.totalOrders - totals.cancelledOrdersCount;
    const gmv = Math.round(totals.gmv);
    const platformRevenue = Math.round(totals.platformRevenue);

    return res.status(200).json({
      overview: {
        gmv,
        platformRevenue,
        totalOrders: totals.totalOrders,
        deliveredOrdersCount: totals.deliveredOrdersCount,
        cancelledOrdersCount: totals.cancelledOrdersCount,
        totalDeliveryFees: Math.round(totals.totalDeliveryFees),
        totalPlatformFees: Math.round(totals.totalPlatformFees),
        averageOrderValue: activeOrdersCount > 0 ? Math.round(gmv / activeOrdersCount) : 0,
      },
      userBreakdown: {
        total: userBreakdownAgg[0]?.total || 0,
        consumers: userBreakdownAgg[0]?.consumers || 0,
        owners: userBreakdownAgg[0]?.owners || 0,
        deliveryPartners: userBreakdownAgg[0]?.deliveryPartners || 0,
        admins: userBreakdownAgg[0]?.admins || 0,
        onlineUsers: userBreakdownAgg[0]?.onlineUsers || 0,
      },
      shopBreakdown: {
        total: shopBreakdownAgg[0]?.total || 0,
        active: shopBreakdownAgg[0]?.active || 0,
        pending: shopBreakdownAgg[0]?.pending || 0,
        suspended: shopBreakdownAgg[0]?.suspended || 0,
      },
      sevenDayTrend: Object.values(dayMap),
      cityRadar,
    });
  } catch (error) {
    return res.status(500).json({ message: `getPlatformMetrics error: ${error.message || error}` });
  }
};

/**
 * GET /api/admin/shops
 * List all shops with optional status filter and search.
 */
export const getAllShops = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { city: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const [shops, shopMetricsAgg] = await Promise.all([
      Shop.find(query)
        .populate("owner", "fullName email mobile")
        .populate("items", "name price category")
        .sort({ createdAt: -1 })
        .lean(),
      Order.aggregate([
        {
          $match: {
            $or: [
              { "cancellation.isCancelled": { $ne: true } },
              { cancellation: { $exists: false } },
            ],
          },
        },
        { $unwind: "$shopOrders" },
        {
          $group: {
            _id: "$shopOrders.shop",
            totalOrders: { $sum: 1 },
            completedOrders: {
              $sum: { $cond: [{ $eq: ["$shopOrders.status", "delivered"] }, 1, 0] },
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
          },
        },
      ]),
    ]);

    const metricsMap = new Map();
    shopMetricsAgg.forEach((m) => {
      if (m._id) metricsMap.set(m._id.toString(), m);
    });

    const shopListWithMetrics = shops.map((shop) => {
      const m = metricsMap.get(shop._id.toString());
      return {
        ...shop,
        totalRevenue: m ? m.totalRevenue : 0,
        completedOrders: m ? m.completedOrders : 0,
        totalOrders: m ? m.totalOrders : 0,
        itemCount: shop.items ? shop.items.length : 0,
      };
    });

    return res.status(200).json(shopListWithMetrics);
  } catch (error) {
    return res.status(500).json({ message: `getAllShops error: ${error.message || error}` });
  }
};

/**
 * PATCH /api/admin/shops/:shopId/status
 * Updates restaurant approval or suspension status.
 */
export const updateShopStatus = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status } = req.body;

    if (!["active", "pending", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const shop = await Shop.findByIdAndUpdate(
      shopId,
      {
        status,
        isApproved: status === "active",
      },
      { new: true }
    ).populate("owner", "fullName email mobile");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.status(200).json({
      message: `Shop status updated to ${status}`,
      shop,
    });
  } catch (error) {
    return res.status(500).json({ message: `updateShopStatus error: ${error.message || error}` });
  }
};

/**
 * GET /api/admin/users
 * Lists platform users with optional role filtering and keyword search.
 */
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const query = {};

    if (role && role !== "all") {
      query.role = role;
    }

    if (search && search.trim()) {
      query.$or = [
        { fullName: { $regex: search.trim(), $options: "i" } },
        { email: { $regex: search.trim(), $options: "i" } },
        { mobile: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password -resetOtp -otpExpires")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: `getAllUsers error: ${error.message || error}` });
  }
};

/**
 * PATCH /api/admin/users/:userId/role
 * Changes or promotes a user's role.
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "owner", "deliveryBoy", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role value" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password -resetOtp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: `User role updated to ${role}`,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: `updateUserRole error: ${error.message || error}` });
  }
};

/**
 * PATCH /api/admin/users/:userId/status
 * Suspends or reactivates a user account.
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value (must be 'active' or 'suspended')" });
    }

    if (userId.toString() === req.userId?.toString()) {
      return res.status(400).json({ message: "You cannot suspend your own admin account." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select("-password -resetOtp -otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: `User status changed to ${status}`,
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: `updateUserStatus error: ${error.message || error}` });
  }
};

/**
 * DELETE /api/admin/users/:userId
 * Permanently removes a user account from the platform.
 */
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId.toString() === req.userId?.toString()) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // If deleting an owner, cascade delete all their shops, items, and reels so they never appear in feeds
    if (targetUser.role === "owner") {
      const ownerShops = await Shop.find({ owner: userId }).select("_id");
      const shopIds = ownerShops.map((s) => s._id);

      if (shopIds.length > 0) {
        await Item.deleteMany({ shop: { $in: shopIds } });
        await Reel.deleteMany({ $or: [{ shop: { $in: shopIds } }, { owner: userId }] });
        await Shop.deleteMany({ owner: userId });
      }
    }

    await User.findByIdAndDelete(userId);

    // Run self-healing cleanup for any remaining orphaned shops
    await cleanupOrphanedShops();

    return res.status(200).json({
      message: `User ${targetUser.fullName || targetUser.email} and all associated restaurant assets removed successfully`,
      userId,
    });
  } catch (error) {
    return res.status(500).json({ message: `deleteUser error: ${error.message || error}` });
  }
};

/**
 * DELETE /api/admin/shops/:shopId
 * Permanently removes a restaurant shop, its menu items, and its reels from the platform.
 */
export const deleteShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const targetShop = await Shop.findById(shopId);
    if (!targetShop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    await Item.deleteMany({ shop: shopId });
    await Reel.deleteMany({ shop: shopId });
    await Shop.findByIdAndDelete(shopId);

    return res.status(200).json({
      message: `Shop "${targetShop.name}" and all associated menu items and reels removed successfully.`,
      shopId,
    });
  } catch (error) {
    return res.status(500).json({ message: `deleteShop error: ${error.message || error}` });
  }
};

/**
 * Self-healing cleanup utility: Automatically purges orphaned shops and items whose owner accounts no longer exist.
 */
export const cleanupOrphanedShops = async () => {
  try {
    const allShops = await Shop.find().select("_id name owner").lean();
    const orphanedShopIds = [];

    for (const shop of allShops) {
      if (!shop.owner) {
        orphanedShopIds.push(shop._id);
        continue;
      }
      const ownerExists = await User.exists({ _id: shop.owner });
      if (!ownerExists) {
        orphanedShopIds.push(shop._id);
      }
    }

    if (orphanedShopIds.length > 0) {
      await Item.deleteMany({ shop: { $in: orphanedShopIds } });
      await Reel.deleteMany({ shop: { $in: orphanedShopIds } });
      await Shop.deleteMany({ _id: { $in: orphanedShopIds } });
      console.log(`[Auto-Cleanup] Successfully purged ${orphanedShopIds.length} orphaned shop(s) and their menu items.`);
    }
  } catch (err) {
    console.error("[Auto-Cleanup Notice]:", err.message || err);
  }
};

/**
 * GET /api/admin/disputes
 * Lists disputed, cancelled, or refunded orders for platform arbitration.
 */
export const getDisputesAndRefunds = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { "cancellation.isCancelled": true },
        { "refund.status": { $in: ["initiated", "processed", "failed"] } },
      ],
    })
      .populate("user", "fullName email mobile")
      .populate("shopOrders.shop", "name city")
      .sort({ createdAt: -1 })
      .lean();

    const formattedDisputes = orders.map((o) => ({
      id: o._id,
      customerName: o.user?.fullName || "Customer",
      customerEmail: o.user?.email || "",
      customerMobile: o.user?.mobile || "",
      shopName: o.shopOrders?.[0]?.shop?.name || "Restaurant",
      totalAmount: o.totalAmount,
      paymentMethod: o.paymentMethod,
      razorpayPaymentId: o.razorpayPaymentId || null,
      cancelledAt: o.cancellation?.cancelledAt || o.updatedAt,
      cancelledBy: o.cancellation?.cancelledBy || "customer",
      reason: o.cancellation?.reason || "Not specified",
      refundStatus: o.refund?.status || "none",
      refundAmount: o.refund?.amount || o.totalAmount,
      refundId: o.refund?.refundId || null,
    }));

    return res.status(200).json(formattedDisputes);
  } catch (error) {
    return res.status(500).json({ message: `getDisputesAndRefunds error: ${error.message || error}` });
  }
};

/**
 * POST /api/admin/shops/:shopId/settle
 * Settles all pending payout balances for a restaurant.
 */
export const settleShopPayout = async (req, res) => {
  try {
    const { shopId } = req.params;

    const orders = await Order.find({
      "shopOrders.shop": shopId,
      "shopOrders.status": "delivered",
      "shopOrders.settlementStatus": "unsettled",
    });

    let settledCount = 0;
    let settledAmount = 0;

    for (const order of orders) {
      let orderModified = false;
      order.shopOrders.forEach((so) => {
        if (
          so.shop &&
          so.shop.toString() === shopId.toString() &&
          so.status === "delivered" &&
          so.settlementStatus !== "settled"
        ) {
          so.settlementStatus = "settled";
          settledCount += 1;
          settledAmount += Number(so.restaurantPayout) || Number(so.subtotal) * 0.8;
          orderModified = true;
        }
      });
      if (orderModified) {
        await order.save();
      }
    }

    return res.status(200).json({
      message: `Successfully settled ${settledCount} orders for ₹${Math.round(settledAmount)}`,
      settledCount,
      settledAmount: Math.round(settledAmount),
    });
  } catch (error) {
    return res.status(500).json({ message: `settleShopPayout error: ${error.message || error}` });
  }
};

/**
 * GET /api/admin/quick-badges
 * Returns lightweight summary counts for Admin header/profile navigation badges.
 */
export const getQuickBadges = async (req, res) => {
  try {
    const [pendingShops, pendingRefunds, unsettledPayouts] = await Promise.all([
      Shop.countDocuments({ status: "pending" }),
      Order.countDocuments({
        "cancellation.isCancelled": true,
        "refund.status": { $in: ["initiated", "failed"] },
      }),
      Order.countDocuments({
        "shopOrders.status": "delivered",
        "shopOrders.settlementStatus": "unsettled",
      }),
    ]);

    const disputesCount = pendingRefunds > 0 ? pendingRefunds : await Order.countDocuments({ "cancellation.isCancelled": true });

    return res.status(200).json({
      pendingShopsCount: pendingShops,
      unresolvedDisputesCount: disputesCount,
      unsettledPayoutsCount: unsettledPayouts,
      totalAlerts: pendingShops + disputesCount,
    });
  } catch (error) {
    return res.status(500).json({ message: `getQuickBadges error: ${error.message || error}` });
  }
};

