import mongoose from "mongoose";

const shopSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    city:{
         type:String,
        required:true
    },
    state:{
         type:String,
        required:true
    },
    address:{
        type:String,
        required:true
    },
    items:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Item"
    }],
    commissionRate:{
        type:Number,
        default:20
    },
    rating: {
        average: { type: Number, default: 4.2 },
        count: { type: Number, default: 0 }
    },
    isApproved: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ["active", "pending", "suspended"],
        default: "active"
    }

},{timestamps:true})

const Shop=mongoose.model("Shop",shopSchema)
export default Shop