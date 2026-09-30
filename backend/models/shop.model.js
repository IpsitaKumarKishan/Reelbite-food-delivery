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
    },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    }

},{timestamps:true})

shopSchema.index({ location: '2dsphere' })
shopSchema.index({ owner: 1 })
shopSchema.index({ city: 1, status: 1 })

const Shop=mongoose.model("Shop",shopSchema)
export default Shop