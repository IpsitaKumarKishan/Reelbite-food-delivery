import Coupon from "../models/coupon.model.js";

/**
 * Auto-seeds default initial coupons if collection is empty
 */
const ensureDefaultCoupons = async () => {
  const count = await Coupon.countDocuments();
  if (count === 0) {
    const oneMonthAhead = new Date();
    oneMonthAhead.setMonth(oneMonthAhead.getMonth() + 3);

    const defaultCoupons = [
      {
        code: "WELCOME50",
        title: "50% OFF up to ₹100",
        description: "Welcome to Reelbite! Get 50% discount on your meal",
        discountType: "percentage",
        discountValue: 50,
        maxDiscount: 100,
        minOrderValue: 199,
        validUntil: oneMonthAhead,
        usageLimitPerUser: 1,
        isActive: true,
      },
      {
        code: "FLAT100",
        title: "Flat ₹100 OFF",
        description: "Get flat ₹100 discount on grand orders above ₹499",
        discountType: "flat",
        discountValue: 100,
        minOrderValue: 499,
        validUntil: oneMonthAhead,
        usageLimitPerUser: 2,
        isActive: true,
      },
      {
        code: "FESTIVE20",
        title: "20% OFF up to ₹150",
        description: "Celebrate food with 20% discount on orders above ₹299",
        discountType: "percentage",
        discountValue: 20,
        maxDiscount: 150,
        minOrderValue: 299,
        validUntil: oneMonthAhead,
        usageLimitPerUser: 3,
        isActive: true,
      },
    ];

    await Coupon.insertMany(defaultCoupons);
  }
};

/**
 * GET /api/coupons/available
 * Lists active, valid coupons for users
 */
export const getAvailableCoupons = async (req, res) => {
  try {
    const userId = req.userId;
    await ensureDefaultCoupons();

    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      validUntil: { $gte: now },
      validFrom: { $lte: now },
    }).lean();

    const formatted = coupons.map((c) => {
      const timesUsed = c.usedBy?.filter(
        (u) => u.user && u.user.toString() === userId?.toString()
      ).length || 0;
      const isExhausted = timesUsed >= (c.usageLimitPerUser || 1);

      return {
        _id: c._id,
        code: c.code,
        title: c.title,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscount: c.maxDiscount,
        minOrderValue: c.minOrderValue,
        validUntil: c.validUntil,
        timesUsed,
        isExhausted,
      };
    });

    return res.status(200).json({ success: true, coupons: formatted });
  } catch (error) {
    console.error("Error in getAvailableCoupons:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/coupons/apply
 * Validates a coupon code against current subtotal and user history
 */
export const applyCoupon = async (req, res) => {
  try {
    const userId = req.userId;
    const { code, subtotal } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    if (subtotal === undefined || subtotal === null || Number(subtotal) <= 0) {
      return res.status(400).json({ success: false, message: "Valid subtotal is required" });
    }

    const orderSubtotal = Number(subtotal);
    const cleanCode = code.trim().toUpperCase();

    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or inactive coupon code" });
    }

    const now = new Date();
    if (coupon.validUntil < now || coupon.validFrom > now) {
      return res.status(400).json({ success: false, message: "This coupon has expired" });
    }

    // Check minimum order value
    if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `Coupon '${coupon.code}' requires a minimum order of ₹${coupon.minOrderValue}`,
      });
    }

    // Check usage limit
    const timesUsed = coupon.usedBy?.filter(
      (u) => u.user && u.user.toString() === userId?.toString()
    ).length || 0;

    if (timesUsed >= coupon.usageLimitPerUser) {
      return res.status(400).json({
        success: false,
        message: `You have already used coupon '${coupon.code}' the maximum allowed times`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "flat") {
      discountAmount = Math.min(coupon.discountValue, orderSubtotal);
    } else if (coupon.discountType === "percentage") {
      const calculated = Math.round((orderSubtotal * coupon.discountValue) / 100);
      discountAmount = coupon.maxDiscount
        ? Math.min(calculated, coupon.maxDiscount)
        : calculated;
    }

    discountAmount = Math.min(discountAmount, orderSubtotal);
    const finalSubtotal = Math.max(0, orderSubtotal - discountAmount);

    return res.status(200).json({
      success: true,
      message: `Coupon '${coupon.code}' applied! You saved ₹${discountAmount}`,
      coupon: {
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType,
        discountAmount,
        finalSubtotal,
      },
    });
  } catch (error) {
    console.error("Error in applyCoupon:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
