import User from "../models/user.model.js";
import Shop from "../models/shop.model.js";
import Order from "../models/order.model.js";
import Item from "../models/item.model.js";

/**
 * GET /api/admin/metrics
 * Returns platform-level executive metrics: GMV, commission, order volumes, user breakdown, and city radar.
 */
export const getPlatformMetrics = async (req, res) => {
  try {
    const [allOrders, allUsers, allShops] = await Promise.all([
      Order.find().lean(),
      User.find().select("role isOnline createdAt").lean(),
      Shop.find().populate("owner", "fullName email mobile").lean(),
    ]);

    let gmv = 0;
    let platformRevenue = 0;
    let totalDeliveryFees = 0;
    let totalPlatformFees = 0;
    let deliveredOrdersCount = 0;
    let cancelledOrdersCount = 0;

    const cityMap = {}; // city -> { orders, revenue }
    const dayMap = {}; // last 7 days YYYY-MM-DD -> { date, day, gmv, orders }

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      dayMap[dateKey] = { date: dateKey, day: dayLabel, gmv: 0, orders: 0 };
    }

    allOrders.forEach((order) => {
      const amount = Number(order.totalAmount) || 0;
      const subtotal = Number(order.subtotal) || amount;
      const orderCommission = Number(order.commissionAmount) || subtotal * 0.15;
      const pRevenue = Number(order.platformRevenue) || orderCommission + (order.platformFee || 5);
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toISOString().split("T")[0];

      gmv += amount;
      platformRevenue += pRevenue;
      totalDeliveryFees += Number(order.deliveryFee) || 0;
      totalPlatformFees += Number(order.platformFee) || 0;

      if (order.cancellation?.isCancelled) {
        cancelledOrdersCount += 1;
      } else {
        deliveredOrdersCount += 1;
      }

      // City radar
      const addressCity = order.deliveryAddress?.text?.split(",")?.slice(-2)?.[0]?.trim() || "Local";
      if (!cityMap[addressCity]) {
        cityMap[addressCity] = { city: addressCity, orders: 0, revenue: 0 };
      }
      cityMap[addressCity].orders += 1;
      cityMap[addressCity].revenue += amount;

      // 7-day trend
      if (dayMap[dateKey]) {
        dayMap[dateKey].gmv += amount;
        dayMap[dateKey].orders += 1;
      }
    });

    const userBreakdown = {
      total: allUsers.length,
      consumers: allUsers.filter((u) => u.role === "user").length,
      owners: allUsers.filter((u) => u.role === "owner").length,
      deliveryPartners: allUsers.filter((u) => u.role === "deliveryBoy").length,
      admins: allUsers.filter((u) => u.role === "admin").length,
      onlineUsers: allUsers.filter((u) => u.isOnline).length,
    };

    const shopBreakdown = {
      total: allShops.length,
      active: allShops.filter((s) => s.status === "active" || s.isApproved).length,
      pending: allShops.filter((s) => s.status === "pending" || !s.isApproved).length,
      suspended: allShops.filter((s) => s.status === "suspended").length,
    };

    const cityRadar = Object.values(cityMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return res.status(200).json({
      overview: {
        gmv: Math.round(gmv),
        platformRevenue: Math.round(platformRevenue),
        totalOrders: allOrders.length,
        deliveredOrdersCount,
        cancelledOrdersCount,
        totalDeliveryFees,
        totalPlatformFees,
        averageOrderValue: allOrders.length > 0 ? Math.round(gmv / allOrders.length) : 0,
      },
      userBreakdown,
      shopBreakdown,
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

    const shops = await Shop.find(query)
      .populate("owner", "fullName email mobile")
      .populate("items", "name price category")
      .sort({ createdAt: -1 })
      .lean();

    // Attach order revenue metrics to each shop
    const shopListWithMetrics = await Promise.all(
      shops.map(async (shop) => {
        const shopOrders = await Order.find({ "shopOrders.shop": shop._id }).lean();
        let totalRevenue = 0;
        let completedOrders = 0;

        shopOrders.forEach((o) => {
          const so = o.shopOrders.find((s) => s.shop && s.shop.toString() === shop._id.toString());
          if (so && so.status === "delivered") {
            totalRevenue += Number(so.subtotal) || 0;
            completedOrders += 1;
          }
        });

        return {
          ...shop,
          totalRevenue,
          completedOrders,
          totalOrders: shopOrders.length,
          itemCount: shop.items ? shop.items.length : 0,
        };
      })
    );

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

