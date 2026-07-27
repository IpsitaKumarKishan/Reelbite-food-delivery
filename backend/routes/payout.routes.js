import express from "express";
import { getOwnerEarnings, settleOwnerOrders } from "../controllers/payout.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const payoutRouter = express.Router();

payoutRouter.get("/owner", isAuth, getOwnerEarnings);
payoutRouter.post("/settle", isAuth, settleOwnerOrders);

export default payoutRouter;
