import Reel from "../models/reel.model.js";
import Shop from "../models/shop.model.js";
import { uploadVideoOnCloudinary } from "../utils/cloudinary.js";
import fs from "fs";

export const createReel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Video file is required" });
    }

    const videoUrl = await uploadVideoOnCloudinary(req.file.path);
    if (!videoUrl) {
      return res.status(500).json({ message: "Failed to process video file" });
    }

    const { caption, foodItem } = req.body;
    const ownerId = req.userId;

    // Find owner shop
    const shop = await Shop.findOne({ owner: ownerId });

    const newReel = new Reel({
      videoUrl,
      caption: caption || "",
      foodItem: foodItem || null,
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
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
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
      .populate("foodItem", "name price image category foodType rating")
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
