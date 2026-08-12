import mongoose from "mongoose";
import { type } from "os";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    password:{
        type: String,
    },
    mobile:{
        type: String,
        required: true, 
    },
    role:{
        type:String,
        enum:["user","owner","deliveryBoy"],
        required:true
    },
    resetOtp:{
        type:String
    },
    isOtpVerified:{
        type:Boolean,
        default:false
    },
    otpExpires:{
        type:Date
    },
    socketId:{
     type:String,
     
    },
    isOnline:{
        type:Boolean,
        default:false
    },
   location:{
type:{type:String,enum:['Point'],default:'Point'},
coordinates:{type:[Number],default:[0,0]}
   },
   cart: [
     {
       item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
       quantity: { type: Number, default: 1, min: 1 }
     }
   ],
   dietPreference: {
     type: String,
     enum: ["veg", "all"],
     default: "all"
   },
   // Cuisine categories the user explicitly selected during onboarding.
   // Empty array = user skipped onboarding; cold-start falls through to
   // pure popularity + recency (unchanged behavior).
   preferredCuisines: {
     type: [String],
     default: []
   }
  
}, { timestamps: true })

userSchema.index({location:'2dsphere'})


const User=mongoose.model("User",userSchema)
export default User