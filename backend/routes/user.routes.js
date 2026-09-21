import express from "express"
import {
  getCurrentUser,
  updateUserLocation,
  getCart,
  addToCartBackend,
  updateCartQuantityBackend,
  removeCartItemBackend,
  clearCartBackend,
  updateDietPreference,
  updatePreferences,
  getDistinctCategories,
  updateProfile,
  addAddress,
  deleteAddress,
  setDefaultAddress
} from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"

const userRouter = express.Router()

userRouter.get("/current", isAuth, getCurrentUser)
userRouter.post('/update-location', isAuth, updateUserLocation)
userRouter.put('/diet-preference', isAuth, updateDietPreference)
userRouter.put('/profile', isAuth, updateProfile)

// Address endpoints
userRouter.post('/addresses', isAuth, addAddress)
userRouter.delete('/addresses/:addressId', isAuth, deleteAddress)
userRouter.patch('/addresses/:addressId/default', isAuth, setDefaultAddress)

// Cart endpoints
userRouter.get('/cart', isAuth, getCart)
userRouter.post('/cart/add', isAuth, addToCartBackend)
userRouter.put('/cart/update', isAuth, updateCartQuantityBackend)
userRouter.delete('/cart/remove/:itemId', isAuth, removeCartItemBackend)
userRouter.delete('/cart/clear', isAuth, clearCartBackend)

// Onboarding / preference endpoints
userRouter.patch('/preferences', isAuth, updatePreferences)
userRouter.get('/cuisine-categories', isAuth, getDistinctCategories)

export default userRouter