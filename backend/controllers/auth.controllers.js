import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import genToken from "../utils/token.js"
import { sendOtpMail } from "../utils/mail.js"

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

export const signUp=async (req,res) => {
    try {
        const {fullName,email,password,mobile,role}=req.body
        const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : ""
        if (!cleanMobile || cleanMobile.length < 10 || cleanMobile === "0000000000") {
            return res.status(400).json({ message: "A valid 10-digit mobile number is required." })
        }
        let user=await User.findOne({email})
        if(user){
            return res.status(400).json({message:"User Already exist."})
        }
        if(password.length<6){
            return res.status(400).json({message:"password must be at least 6 characters."})
        }
     
        const hashedPassword=await bcrypt.hash(password,10)
        user=await User.create({
            fullName,
            email,
            role,
            mobile: cleanMobile,
            password:hashedPassword
        })

        const token=await genToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)
  
        return res.status(201).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json(`sign up error ${error}`)
    }
}

export const signIn=async (req,res) => {
    try {
        const {email,password}=req.body
        if (!email) {
            return res.status(400).json({ message: "Email or mobile number is required." })
        }

        const identifier = String(email).trim()
        const isNumericPhone = /^\d{10}$/.test(identifier.replace(/[\s+-]/g, ''))
        const query = isNumericPhone
            ? { mobile: identifier.replace(/\D/g, '') }
            : { email: identifier.toLowerCase() }

        const user=await User.findOne(query)
        if(!user){
            return res.status(400).json({message:"User does not exist."})
        }

        if (user.status === "suspended") {
            return res.status(403).json({ message: "Your account has been suspended by the platform administrator." });
        }
        
     const isMatch=await bcrypt.compare(password,user.password)
     if(!isMatch){
         return res.status(400).json({message:"incorrect Password"})
     }

        const token=await genToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)
  
        return res.status(200).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json(`sign In error ${error}`)
    }
}

export const signOut=async (req,res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        })
        return res.status(200).json({message:"log out successfully"})
    } catch (error) {
        return res.status(500).json(`sign out error ${error}`)
    }
}

export const sendOtp=async (req,res) => {
  try {
    const {email}=req.body
    const user=await User.findOne({email})
    if(!user){
       return res.status(400).json({message:"User does not exist."})
    }
    const otp=Math.floor(1000 + Math.random() * 9000).toString()
    user.resetOtp=otp
    user.otpExpires=Date.now()+5*60*1000
    user.isOtpVerified=false
    await user.save()
    await sendOtpMail(email,otp)
    return res.status(200).json({message:"otp sent successfully"})
  } catch (error) {
     return res.status(500).json(`send otp error ${error}`)
  }  
}

export const verifyOtp=async (req,res) => {
    try {
        const {email,otp}=req.body
        const user=await User.findOne({email})
        if(!user || user.resetOtp!=otp || user.otpExpires<Date.now()){
            return res.status(400).json({message:"invalid/expired otp"})
        }
        user.isOtpVerified=true
        user.resetOtp=undefined
        user.otpExpires=undefined
        await user.save()
        return res.status(200).json({message:"otp verify successfully"})
    } catch (error) {
         return res.status(500).json(`verify otp error ${error}`)
    }
}

export const resetPassword=async (req,res) => {
    try {
        const {email,newPassword}=req.body
        const user=await User.findOne({email})
    if(!user || !user.isOtpVerified){
       return res.status(400).json({message:"otp verification required"})
    }
    const hashedPassword=await bcrypt.hash(newPassword,10)
    user.password=hashedPassword
    user.isOtpVerified=false
    await user.save()
     return res.status(200).json({message:"password reset successfully"})
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

        const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : ''
        const hasValidMobileInput = cleanMobile.length >= 10 && cleanMobile !== "0000000000"

        // If user already exists and already has a valid phone number, log them in immediately
        if (user && user.mobile && user.mobile.length >= 10 && user.mobile !== "0000000000") {
            const token = await genToken(user._id)
            res.cookie("token", token, COOKIE_OPTIONS)
            return res.status(200).json(sanitizeUser(user))
        }

        // If new user or existing user missing phone number, and no valid phone number was supplied:
        if (!hasValidMobileInput) {
            return res.status(200).json({
                needsMobile: true,
                email: email.toLowerCase(),
                fullName: user?.fullName || fullName || (email ? email.split("@")[0] : "User"),
                role: user?.role || role || "user",
                message: "Please provide a valid 10-digit phone number to complete login."
            })
        }

        if (!user) {
            user = await User.create({
                fullName: fullName || (email ? email.split("@")[0] : "User"),
                email: email.toLowerCase(),
                mobile: cleanMobile,
                role: role || "user"
            })
        } else {
            user.mobile = cleanMobile
            await user.save()
        }

        const token = await genToken(user._id)
        res.cookie("token", token, COOKIE_OPTIONS)

        return res.status(200).json(sanitizeUser(user))

    } catch (error) {
        return res.status(500).json(`googleAuth error ${error}`)
    }
}