import mongoose from "mongoose";

const impressionSchema = new mongoose.Schema(
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
    category: {
      type: String,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
    },
    shownAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

impressionSchema.index({ user: 1, shownAt: -1 });

const Impression = mongoose.model("Impression", impressionSchema);
export default Impression;
