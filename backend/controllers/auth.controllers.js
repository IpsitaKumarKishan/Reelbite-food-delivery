import crypto from "crypto";
import User from "../models/user.model.js"
import PhoneOtp from "../models/phoneOtp.model.js"
import bcrypt from "bcryptjs"
import genToken from "../utils/token.js"
import { sendOtpMail } from "../utils/mail.js"
import { validatePhoneNumber } from "../utils/phoneValidator.js"
import { sendPhoneOtpSms, verifyTwilioOtp } from "../utils/smsService.js"

const COOKIE_OPTIONS = {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true
};

const sanitizeUser = (user) => {
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete userObj.password;
    delete userObj.resetOtp;
    delete userObj.otpExpires;
    return userObj;
};

const ALLOWED_PUBLIC_ROLES = ["user", "owner", "deliveryBoy"];

/**
 * POST /api/auth/send-phone-otp
 * Generates and sends a 6-digit OTP to verify a mobile phone number for new signups.
 */
export const sendPhoneOtp = async (req, res) => {
    try {
        const { mobile } = req.body;
        const phoneValidation = validatePhoneNumber(mobile);
        if (!phoneValidation.isValid) {
            return res.status(400).json({ message: phoneValidation.message });
        }
        const cleanMobile = phoneValidation.normalizedMobile;

        // Ensure phone number isn't already registered
        const existingUser = await User.findOne({ mobile: cleanMobile });
        if (existingUser) {
            return res.status(400).json({ message: "Mobile number is already registered with another account." });
        }

        // Rate limit: 60s cooldown between OTP requests
        const recentOtp = await PhoneOtp.findOne({
            mobile: cleanMobile,
            createdAt: { $gt: new Date(Date.now() - 60 * 1000) }
        });
        if (recentOtp) {
            const secondsLeft = Math.ceil((recentOtp.createdAt.getTime() + 60000 - Date.now()) / 1000);
            return res.status(429).json({ message: `Please wait ${secondsLeft > 0 ? secondsLeft : 60} seconds before requesting a new OTP.` });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        // Invalidate previous unverified OTPs for this phone number
        await PhoneOtp.deleteMany({ mobile: cleanMobile, verified: false });

        const smsResult = await sendPhoneOtpSms(cleanMobile, otp);
        if (!smsResult?.success) {
            return res.status(502).json({ message: smsResult?.error || "Failed to dispatch verification code. Please try again later." });
        }

        await PhoneOtp.create({
            mobile: cleanMobile,
            otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes validity
            verified: false,
            attempts: 0,
            provider: smsResult?.provider || "local"
        });

        const isDev = process.env.NODE_ENV !== "production";
        return res.status(200).json({
            message: `OTP sent successfully to +91 ${cleanMobile}`,
            mobile: cleanMobile,
            devOtp: isDev ? otp : undefined
        });
    } catch (error) {
        return res.status(500).json({ message: `sendPhoneOtp error: ${error.message || error}` });
    }
};

/**
 * POST /api/auth/verify-phone-otp
 * Verifies the 6-digit OTP for a given mobile number.
 */
export const verifyPhoneOtp = async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        const phoneValidation = validatePhoneNumber(mobile);
        if (!phoneValidation.isValid) {
            return res.status(400).json({ message: phoneValidation.message });
        }
        const cleanMobile = phoneValidation.normalizedMobile;

        if (!otp || String(otp).trim().length !== 6) {
            return res.status(400).json({ message: "A valid 6-digit OTP is required." });
        }

        const phoneOtp = await PhoneOtp.findOne({
            mobile: cleanMobile,
            verified: false
        }).sort({ createdAt: -1 });

        if (!phoneOtp || phoneOtp.expiresAt < new Date()) {
            return res.status(400).json({ message: "OTP has expired or does not exist. Please request a new OTP." });
        }

        if (phoneOtp.attempts >= 5) {
            await PhoneOtp.deleteOne({ _id: phoneOtp._id });
            return res.status(400).json({ message: "Too many failed attempts. Please request a new OTP." });
        }

        let isVerified = false;

        // Check with Twilio Verify if provider was twilio_verify
        if (phoneOtp.provider === "twilio_verify") {
            const twilioRes = await verifyTwilioOtp(cleanMobile, otp);
            if (twilioRes.approved) {
                isVerified = true;
            }
        }

        // Verify against generated OTP record
        if (!isVerified && phoneOtp.otp === String(otp).trim()) {
            isVerified = true;
        }

        if (!isVerified) {
            phoneOtp.attempts += 1;
            await phoneOtp.save();
            return res.status(400).json({ message: `Incorrect OTP. ${5 - phoneOtp.attempts} attempts remaining.` });
        }

        phoneOtp.verified = true;
        await phoneOtp.save();

        return res.status(200).json({
            message: "Mobile phone verified successfully.",
            mobile: cleanMobile,
            verified: true
        });
    } catch (error) {
        return res.status(500).json({ message: `verifyPhoneOtp error: ${error.message || error}` });
    }
};

export const signUp = async (req, res) => {
    try {
        const { fullName, email, password, mobile, role } = req.body

        // Validation Layer: Phone Number Integrity
        const phoneValidation = validatePhoneNumber(mobile)
        if (!phoneValidation.isValid) {
            return res.status(400).json({ message: phoneValidation.message })
        }
        const cleanMobile = phoneValidation.normalizedMobile

        // Validation Layer: Ensure phone was verified via OTP
        const verifiedOtp = await PhoneOtp.findOne({ mobile: cleanMobile, verified: true });
        if (!verifiedOtp && process.env.BYPASS_PHONE_OTP !== "true") {
            return res.status(400).json({ message: "Please verify your mobile number with OTP before completing registration." });
        }

        // Prevent multiple accounts from sharing the same phone number
        const existingMobileUser = await User.findOne({ mobile: cleanMobile })
        if (existingMobileUser) {
            return res.status(400).json({ message: "Mobile number is already registered with another account." })
        }

        // Email is optional during signup (users can add from profile)
        let cleanEmail = null
        if (email && typeof email === "string" && email.trim()) {
            cleanEmail = email.trim().toLowerCase()
            const existingEmailUser = await User.findOne({ email: cleanEmail })
            if (existingEmailUser) {
                return res.status(400).json({ message: "User already exists with this email address." })
            }
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." })
        }

        // Security: Whitelist allowed registration roles. Administrative roles can never be self-assigned.
        const assignedRole = ALLOWED_PUBLIC_ROLES.includes(role) ? role : "user";

        const hashedPassword = await bcrypt.hash(password, 10)
        const userPayload = {
            fullName: fullName.trim(),
            role: assignedRole,
            mobile: cleanMobile,
            password: hashedPassword
        }
        if (cleanEmail) {
            userPayload.email = cleanEmail
        }

        const user = await User.create(userPayload)

        // Clean up OTP record once successfully registered
        await PhoneOtp.deleteMany({ mobile: cleanMobile });

        const token = await genToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(201).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json({ message: `sign up error ${error.message || error}` })
    }
}

export const signIn = async (req, res) => {
    try {
        const { email, mobile, password } = req.body
        const rawIdentifier = mobile || email || req.body.identifier
        if (!rawIdentifier) {
            return res.status(400).json({ message: "Mobile number is required to sign in." })
        }

        const identifier = String(rawIdentifier).trim()
        const phoneValidation = validatePhoneNumber(identifier)
        let query = null

        if (phoneValidation.isValid) {
            query = { mobile: phoneValidation.normalizedMobile }
        } else if (identifier.includes("@")) {
            query = { email: identifier.toLowerCase() }
        } else {
            const digitsOnly = identifier.replace(/\D/g, '')
            if (digitsOnly.length === 10) {
                query = { mobile: digitsOnly }
            } else {
                return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." })
            }
        }

        const user = await User.findOne(query)
        if (!user) {
            return res.status(400).json({ message: "User not found with this mobile number." })
        }

        if (user.status === "suspended") {
            return res.status(403).json({ message: "Your account has been suspended by the platform administrator." });
        }

        if (!user.password) {
            return res.status(400).json({ message: "Account does not have a password set. Please log in using Google or reset password." })
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password." })
        }

        const token = await genToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(200).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json(`sign In error ${error}`)
    }
}

export const signOut = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        })
        return res.status(200).json({ message: "log out successfully" })
    } catch (error) {
        return res.status(500).json(`sign out error ${error}`)
    }
}

export const sendOtp = async (req, res) => {
    try {
        const { email, mobile } = req.body
        const rawTarget = mobile || email
        if (!rawTarget) {
            return res.status(400).json({ message: "Mobile number or email is required." })
        }

        const clean = String(rawTarget).trim()
        const isEmail = clean.includes("@")
        const query = isEmail ? { email: clean.toLowerCase() } : { mobile: clean.replace(/\D/g, '') }

        const user = await User.findOne(query)
        if (!user) {
            return res.status(400).json({ message: "User does not exist." })
        }

        const otp = crypto.randomInt(1000, 10000).toString();
        user.resetOtp = otp
        user.otpExpires = Date.now() + 5 * 60 * 1000
        user.isOtpVerified = false
        await user.save()

        if (user.email && isEmail) {
            await sendOtpMail(user.email, otp)
        } else if (user.mobile) {
            const smsResult = await sendPhoneOtpSms(user.mobile, otp)
            if (!smsResult?.success) {
                return res.status(502).json({ message: smsResult?.error || "Failed to dispatch verification code via SMS." });
            }
        }

        const isDev = process.env.NODE_ENV !== "production";
        return res.status(200).json({
            message: "OTP sent successfully.",
            devOtp: isDev ? otp : undefined
        });
    } catch (error) {
        return res.status(500).json(`send otp error ${error}`)
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { email, mobile, otp } = req.body
        const rawTarget = mobile || email
        const clean = String(rawTarget || '').trim()
        const isEmail = clean.includes("@")
        const query = isEmail ? { email: clean.toLowerCase() } : { mobile: clean.replace(/\D/g, '') }

        const user = await User.findOne(query)
        if (!user || user.resetOtp != otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP." })
        }
        user.isOtpVerified = true
        user.resetOtp = undefined
        user.otpExpires = undefined
        await user.save()
        return res.status(200).json({ message: "OTP verified successfully." })
    } catch (error) {
        return res.status(500).json(`verify otp error ${error}`)
    }
}

export const resetPassword = async (req, res) => {
    try {
        const { email, mobile, newPassword } = req.body
        const rawTarget = mobile || email
        const clean = String(rawTarget || '').trim()
        const isEmail = clean.includes("@")
        const query = isEmail ? { email: clean.toLowerCase() } : { mobile: clean.replace(/\D/g, '') }

        const user = await User.findOne(query)
        if (!user || !user.isOtpVerified) {
            return res.status(400).json({ message: "OTP verification required." })
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        user.isOtpVerified = false
        await user.save()
        return res.status(200).json({ message: "Password reset successfully." })
    } catch (error) {
        return res.status(500).json(`reset password error ${error}`)
    }
}

export const googleAuth = async (req, res) => {
    try {
        const { fullName, email, mobile, role } = req.body
        if (!email) {
            return res.status(400).json({ message: "Email is required for Google Sign-In" })
        }

        let user = await User.findOne({ email: email.toLowerCase() })
        if (user && user.status === "suspended") {
            return res.status(403).json({ message: "Your account has been suspended by the platform administrator." });
        }

        // If user already exists and already has a valid phone number, log them in immediately
        if (user && user.mobile && validatePhoneNumber(user.mobile).isValid) {
            const token = await genToken(user._id)
            res.cookie("token", token, COOKIE_OPTIONS)
            return res.status(200).json(sanitizeUser(user))
        }

        const phoneValidation = validatePhoneNumber(mobile)
        const hasValidMobileInput = phoneValidation.isValid
        const cleanMobile = phoneValidation.normalizedMobile

        // If new user or existing user missing phone number, and no valid phone number was supplied:
        const assignedRole = ALLOWED_PUBLIC_ROLES.includes(role) ? role : (user?.role || "user");
        if (!hasValidMobileInput) {
            return res.status(200).json({
                needsMobile: true,
                email: email.toLowerCase(),
                fullName: user?.fullName || fullName || (email ? email.split("@")[0] : "User"),
                role: user?.role || assignedRole,
                message: phoneValidation.message || "Please provide a valid 10-digit phone number to complete login."
            })
        }

        // Prevent mobile number collision with another user account
        const existingMobileUser = await User.findOne({
            mobile: cleanMobile,
            _id: { $ne: user?._id }
        })
        if (existingMobileUser) {
            return res.status(400).json({ message: "Mobile number is already registered with another account." })
        }

        if (!user) {
            user = await User.create({
                fullName: fullName || (email ? email.split("@")[0] : "User"),
                email: email.toLowerCase(),
                mobile: cleanMobile,
                role: assignedRole
            })
        } else {
            user.mobile = cleanMobile
            await user.save()
        }

        const token = await genToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(200).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json({ message: `googleAuth error ${error.message || error}` })
    }
}