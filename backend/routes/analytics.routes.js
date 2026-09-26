import express from "express";
import { getOwnerAnalytics } from "../controllers/analytics.controllers.js";
import isAuth from "../middlewares/isAuth.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/owner", isAuth, getOwnerAnalytics);

export default analyticsRouter;
