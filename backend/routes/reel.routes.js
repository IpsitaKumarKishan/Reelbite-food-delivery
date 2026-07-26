import express from "express";
import isAuth from "../middlewares/isAuth.js";
import isOwner from "../middlewares/isOwner.js";
import { uploadVideo } from "../middlewares/videoMulter.js";
import {
  createReel,
  getAllReels,
  getOwnerReels,
  toggleLikeReel,
  deleteReel,
} from "../controllers/reel.controllers.js";

const reelRouter = express.Router();

// Public / Authenticated read routes
reelRouter.get("/", getAllReels);
reelRouter.get("/owner/:ownerId", getOwnerReels);

// Protected routes
reelRouter.post("/", isAuth, isOwner, uploadVideo.single("video"), createReel);
reelRouter.patch("/:id/like", isAuth, toggleLikeReel);
reelRouter.delete("/:id", isAuth, isOwner, deleteReel);

export default reelRouter;
