import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getAvailableCoupons, applyCoupon } from "../controllers/coupon.controllers.js";

const couponRouter = express.Router();

couponRouter.get("/available", isAuth, getAvailableCoupons);
couponRouter.post("/apply", isAuth, applyCoupon);

export default couponRouter;
