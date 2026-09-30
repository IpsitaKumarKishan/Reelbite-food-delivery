import mongoose from "mongoose";

const phoneOtpSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically purged by MongoDB after expiresAt
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    provider: {
      type: String,
      default: "local",
    },
  },
  { timestamps: true }
);

phoneOtpSchema.index({ mobile: 1, verified: 1 });

const PhoneOtp = mongoose.model("PhoneOtp", phoneOtpSchema);
export default PhoneOtp;
