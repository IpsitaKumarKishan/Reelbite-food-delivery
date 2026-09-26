import mongoose from "mongoose";

const itemReviewSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    default: "",
    trim: true,
  },
});

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    shopRating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    reviewText: {
      type: String,
      default: "",
      trim: true,
    },
    itemReviews: [itemReviewSchema],
    deliveryRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
    },
    photos: {
      type: [String],
      default: [],
    },
    helpfulVotes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One review per order-shop pair
reviewSchema.index({ user: 1, order: 1, shop: 1 }, { unique: true });
reviewSchema.index({ shop: 1, createdAt: -1 });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
