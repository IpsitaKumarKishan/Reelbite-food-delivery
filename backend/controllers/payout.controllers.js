import Order from "../models/order.model.js";
import Payout from "../models/payout.model.js";
import Shop from "../models/shop.model.js";

export const getOwnerEarnings = async (req, res) => {
  try {
    const ownerId = req.userId;
    const shop = await Shop.findOne({ owner: ownerId }).lean();
    
    // Find all orders containing a shopOrder for this owner
    const orders = await Order.find({ "shopOrders.owner": ownerId })
      .sort({ createdAt: -1 })
      .populate("shopOrders.shopOrderItems.item", "name price")
      .lean();

    let totalUnsettledPayout = 0;
    let totalSettledPayout = 0;
    let totalCommissionDeducted = 0;
    const ownerOrderDetails = [];

    orders.forEach((order) => {
      order.shopOrders.forEach((so) => {
        if (so.owner && so.owner.toString() === ownerId.toString()) {
          const subtotal = Number(so.subtotal) || 0;
          const rate = Number(so.commissionRate) || 20;
          const commissionAmount = Number(so.commissionAmount) || Math.round(subtotal * (rate / 100) * 100) / 100;
          const restaurantPayout = Number(so.restaurantPayout) || Math.round((subtotal - commissionAmount) * 100) / 100;
          const settlementStatus = so.settlementStatus || "unsettled";

          totalCommissionDeducted += commissionAmount;
          if (settlementStatus === "settled") {
            totalSettledPayout += restaurantPayout;
          } else {
            totalUnsettledPayout += restaurantPayout;
          }

          ownerOrderDetails.push({
            orderId: order._id,
            createdAt: order.createdAt,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.payment ? "Paid" : "Pending",
            orderStatus: so.status,
            items: so.shopOrderItems,
            subtotal,
            commissionRate: rate,
            commissionAmount,
            restaurantPayout,
            settlementStatus
          });
        }
      });
    });

    const payouts = await Payout.find({ recipientId: ownerId }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      shop,
      summary: {
        totalUnsettledPayout: Math.round(totalUnsettledPayout * 100) / 100,
        totalSettledPayout: Math.round(totalSettledPayout * 100) / 100,
        totalCommissionDeducted: Math.round(totalCommissionDeducted * 100) / 100,
        totalOrders: ownerOrderDetails.length
      },
      orders: ownerOrderDetails,
      payoutHistory: payouts
    });
  } catch (error) {
    console.error("Get owner earnings error:", error);
    return res.status(500).json({ message: `Failed to fetch earnings: ${error.message}` });
  }
};

export const settleOwnerOrders = async (req, res) => {
  try {
    const ownerId = req.userId;
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: "Select at least one order to settle" });
    }

    const shop = await Shop.findOne({ owner: ownerId });
    const orders = await Order.find({ _id: { $in: orderIds }, "shopOrders.owner": ownerId });

    let totalAmountToSettle = 0;
    const settledOrderIds = [];

    for (const order of orders) {
      let orderModified = false;
      order.shopOrders.forEach((so) => {
        if (so.owner && so.owner.toString() === ownerId.toString() && so.settlementStatus !== "settled") {
          const subtotal = Number(so.subtotal) || 0;
          const rate = Number(so.commissionRate) || 20;
          const commissionAmount = Number(so.commissionAmount) || Math.round(subtotal * (rate / 100) * 100) / 100;
          const restaurantPayout = Number(so.restaurantPayout) || Math.round((subtotal - commissionAmount) * 100) / 100;

          so.settlementStatus = "settled";
          totalAmountToSettle += restaurantPayout;
          orderModified = true;
          if (!settledOrderIds.includes(order._id)) {
            settledOrderIds.push(order._id);
          }
        }
      });

      if (orderModified) {
        // If all shop orders in this order are settled, update order-level settlementStatus
        const allSettled = order.shopOrders.every((so) => so.settlementStatus === "settled");
        if (allSettled) {
          order.settlementStatus = "settled";
        }
        await order.save();
      }
    }

    if (totalAmountToSettle === 0) {
      return res.status(400).json({ message: "No unsettled orders found in selected list" });
    }

    const newPayout = new Payout({
      recipientType: "restaurant",
      recipientId: ownerId,
      shopId: shop ? shop._id : null,
      amount: Math.round(totalAmountToSettle * 100) / 100,
      orderIds: settledOrderIds,
      status: "paid",
      settledAt: new Date()
    });

    await newPayout.save();

    return res.status(200).json({
      message: "Orders settled successfully",
      payout: newPayout
    });
  } catch (error) {
    console.error("Settle orders error:", error);
    return res.status(500).json({ message: `Settlement failed: ${error.message}` });
  }
};
