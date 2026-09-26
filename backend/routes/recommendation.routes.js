import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getFeedRecommendations, getCartCrossSells } from "../controllers/recommendation.controllers.js";

const recommendationRouter = express.Router();

recommendationRouter.get("/feed", isAuth, getFeedRecommendations);
recommendationRouter.get("/cart-cross-sells", isAuth, getCartCrossSells);

export default recommendationRouter;
