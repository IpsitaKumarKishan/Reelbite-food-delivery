import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["restaurant", "delivery"],
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    orderIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "paid",
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Payout = mongoose.model("Payout", payoutSchema);
export default Payout;
