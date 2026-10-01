import Reel from "../models/reel.model.js";
import Shop from "../models/shop.model.js";
import Item from "../models/item.model.js";
import uploadOnCloudinary, { uploadVideoOnCloudinary, deleteVideoFromCloudinary } from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";
import RECOMMENDATION_WEIGHTS from "../config/recommendationWeights.js";

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
      .populate("foodItem", "name price image category foodType tasteProfile");

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
import Impression from "../models/impression.model.js";
import User from "../models/user.model.js";

export const getAllReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { city, excludeIds, penalizedCategories, tasteFilter = "all" } = req.query;

    // Parse session-dedup and skip-penalty params (both fully optional)
    const excludeIdSet = excludeIds
      ? new Set(excludeIds.split(",").map((id) => id.trim()).filter(Boolean))
      : new Set();
    const penalizedCategorySet = penalizedCategories
      ? new Set(penalizedCategories.split(",").map((c) => c.trim()).filter(Boolean))
      : new Set();

    // Identify user if token is provided in cookies or auth header
    let userId = req.userId;
    if (!userId && req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {}
    }

    // Retrieve user food preferences if authenticated
    let userDietType = "all";
    let userSpiceLevel = "medium";
    let userFlavorTags = [];
    let userAllergies = [];
    let preferredCuisines = [];

    if (userId) {
      const userDoc = await User.findById(userId).select("foodPreferences dietPreference preferredCuisines").lean();
      if (userDoc) {
        const userFoodPrefs = userDoc.foodPreferences || {};
        userDietType = userFoodPrefs.dietType || userDoc.dietPreference || "all";
        userSpiceLevel = userFoodPrefs.spiceLevel || "medium";
        userFlavorTags = Array.isArray(userFoodPrefs.flavorTags) ? userFoodPrefs.flavorTags : [];
        userAllergies = Array.isArray(userFoodPrefs.allergies) ? userFoodPrefs.allergies : [];
        preferredCuisines = Array.isArray(userDoc.preferredCuisines) ? userDoc.preferredCuisines : [];
      }
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

    // Fetch candidate pool passing hard location filter (capped at 150 most recent candidates for memory protection)
    const reelFindQuery = { ...reelQuery };
    if (excludeIdSet.size > 0) {
      reelFindQuery._id = { $nin: Array.from(excludeIdSet) };
    }
    const candidateReels = await Reel.find(reelFindQuery)
      .sort({ createdAt: -1 })
      .limit(150)
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType tasteProfile rating shop");

    // 2. HARD DIETARY FILTERING (Guarantees user lifestyle rules)
    let filteredCandidates = candidateReels.filter((reel) => {
      const item = reel.foodItem;
      if (!item) return false;

      const isNonVeg = item.foodType === "non veg";

      // Override if specific taste filter tab is selected
      if (tasteFilter === "veg" && isNonVeg) return false;
      if (tasteFilter === "spicy") {
        const itemSpice = item.tasteProfile?.spiceLevel || "medium";
        const isSpicy = itemSpice === "spicy" || itemSpice === "extra-spicy" || /spicy|chili|schezwan|fiery|peri-peri|tikka|masala|hot/i.test(item.name || "");
        if (!isSpicy) return false;
      }

      // Hard filter based on user's saved dietary preferences
      if (userDietType === "veg" && isNonVeg) return false;
      if (userDietType === "vegan") {
        if (isNonVeg) return false;
        if (item.tasteProfile?.isVegan === false) return false;
      }
      if (userDietType === "jain") {
        if (isNonVeg) return false;
        if (item.tasteProfile?.isJainFriendly === false) return false;
      }

      return true;
    });

    if (filteredCandidates.length === 0 && candidateReels.length > 0 && userDietType === "all") {
      filteredCandidates = candidateReels;
    }

    // 3. AFFINITY SCORE: Compute user interest profile from recent interaction history
    const categoryAffinity = {};
    const shopAffinity = {};
    let hasSufficientHistory = false;

    const { interaction: IW, watchThresholds: WT, decay: DC } = RECOMMENDATION_WEIGHTS;

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

        const nowMs = Date.now();
        recentInteractions.forEach((inter) => {
          const category = inter.reel?.foodItem?.category;
          const shopIdStr = inter.reel?.shop?._id?.toString() || inter.reel?.shop?.toString();

          let weight = IW.default;
          if (inter.addedToCart) weight = IW.addedToCart;
          else if (inter.liked || inter.shared) weight = IW.likedOrShared;
          else if (inter.watchPercentage > WT.high) weight = IW.highWatch;
          else if (inter.skipped || inter.watchPercentage < WT.low) weight = IW.negativeSignal;

          const ageInDays = (nowMs - new Date(inter.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          const decayFactor = Math.exp(-ageInDays / DC.halfLifeDays);
          const decayedWeight = weight * decayFactor;

          if (category) {
            categoryAffinity[category] = (categoryAffinity[category] || 0) + decayedWeight;
          }
          if (shopIdStr) {
            shopAffinity[shopIdStr] = (shopAffinity[shopIdStr] || 0) + decayedWeight;
          }
        });

        const { exposure: EXP_NORM } = RECOMMENDATION_WEIGHTS;
        const recentImpressions = await Impression.find({ user: userId })
          .sort({ shownAt: -1 })
          .limit(500)
          .lean();

        if (recentImpressions && recentImpressions.length >= (EXP_NORM?.minImpressionsRequired || 20)) {
          const categoryImpressionCount = {};
          const shopImpressionCount = {};

          recentImpressions.forEach((imp) => {
            if (imp.category) {
              categoryImpressionCount[imp.category] = (categoryImpressionCount[imp.category] || 0) + 1;
            }
            if (imp.shop) {
              const shopStr = imp.shop.toString();
              shopImpressionCount[shopStr] = (shopImpressionCount[shopStr] || 0) + 1;
            }
          });

          const smoothingK = EXP_NORM?.smoothingK || 5;

          Object.keys(categoryAffinity).forEach((cat) => {
            const count = categoryImpressionCount[cat] || 0;
            categoryAffinity[cat] = categoryAffinity[cat] / (count + smoothingK);
          });

          Object.keys(shopAffinity).forEach((shopKey) => {
            const count = shopImpressionCount[shopKey] || 0;
            shopAffinity[shopKey] = shopAffinity[shopKey] / (count + smoothingK);
          });
        }
      }
    }

    // 4. COMPOSITE SCORING (Affinity + Popularity + Recency + Taste Match Boost)
    const { affinity: AF, popularity: POP, recency: REC, finalScore: FS } = RECOMMENDATION_WEIGHTS;

    let hasPreferenceSeed = false;
    if (!hasSufficientHistory && preferredCuisines.length > 0) {
      preferredCuisines.forEach((cat) => {
        if (cat) {
          categoryAffinity[cat] = (categoryAffinity[cat] || 0) + FS.coldStart.preferenceSeed;
        }
      });
      hasPreferenceSeed = true;
    }

    const now = Date.now();
    const scoredReels = filteredCandidates.map((reel) => {
      const category = reel.foodItem?.category;
      const shopIdStr = reel.shop?._id?.toString();

      const catScore = category ? (categoryAffinity[category] || 0) : 0;
      const shpScore = shopIdStr ? (shopAffinity[shopIdStr] || 0) : 0;
      const affinityScore = catScore * AF.categoryMultiplier + shpScore * AF.shopMultiplier;

      const likesCount = reel.likes?.length || 0;
      const viewsCount = reel.views || 0;
      const popularityScore = likesCount * POP.likesMultiplier + viewsCount * POP.viewsMultiplier;

      const hoursOld = (now - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60);
      const recencyBoost = Math.max(0, REC.baseBoost - hoursOld * REC.decayPerHour);

      let finalScore = 0;
      if (hasSufficientHistory) {
        finalScore =
          affinityScore * FS.personalised.affinityMultiplier +
          popularityScore * FS.personalised.popularityMultiplier +
          recencyBoost;
      } else if (hasPreferenceSeed) {
        finalScore =
          affinityScore * FS.personalised.affinityMultiplier +
          popularityScore * FS.personalised.popularityMultiplier +
          recencyBoost;
      } else {
        finalScore = popularityScore * FS.coldStart.popularityMultiplier + recencyBoost;
      }

      // Taste Profile Alignment Boost
      let tasteBoost = 0;
      let spiceMatch = false;
      let flavorMatchCount = 0;
      const itemSpice = reel.foodItem?.tasteProfile?.spiceLevel || "medium";
      const itemFlavors = reel.foodItem?.tasteProfile?.flavorTags || [];
      const itemName = reel.foodItem?.name || "";

      // Spice Match Scoring
      if (userSpiceLevel && (itemSpice === userSpiceLevel || (userSpiceLevel === "extra-spicy" && itemSpice === "spicy"))) {
        tasteBoost += 35;
        spiceMatch = true;
      } else if ((userSpiceLevel === "spicy" || userSpiceLevel === "extra-spicy") && /spicy|chili|schezwan|fiery|peri-peri|tikka|masala|hot/i.test(itemName)) {
        tasteBoost += 25;
        spiceMatch = true;
      } else if (userSpiceLevel === "mild" && /sweet|shake|ice cream|dessert|smoothie|cake|donut/i.test(itemName)) {
        tasteBoost += 25;
        spiceMatch = true;
      }

      // Flavor Tags Overlap
      if (userFlavorTags.length > 0) {
        userFlavorTags.forEach((tag) => {
          if (itemFlavors.includes(tag)) {
            tasteBoost += 18;
            flavorMatchCount++;
          } else if (tag === "Cheesy" && /cheese|cheesy|mozzarella|parmesan|paneer/i.test(itemName)) {
            tasteBoost += 15;
            flavorMatchCount++;
          } else if (tag === "Crispy" && /crispy|crunchy|fried|roast/i.test(itemName)) {
            tasteBoost += 15;
            flavorMatchCount++;
          } else if (tag === "Tangy" && /tangy|lemon|chaat|chatpata|sour/i.test(itemName)) {
            tasteBoost += 15;
            flavorMatchCount++;
          } else if (tag === "Creamy" && /creamy|makhani|malai|butter/i.test(itemName)) {
            tasteBoost += 15;
            flavorMatchCount++;
          } else if (tag === "Smoky" && /smoky|bbq|barbecue|tandoor|grilled/i.test(itemName)) {
            tasteBoost += 15;
            flavorMatchCount++;
          } else if (tag === "Sweet" && /sweet|chocolate|honey|caramel|dessert/i.test(itemName)) {
            tasteBoost += 15;
            flavorMatchCount++;
          }
        });
      }

      // Preferred Cuisine match
      let cuisineMatch = false;
      if (preferredCuisines.includes(category)) {
        tasteBoost += 25;
        cuisineMatch = true;
      }

      finalScore += tasteBoost;

      // Session skip penalty
      if (category && penalizedCategorySet.has(category)) {
        finalScore -= FS.skipPenalty;
      }

      // Dynamic Taste Match Percentage Calculation
      let matchPercent = 65;
      if (reel.foodItem?.foodType === "veg" && userDietType !== "all") matchPercent += 10;
      if (spiceMatch) matchPercent += 14;
      if (flavorMatchCount > 0) matchPercent += Math.min(12, flavorMatchCount * 6);
      if (cuisineMatch) matchPercent += 9;
      matchPercent = Math.min(99, Math.max(70, matchPercent));

      const tasteMatchBadges = [];
      if (spiceMatch) {
        tasteMatchBadges.push(userSpiceLevel === "extra-spicy" ? "🔥 Fiery Heat" : "🌶️ Matches Spice");
      }
      if (flavorMatchCount > 0) {
        if (userFlavorTags.includes("Cheesy") && /cheese/i.test(itemName)) tasteMatchBadges.push("🧀 Cheesy");
        else if (userFlavorTags.includes("Crispy") && /crisp/i.test(itemName)) tasteMatchBadges.push("🍗 Crispy");
        else tasteMatchBadges.push("✨ Palate Match");
      } else if (cuisineMatch) {
        tasteMatchBadges.push(`🍜 ${category}`);
      }
      if (userDietType === "veg" || userDietType === "jain") {
        tasteMatchBadges.push("🌱 Pure Veg");
      }

      const reelObj = reel.toObject ? reel.toObject() : { ...reel };
      reelObj.tasteMatchPercent = matchPercent;
      reelObj.tasteMatchBadges = tasteMatchBadges;

      return { reel: reelObj, finalScore, category, tasteMatchPercent: matchPercent };
    });

    // If user clicked 'My Taste Match' tab, filter to high match scores
    let finalScoredList = scoredReels;
    if (tasteFilter === "my_taste") {
      const highMatches = scoredReels.filter((s) => s.tasteMatchPercent >= 80);
      if (highMatches.length > 0) {
        finalScoredList = highMatches;
      }
    }

    // Sort candidate reels by final score descending
    finalScoredList.sort((a, b) => b.finalScore - a.finalScore);

    // 5. EXPLORATION INJECTION (~15–20% slots reserved for exploration)
    //    Softmax-weighted rotation across the user's top-N affinity categories,
    //    so the feed diversifies rather than being pinned to a single category.
    let orderedReels = finalScoredList.map((item) => item.reel);

    const { exploration: EXP } = RECOMMENDATION_WEIGHTS;

    if ((hasSufficientHistory || hasPreferenceSeed) && finalScoredList.length > 3) {
      // Gather top-N categories by accumulated (decayed) affinity score
      const sortedCategories = Object.keys(categoryAffinity)
        .filter((cat) => categoryAffinity[cat] > 0)
        .sort((a, b) => categoryAffinity[b] - categoryAffinity[a]);

      const topCats = sortedCategories.slice(0, EXP.topCategoriesCount);

      if (topCats.length > 0) {
        // Numerically stable Softmax: subtract maximum affinity to avoid Math.exp(v) overflow to Infinity / NaN
        const topAffinityValues = topCats.map((cat) => Number(categoryAffinity[cat]) || 0);
        const maxAffinity = Math.max(...topAffinityValues);
        const expValues = topAffinityValues.map((v) => Math.exp(v - maxAffinity));
        const expSum = expValues.reduce((s, v) => s + v, 0);
        const softmaxWeights = expSum > 0 ? expValues.map((v) => v / expSum) : topCats.map(() => 1 / topCats.length);

        // Build cumulative distribution for weighted random sampling
        const cdf = [];
        softmaxWeights.reduce((acc, w, i) => {
          cdf[i] = acc + w;
          return cdf[i];
        }, 0);

        // Helper: pick a category index from the softmax distribution
        const sampleCategoryIndex = () => {
          const r = Math.random();
          for (let i = 0; i < cdf.length; i++) {
            if (r <= cdf[i]) return i;
          }
          return cdf.length - 1;
        };

        // Separate reels into buckets: one per top-category + one for exploration
        const catBuckets = {};
        topCats.forEach((cat) => { catBuckets[cat] = []; });
        const explorationItems = [];

        scoredReels.forEach((item) => {
          if (item.category && catBuckets[item.category]) {
            catBuckets[item.category].push(item.reel);
          } else {
            explorationItems.push(item.reel);
          }
        });

        // Pointers into each category bucket
        const catPointers = {};
        topCats.forEach((cat) => { catPointers[cat] = 0; });
        let expIdx = 0;

        const combined = [];
        for (let i = 0; i < scoredReels.length; i++) {
          if ((i + 1) % EXP.slotInterval === 0 && expIdx < explorationItems.length) {
            // Exploration slot: insert a reel outside the top-N categories
            combined.push(explorationItems[expIdx++]);
          } else {
            // Exploit slot: pick from a softmax-sampled top category
            // Try up to topCats.length times to find a non-empty bucket
            let pushed = false;
            for (let attempt = 0; attempt < topCats.length; attempt++) {
              const catIdx = sampleCategoryIndex();
              const cat = topCats[catIdx];
              if (catPointers[cat] < catBuckets[cat].length) {
                combined.push(catBuckets[cat][catPointers[cat]++]);
                pushed = true;
                break;
              }
            }
            // Fallback if all top-category buckets are exhausted
            if (!pushed && expIdx < explorationItems.length) {
              combined.push(explorationItems[expIdx++]);
            }
          }
        }

        if (combined.length > 0) {
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
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const skip = page && limit ? (page - 1) * limit : 0;

    let query = Reel.find({ owner: ownerId })
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType tasteProfile")
      .sort({ createdAt: -1 })
      .lean();

    if (page && limit) {
      const [reels, total] = await Promise.all([
        query.skip(skip).limit(limit),
        Reel.countDocuments({ owner: ownerId })
      ]);
      return res.status(200).json({ data: reels, page, totalPages: Math.ceil(total / limit), total });
    }

    const reels = await query;
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

    // Phase 4.4: Purge video asset from Cloudinary to prevent orphaned media
    if (reel.videoUrl) {
      await deleteVideoFromCloudinary(reel.videoUrl);
    }

    await Reel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Reel deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete reel", error: error.message });
  }
};

export const recordImpressions = async (req, res) => {
  try {
    const userId = req.userId;
    const { reelIds } = req.body;

    if (!Array.isArray(reelIds) || reelIds.length === 0) {
      return res.status(200).json({ message: "No reel IDs provided", count: 0 });
    }

    // Cap array at 50 per call
    const cappedIds = reelIds.slice(0, 50);

    const reels = await Reel.find({ _id: { $in: cappedIds } })
      .populate("foodItem", "category")
      .select("_id foodItem shop");

    if (!reels || reels.length === 0) {
      return res.status(200).json({ message: "No matching reels found", count: 0 });
    }

    const reelMap = new Map();
    reels.forEach((r) => reelMap.set(r._id.toString(), r));

    const impressionsToInsert = [];
    const now = new Date();

    cappedIds.forEach((id) => {
      const reel = reelMap.get(id?.toString());
      if (reel) {
        impressionsToInsert.push({
          user: userId,
          reel: reel._id,
          category: reel.foodItem?.category || undefined,
          shop: reel.shop || undefined,
          shownAt: now,
        });
      }
    });

    if (impressionsToInsert.length > 0) {
      await Impression.insertMany(impressionsToInsert, { ordered: false });
    }

    return res.status(201).json({
      message: "Impressions recorded successfully",
      count: impressionsToInsert.length,
    });
  } catch (error) {
    console.error("Record impressions error:", error);
    return res.status(500).json({ message: "Failed to record impressions", error: error.message });
  }
};

export const getLikedReels = async (req, res) => {
  try {
    const userId = req.userId;
    const reels = await Reel.find({ likes: userId })
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType tasteProfile rating shop")
      .sort({ updatedAt: -1 });

    return res.status(200).json(reels || []);
  } catch (error) {
    console.error("Get liked reels error:", error);
    return res.status(500).json({ message: "Failed to fetch liked reels", error: error.message });
  }
};
