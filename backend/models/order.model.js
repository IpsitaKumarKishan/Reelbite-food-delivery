import mongoose from "mongoose";

const shopOrderItemSchema = new mongoose.Schema({
    item:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required:true
    },
    name:String,
    price:Number,
    quantity:Number
}, { timestamps: true })

const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    subtotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status: {
        type: String,
        enum: ["pending", "preparing", "out of delivery", "delivered", "cancelled"],
        default: "pending"
    },
  assignment:{
     type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryAssignment",
    default:null
  },
  assignedDeliveryBoy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
deliveryOtp:{
        type:String,
        default:null
    },
otpExpires:{
        type:Date,
        default:null
    },
deliveredAt:{
    type:Date,
    default:null
},
commissionRate: { type: Number, default: 20 },
commissionAmount: { type: Number, default: 0 },
restaurantPayout: { type: Number, default: 0 },
settlementStatus: { type: String, enum: ["unsettled", "settled"], default: "unsettled" }

}, { timestamps: true })

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    paymentMethod: {
        type: String,
        enum: ['cod', "online"],
        required: true
    },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    contactMobile: {
        type: String,
        default: ""
    },
    totalAmount: {
        type: Number
    },
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    restaurantPayout: { type: Number, default: 0 },
    deliveryPartnerPayout: { type: Number, default: 0 },
    platformRevenue: { type: Number, default: 0 },
    settlementStatus: { type: String, enum: ["unsettled", "settled"], default: "unsettled" },
    shopOrders: [shopOrderSchema],
    coupon: {
        code: { type: String, default: null },
        discountAmount: { type: Number, default: 0 }
    },
    cancellation: {
        isCancelled: { type: Boolean, default: false },
        cancelledBy: { type: String, enum: ["customer", "owner", "admin"], default: null },
        reason: { type: String, default: null },
        cancelledAt: { type: Date, default: null }
    },
    refund: {
        refundId: { type: String, default: null },
        amount: { type: Number, default: 0 },
        status: { type: String, enum: ["none", "initiated", "processed", "failed"], default: "none" },
        notes: { type: String, default: null }
    },
    payment:{
        type:Boolean,
        default:false
    },
    razorpayOrderId:{
        type:String,
        default:""
    },
   razorpayPaymentId:{
    type:String,
       default:""
   }
}, { timestamps: true })

const Order=mongoose.model("Order",orderSchema)
export default Order