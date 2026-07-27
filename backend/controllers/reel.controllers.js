import Reel from "../models/reel.model.js";
import Shop from "../models/shop.model.js";
import Item from "../models/item.model.js";
import uploadOnCloudinary, { uploadVideoOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";

export const createReel = async (req, res) => {
  try {
    const videoFile = req.files?.["video"]?.[0] || req.file;
    if (!videoFile) {
      return res.status(400).json({ message: "Video file is required" });
    }

    const videoUrl = await uploadVideoOnCloudinary(videoFile.path);
    if (!videoUrl) {
      return res.status(500).json({ message: "Failed to process video file" });
    }

    const { caption, foodItem, createInlineItem, itemName, itemPrice, itemCategory, itemFoodType } = req.body;
    const ownerId = req.userId;

    // Find owner shop
    const shop = await Shop.findOne({ owner: ownerId });
    if (!shop) {
      return res.status(400).json({ message: "You must create a shop before publishing food reels" });
    }

    let targetFoodItemId = null;

    // Handle uploaded dish image if provided
    let uploadedDishImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop";
    const imageFile = req.files?.["image"]?.[0];
    if (imageFile) {
      const cloudinaryUrl = await uploadOnCloudinary(imageFile.path);
      if (cloudinaryUrl) {
        uploadedDishImageUrl = cloudinaryUrl;
      } else {
        const fileName = path.basename(imageFile.path);
        uploadedDishImageUrl = `/reels/${fileName}`;
      }
    }

    // If owner opted to create a new food dish inline while uploading the reel
    if (createInlineItem === "true" || (itemName && itemPrice)) {
      if (!itemName || !itemPrice) {
        return res.status(400).json({ message: "Item name and price are required for new dish creation" });
      }

      const newItem = new Item({
        name: itemName,
        price: Number(itemPrice),
        category: itemCategory || "Snacks",
        foodType: itemFoodType || "veg",
        image: uploadedDishImageUrl,
        shop: shop._id,
      });

      await newItem.save();
      targetFoodItemId = newItem._id;

      // Also append to shop's items array
      if (shop.items) {
        shop.items.push(newItem._id);
        await shop.save();
      }
    } else {
      if (!foodItem) {
        return res.status(400).json({ message: "A linked food item is required for every reel" });
      }

      const existingItem = await Item.findById(foodItem);
      if (!existingItem) {
        return res.status(404).json({ message: "Selected menu item does not exist" });
      }

      if (!existingItem.shop || existingItem.shop.toString() !== shop._id.toString()) {
        return res.status(403).json({ message: "Owners can only link food items that belong to their own shop menu" });
      }

      targetFoodItemId = existingItem._id;
    }

    if (!targetFoodItemId) {
      return res.status(400).json({ message: "A linked food item is required for every reel" });
    }

    const newReel = new Reel({
      videoUrl,
      caption: caption || "",
      foodItem: targetFoodItemId,
      owner: ownerId,
      shop: shop ? shop._id : null,
    });

    await newReel.save();

    const populatedReel = await Reel.findById(newReel._id)
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType");

    return res.status(201).json({
      message: "Reel created successfully",
      reel: populatedReel,
    });
  } catch (error) {
    if (req.files) {
      Object.values(req.files).flat().forEach((f) => {
        if (f && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    }
    console.error("Create reel error:", error);
    return res.status(500).json({ message: "Server error creating reel", error: error.message });
  }
};

import jwt from "jsonwebtoken";
import ReelInteraction from "../models/reelInteraction.model.js";

export const getAllReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { city, dietPreference } = req.query;

    // Identify user if token is provided in cookies or auth header
    let userId = req.userId;
    if (!userId && req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {}
    }

    const reelQuery = {};

    // 1. HARD FILTER: Location filter by city (reusing city marketplace logic)
    if (city && city.trim() !== "") {
      const matchingShops = await Shop.find({
        city: { $regex: new RegExp(`^${city.trim()}$`, "i") }
      }).select("_id");
      const shopIds = matchingShops.map((s) => s._id);
      reelQuery.shop = { $in: shopIds };
    }

    // 2. HARD FILTER: Conditional diet filter (veg only vs all)
    if (dietPreference === "veg") {
      const matchingVegItems = await Item.find({ foodType: "veg" }).select("_id");
      const itemIds = matchingVegItems.map((i) => i._id);
      reelQuery.foodItem = { $in: itemIds };
    }

    // Fetch candidate pool passing hard location & diet filters
    const candidateReels = await Reel.find(reelQuery)
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType rating shop");

    // 3. AFFINITY SCORE: Compute user interest profile from recent interaction history
    const categoryAffinity = {};
    const shopAffinity = {};
    let hasSufficientHistory = false;

    if (userId) {
      const recentInteractions = await ReelInteraction.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(200)
        .populate({
          path: "reel",
          select: "foodItem shop",
          populate: [
            { path: "foodItem", select: "category" },
            { path: "shop", select: "_id" }
          ]
        });

      if (recentInteractions && recentInteractions.length >= 2) {
        hasSufficientHistory = true;
        recentInteractions.forEach((inter) => {
          const category = inter.reel?.foodItem?.category;
          const shopIdStr = inter.reel?.shop?._id?.toString() || inter.reel?.shop?.toString();

          let weight = 1;
          if (inter.addedToCart) weight = 10;
          else if (inter.liked || inter.shared) weight = 5;
          else if (inter.watchPercentage > 70) weight = 3;
          else if (inter.skipped || inter.watchPercentage < 15) weight = -3;

          if (category) {
            categoryAffinity[category] = (categoryAffinity[category] || 0) + weight;
          }
          if (shopIdStr) {
            shopAffinity[shopIdStr] = (shopAffinity[shopIdStr] || 0) + weight;
          }
        });
      }
    }

    // 4. COMPOSITE SCORING (Affinity + Popularity + Recency)
    const now = Date.now();
    const scoredReels = candidateReels.map((reel) => {
      const category = reel.foodItem?.category;
      const shopIdStr = reel.shop?._id?.toString();

      const catScore = category ? (categoryAffinity[category] || 0) : 0;
      const shpScore = shopIdStr ? (shopAffinity[shopIdStr] || 0) : 0;
      const affinityScore = catScore * 1.5 + shpScore * 1.0;

      const likesCount = reel.likes?.length || 0;
      const viewsCount = reel.views || 0;
      const popularityScore = likesCount * 3 + viewsCount * 0.5;

      const hoursOld = (now - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, 50 - hoursOld * 0.5);

      let finalScore = 0;
      if (hasSufficientHistory) {
        finalScore = affinityScore * 4 + popularityScore * 1.5 + recencyBoost;
      } else {
        // Cold-Start Fallback: Popularity + Recency
        finalScore = popularityScore * 3 + recencyBoost;
      }

      return { reel, finalScore, category };
    });

    // Sort candidate reels by final score descending
    scoredReels.sort((a, b) => b.finalScore - a.finalScore);

    // 5. EXPLORATION INJECTION (~15–20% slots reserved for exploration)
    let orderedReels = scoredReels.map((item) => item.reel);

    if (hasSufficientHistory && scoredReels.length > 3) {
      const topCategories = Object.keys(categoryAffinity).sort(
        (a, b) => categoryAffinity[b] - categoryAffinity[a]
      );
      const topCat = topCategories[0];

      if (topCat) {
        const topCategoryItems = scoredReels.filter((item) => item.category === topCat);
        const explorationItems = scoredReels.filter((item) => item.category !== topCat);

        if (explorationItems.length > 0 && topCategoryItems.length > 0) {
          const combined = [];
          let topIdx = 0;
          let expIdx = 0;

          for (let i = 0; i < scoredReels.length; i++) {
            // Insert 1 exploration reel every 5 positions (20%)
            if ((i + 1) % 5 === 0 && expIdx < explorationItems.length) {
              combined.push(explorationItems[expIdx++].reel);
            } else if (topIdx < topCategoryItems.length) {
              combined.push(topCategoryItems[topIdx++].reel);
            } else if (expIdx < explorationItems.length) {
              combined.push(explorationItems[expIdx++].reel);
            }
          }
          orderedReels = combined;
        }
      }
    }

    // 6. PAGINATE & RETURN
    const total = orderedReels.length;
    const paginatedReels = orderedReels.slice(skip, skip + limit);

    return res.status(200).json({
      reels: paginatedReels,
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 1,
      totalReels: total,
    });
  } catch (error) {
    console.error("Get reels error:", error);
    return res.status(500).json({ message: "Failed to fetch reels", error: error.message });
  }
};

export const getOwnerReels = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const reels = await Reel.find({ owner: ownerId })
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType")
      .sort({ createdAt: -1 });

    return res.status(200).json(reels);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch owner reels", error: error.message });
  }
};

export const toggleLikeReel = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const reel = await Reel.findById(id);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    const hasLiked = reel.likes.includes(userId);
    if (hasLiked) {
      reel.likes = reel.likes.filter((likeId) => likeId.toString() !== userId.toString());
    } else {
      reel.likes.push(userId);
    }

    await reel.save();
    return res.status(200).json({
      message: hasLiked ? "Reel unliked" : "Reel liked",
      likesCount: reel.likes.length,
      isLiked: !hasLiked,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle like", error: error.message });
  }
};

export const deleteReel = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);

    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    if (reel.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to delete this reel" });
    }

    await Reel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Reel deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete reel", error: error.message });
  }
};
