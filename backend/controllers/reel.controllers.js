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

    let targetFoodItemId = foodItem;

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
        shop: shop ? shop._id : null,
      });

      await newItem.save();
      targetFoodItemId = newItem._id;

      // Also append to shop's items array if shop exists
      if (shop && shop.items) {
        shop.items.push(newItem._id);
        await shop.save();
      }
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

export const getAllReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reels = await Reel.find()
      .populate("owner", "fullName email")
      .populate("shop", "name city image")
      .populate("foodItem", "name price image category foodType rating shop")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Reel.countDocuments();

    return res.status(200).json({
      reels,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
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
