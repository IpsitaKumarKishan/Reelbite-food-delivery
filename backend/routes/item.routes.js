import express from "express"
import { body } from "express-validator"
import validate from "../middlewares/validate.js"
import isAuth from "../middlewares/isAuth.js"
import { addItem, deleteItem, editItem, getItemByCity, getItemById, getItemsByShop, rating, searchItems } from "../controllers/item.controllers.js"
import { upload } from "../middlewares/multer.js"

const itemRouter=express.Router()

itemRouter.post("/add-item",isAuth,upload.single("image"),addItem)
itemRouter.post("/edit-item/:itemId",isAuth,upload.single("image"),editItem)
itemRouter.get("/get-by-id/:itemId",isAuth,getItemById)
itemRouter.get("/delete/:itemId",isAuth,deleteItem)
itemRouter.get("/get-by-city/:city",isAuth,getItemByCity)
itemRouter.get("/get-by-shop/:shopId",isAuth,getItemsByShop)
itemRouter.get("/search-items",isAuth,searchItems)
itemRouter.post(
  "/rating",
  isAuth,
  body("itemId").notEmpty().withMessage("Item ID is required"),
  body("rating").isFloat({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  validate,
  rating
)
export default itemRouter