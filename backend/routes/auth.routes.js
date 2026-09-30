import express from "express"
import { body } from "express-validator"
import validate from "../middlewares/validate.js"
import { googleAuth, resetPassword, sendOtp, signIn, signOut, signUp, verifyOtp, sendPhoneOtp, verifyPhoneOtp } from "../controllers/auth.controllers.js"

import { validatePhoneNumber } from "../utils/phoneValidator.js"

const authRouter = express.Router()

authRouter.post(
  "/signup",
  body("email").trim().isEmail().withMessage("Please enter a valid email address"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile phone number is required")
    .custom((value) => {
      const result = validatePhoneNumber(value);
      if (!result.isValid) {
        throw new Error(result.message);
      }
      return true;
    }),
  body("role").isIn(["user", "owner", "deliveryBoy"]).withMessage("Invalid role specified"),
  validate,
  signUp
)

authRouter.post(
  "/send-phone-otp",
  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile phone number is required")
    .custom((value) => {
      const result = validatePhoneNumber(value);
      if (!result.isValid) {
        throw new Error(result.message);
      }
      return true;
    }),
  validate,
  sendPhoneOtp
)

authRouter.post(
  "/verify-phone-otp",
  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile phone number is required"),
  body("otp")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits"),
  validate,
  verifyPhoneOtp
)

authRouter.post(
  "/signin",
  body("email").trim().notEmpty().withMessage("Please enter your email or 10-digit mobile number"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
  signIn
)

authRouter.get("/signout", signOut)

authRouter.post(
  "/send-otp",
  body("email").trim().isEmail().withMessage("Please enter a valid email address"),
  validate,
  sendOtp
)

authRouter.post(
  "/verify-otp",
  body("email").trim().isEmail().withMessage("Please enter a valid email address"),
  body("otp").trim().isLength({ min: 4, max: 4 }).withMessage("OTP must be 4 digits"),
  validate,
  verifyOtp
)

authRouter.post(
  "/reset-password",
  body("email").trim().isEmail().withMessage("Please enter a valid email address"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
  validate,
  resetPassword
)

authRouter.post("/google-auth", googleAuth)

export default authRouter