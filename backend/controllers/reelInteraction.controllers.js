import ReelInteraction from "../models/reelInteraction.model.js";
import Reel from "../models/reel.model.js";

export const logReelInteraction = async (req, res) => {
  try {
    const { id: reelId } = req.params;
    const userId = req.userId;
    const {
      watchDurationMs = 0,
      watchPercentage = 0,
      liked = false,
      shared = false,
      addedToCart = false,
      skipped = false
    } = req.body;

    if (!reelId) {
      return res.status(400).json({ message: "Reel ID is required" });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // Increment reel views if watchPercentage >= 20%
    if (watchPercentage >= 20) {
      await Reel.findByIdAndUpdate(reelId, { $inc: { views: 1 } });
    }

    const isSkipped = skipped || (watchPercentage < 15 && !liked && !addedToCart && !shared);

    const interaction = new ReelInteraction({
      user: userId,
      reel: reelId,
      watchDurationMs: Number(watchDurationMs) || 0,
      watchPercentage: Number(watchPercentage) || 0,
      liked: Boolean(liked),
      shared: Boolean(shared),
      addedToCart: Boolean(addedToCart),
      skipped: Boolean(isSkipped)
    });

    await interaction.save();

    return res.status(201).json({ message: "Interaction logged successfully", interaction });
  } catch (error) {
    console.error("Log reel interaction error:", error);
    return res.status(500).json({ message: "Failed to log interaction", error: error.message });
  }
};
