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

// Protected routes (support uploading video + optional dish image)
reelRouter.post(
  "/",
  isAuth,
  isOwner,
  uploadVideo.fields([
    { name: "video", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  createReel
);
reelRouter.patch("/:id/like", isAuth, toggleLikeReel);
reelRouter.delete("/:id", isAuth, isOwner, deleteReel);

export default reelRouter;
