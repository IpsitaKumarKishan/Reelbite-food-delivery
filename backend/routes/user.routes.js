import express from "express"
import {
  getCurrentUser,
  updateUserLocation,
  getCart,
  addToCartBackend,
  updateCartQuantityBackend,
  removeCartItemBackend,
  clearCartBackend
} from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"

const userRouter = express.Router()

userRouter.get("/current", isAuth, getCurrentUser)
userRouter.post('/update-location', isAuth, updateUserLocation)

// Cart endpoints
userRouter.get('/cart', isAuth, getCart)
userRouter.post('/cart/add', isAuth, addToCartBackend)
userRouter.put('/cart/update', isAuth, updateCartQuantityBackend)
userRouter.delete('/cart/remove/:itemId', isAuth, removeCartItemBackend)
userRouter.delete('/cart/clear', isAuth, clearCartBackend)

export default userRouter