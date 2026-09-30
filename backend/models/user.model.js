import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        trim: true,
        lowercase: true
    },
    password:{
        type: String,
    },
    mobile:{
        type: String,
        required: true, 
        unique: true,
        trim: true
    },
    role:{
        type:String,
        enum:["user","owner","deliveryBoy","admin"],
        required:true
    },
    status:{
        type:String,
        enum:["active", "suspended"],
        default:"active"
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
   },
   addresses: [
     {
       label: { type: String, default: "Home" },
       street: { type: String, required: true },
       city: { type: String },
       state: { type: String },
       isDefault: { type: Boolean, default: false },
     }
   ]
  
}, { timestamps: true })

userSchema.index({ location: '2dsphere' })
userSchema.index({ role: 1, isOnline: 1 })

const User=mongoose.model("User",userSchema)
export default User