import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { submitReview, getShopReviews, getOrderReviewStatus } from "../controllers/review.controllers.js";

const reviewRouter = express.Router();

reviewRouter.post("/submit", isAuth, submitReview);
reviewRouter.get("/shop/:shopId", getShopReviews);
reviewRouter.get("/order/:orderId", isAuth, getOrderReviewStatus);

export default reviewRouter;
