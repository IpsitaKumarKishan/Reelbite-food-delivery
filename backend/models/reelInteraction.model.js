import mongoose from "mongoose";

const reelInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: true,
    },
    watchDurationMs: {
      type: Number,
      default: 0,
    },
    watchPercentage: {
      type: Number,
      default: 0,
    },
    liked: {
      type: Boolean,
      default: false,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    addedToCart: {
      type: Boolean,
      default: false,
    },
    skipped: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

reelInteractionSchema.index({ user: 1, createdAt: -1 });
reelInteractionSchema.index({ reel: 1, createdAt: -1 });

const ReelInteraction = mongoose.model("ReelInteraction", reelInteractionSchema);
export default ReelInteraction;
