import mongoose from "mongoose";
import Item from "../models/item.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";
import { getMealTimeSlot, calculateRecommendationScore } from "../utils/recommendationEngine.js";

/**
 * GET /api/recommendations/feed
 * Returns personalized feeds: Order Again, Time-Based Slot, and For You recommendations
 */
export const getFeedRecommendations = async (req, res) => {
  try {
    const userId = req.userId;
    const { city } = req.query;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Resolve target city (from query or user's city)
    const targetCity = city || user.addresses?.find(a => a.isDefault)?.city || user.city || "";

    // 1. Fetch user's "Order Again" items from past orders
    const orderAgainAgg = await Order.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          $or: [{ payment: true }, { paymentMethod: "cod" }]
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: 20 },
      { $unwind: "$shopOrders" },
      { $unwind: "$shopOrders.shopOrderItems" },
      {
        $group: {
          _id: "$shopOrders.shopOrderItems.item",
          timesOrdered: { $sum: 1 },
          totalQuantity: { $sum: "$shopOrders.shopOrderItems.quantity" },
          lastOrderedAt: { $max: "$createdAt" },
          shopId: { $first: "$shopOrders.shop" }
        }
      },
      { $sort: { timesOrdered: -1, lastOrderedAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      { $unwind: "$itemDetails" },
      {
        $lookup: {
          from: "shops",
          localField: "itemDetails.shop",
          foreignField: "_id",
          as: "shopDetails"
        }
      },
      { $unwind: { path: "$shopDetails", preserveNullAndEmptyArrays: true } }
    ]);

    const orderAgain = orderAgainAgg.map(entry => {
      const item = entry.itemDetails;
      if (entry.shopDetails) {
        item.shop = {
          _id: entry.shopDetails._id,
          name: entry.shopDetails.name,
          image: entry.shopDetails.image,
          city: entry.shopDetails.city
        };
      }
      return {
        ...item,
        reorderStats: {
          timesOrdered: entry.timesOrdered,
          lastOrderedAt: entry.lastOrderedAt
        }
      };
    });

    // 2. Build User Affinities from recent order history
    const recentOrders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate("shopOrders.shopOrderItems.item", "category foodType")
      .lean();

    const categoryCounts = {};
    const shopCounts = {};

    recentOrders.forEach(order => {
      order.shopOrders?.forEach(so => {
        const sId = so.shop?.toString();
        if (sId) shopCounts[sId] = (shopCounts[sId] || 0) + 1;

        so.shopOrderItems?.forEach(oi => {
          const cat = oi.item?.category;
          if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });
      });
    });

    const userAffinities = { categoryCounts, shopCounts };

    // 3. Find shops in city (if city provided)
    let shopQuery = {};
    if (targetCity) {
      shopQuery.city = { $regex: new RegExp(`^${targetCity}$`, "i") };
    }
    const shopsInCity = await Shop.find(shopQuery).select("_id name image city").lean();
    const cityShopIds = shopsInCity.map(s => s._id);

    const baseItemQuery = cityShopIds.length > 0 ? { shop: { $in: cityShopIds } } : {};
    if (user.dietPreference === "veg") {
      baseItemQuery.foodType = "veg";
    }

    // 4. Time-of-Day slot items
    const timeSlot = getMealTimeSlot();
    const timeBasedItems = await Item.find({
      ...baseItemQuery,
      category: { $in: timeSlot.categories }
    })
      .sort({ "rating.average": -1, createdAt: -1 })
      .limit(10)
      .populate("shop", "name image city")
      .lean();

    // 5. "For You" Recommendations using Heuristic Scoring
    const candidateItems = await Item.find(baseItemQuery)
      .limit(40)
      .populate("shop", "name image city")
      .lean();

    const scored = candidateItems
      .map(item => ({
        item,
        score: calculateRecommendationScore(item, user, userAffinities, timeSlot.categories)
      }))
      .filter(s => s.score >= 0)
      .sort((a, b) => b.score - a.score);

    const forYou = scored.slice(0, 12).map(s => s.item);

    return res.status(200).json({
      success: true,
      timeSlot: {
        slot: timeSlot.slot,
        title: timeSlot.title,
        subtitle: timeSlot.subtitle,
        icon: timeSlot.icon,
        items: timeBasedItems
      },
      orderAgain,
      forYou
    });
  } catch (error) {
    console.error("Error in getFeedRecommendations:", error);
    return res.status(500).json({ success: false, message: `Recommendation error: ${error.message}` });
  }
};

/**
 * GET /api/recommendations/cart-cross-sells
 * Suggests items that complement items currently in user's cart
 */
export const getCartCrossSells = async (req, res) => {
  try {
    const { itemIds = "" } = req.query;
    const currentItemIds = itemIds
      .split(",")
      .map(id => id.trim())
      .filter(id => mongoose.Types.ObjectId.isValid(id));

    if (currentItemIds.length === 0) {
      return res.status(200).json({ success: true, crossSells: [] });
    }

    const objectIds = currentItemIds.map(id => new mongoose.Types.ObjectId(id));

    // 1. Try to find items bought in the same shopOrder as these items in past orders
    const coOccurring = await Order.aggregate([
      {
        $match: {
          "shopOrders.shopOrderItems.item": { $in: objectIds }
        }
      },
      { $unwind: "$shopOrders" },
      { $match: { "shopOrders.shopOrderItems.item": { $in: objectIds } } },
      { $unwind: "$shopOrders.shopOrderItems" },
      {
        $match: {
          "shopOrders.shopOrderItems.item": { $nin: objectIds }
        }
      },
      {
        $group: {
          _id: "$shopOrders.shopOrderItems.item",
          frequency: { $sum: 1 }
        }
      },
      { $sort: { frequency: -1 } },
      { $limit: 4 },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      { $unwind: "$itemDetails" },
      {
        $lookup: {
          from: "shops",
          localField: "itemDetails.shop",
          foreignField: "_id",
          as: "shopDetails"
        }
      },
      { $unwind: { path: "$shopDetails", preserveNullAndEmptyArrays: true } }
    ]);

    let crossSells = coOccurring.map(c => {
      const itm = c.itemDetails;
      if (c.shopDetails) {
        itm.shop = {
          _id: c.shopDetails._id,
          name: c.shopDetails.name,
          image: c.shopDetails.image,
          city: c.shopDetails.city
        };
      }
      return itm;
    });

    // 2. Fallback: If no co-occurring history exists yet, recommend popular items from the same shop(s)
    if (crossSells.length < 3) {
      const cartItems = await Item.find({ _id: { $in: objectIds } }).select("shop category").lean();
      const shopIds = [...new Set(cartItems.map(c => c.shop).filter(Boolean))];

      const additionalItems = await Item.find({
        shop: { $in: shopIds },
        _id: { $nin: [...objectIds, ...crossSells.map(c => c._id)] }
      })
        .sort({ "rating.average": -1, price: 1 })
        .limit(4 - crossSells.length)
        .populate("shop", "name image city")
        .lean();

      crossSells = [...crossSells, ...additionalItems];
    }

    return res.status(200).json({ success: true, crossSells });
  } catch (error) {
    console.error("Error in getCartCrossSells:", error);
    return res.status(500).json({ success: false, message: `Cross-sell error: ${error.message}` });
  }
};
