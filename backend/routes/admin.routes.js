import express from "express";
import {
  getPlatformMetrics,
  getAllShops,
  updateShopStatus,
  getAllUsers,
  updateUserRole,
  getDisputesAndRefunds,
  settleShopPayout,
  getQuickBadges,
} from "../controllers/admin.controllers.js";
import isAuth from "../middlewares/isAuth.js";
import isAdmin from "../middlewares/isAdmin.js";

const adminRouter = express.Router();

// Apply isAuth and isAdmin to all admin routes
adminRouter.use(isAuth, isAdmin);

adminRouter.get("/quick-badges", getQuickBadges);
adminRouter.get("/metrics", getPlatformMetrics);
adminRouter.get("/shops", getAllShops);
adminRouter.patch("/shops/:shopId/status", updateShopStatus);
adminRouter.post("/shops/:shopId/settle", settleShopPayout);
adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:userId/role", updateUserRole);
adminRouter.get("/disputes", getDisputesAndRefunds);

export default adminRouter;
