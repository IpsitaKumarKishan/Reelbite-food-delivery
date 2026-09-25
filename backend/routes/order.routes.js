import express from "express"
import { body } from "express-validator"
import validate from "../middlewares/validate.js"
import isAuth from "../middlewares/isAuth.js"
import { acceptOrder, getCurrentOrder, getDeliveryBoyAssignment, getMyOrders, getOrderById, getTodayDeliveries, placeOrder, sendDeliveryOtp, updateOrderStatus, verifyDeliveryOtp, verifyPayment } from "../controllers/order.controllers.js"

const orderRouter=express.Router()

orderRouter.post(
  "/place-order",
  isAuth,
  body("cartItems").isArray({ min: 1 }).withMessage("Cart cannot be empty"),
  body("paymentMethod").isIn(["cod", "online"]).withMessage("Invalid payment method"),
  body("deliveryAddress").isObject().withMessage("Delivery address is required"),
  validate,
  placeOrder
)

orderRouter.post(
  "/verify-payment",
  isAuth,
  body("razorpay_payment_id").notEmpty().withMessage("Payment ID is required"),
  body("orderId").notEmpty().withMessage("Order ID is required"),
  validate,
  verifyPayment
)

orderRouter.get("/my-orders",isAuth,getMyOrders)
orderRouter.get("/get-assignments",isAuth,getDeliveryBoyAssignment)
orderRouter.get("/get-current-order",isAuth,getCurrentOrder)

orderRouter.post(
  "/send-delivery-otp",
  isAuth,
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("shopOrderId").notEmpty().withMessage("Shop Order ID is required"),
  validate,
  sendDeliveryOtp
)

orderRouter.post(
  "/verify-delivery-otp",
  isAuth,
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("shopOrderId").notEmpty().withMessage("Shop Order ID is required"),
  body("otp").trim().isLength({ min: 4, max: 4 }).withMessage("OTP must be 4 digits"),
  validate,
  verifyDeliveryOtp
)
orderRouter.post("/update-status/:orderId/:shopId",isAuth,updateOrderStatus)
orderRouter.get('/accept-order/:assignmentId',isAuth,acceptOrder)
orderRouter.get('/get-order-by-id/:orderId',isAuth,getOrderById)
orderRouter.get('/get-today-deliveries',isAuth,getTodayDeliveries)

export default orderRouter