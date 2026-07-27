import User from "../models/user.model.js"

const formatUserCart = (cartArray) => {
  if (!cartArray) return [];
  return cartArray
    .filter(c => c && c.item)
    .map(c => ({
      id: c.item._id || c.item,
      name: c.item.name || "",
      price: c.item.price || 0,
      image: c.item.image || "",
      quantity: c.quantity || 1,
      shop: c.item.shop || null,
      category: c.item.category || "",
      foodType: c.item.foodType || ""
    }));
};

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(400).json({ message: "userId is not found" })
    }
    const user = await User.findById(userId).populate("cart.item")
    if (!user) {
      return res.status(400).json({ message: "user is not found" })
    }
    const formattedCart = formatUserCart(user.cart)
    const userObj = user.toObject()
    userObj.cart = formattedCart
    return res.status(200).json(userObj)
  } catch (error) {
    return res.status(500).json({ message: `get current user error ${error}` })
  }
}

export const updateUserLocation = async (req, res) => {
  try {
    const { lat, lon } = req.body
    const user = await User.findByIdAndUpdate(req.userId, {
      location: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    }, { new: true })
    if (!user) {
      return res.status(400).json({ message: "user is not found" })
    }

    return res.status(200).json({ message: 'location updated' })
  } catch (error) {
    return res.status(500).json({ message: `update location user error ${error}` })
  }
}

export const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("cart.item")
    if (!user) return res.status(404).json({ message: "User not found" })
    return res.status(200).json(formatUserCart(user.cart))
  } catch (error) {
    return res.status(500).json({ message: `getCart error ${error}` })
  }
}

export const addToCartBackend = async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body
    if (!itemId) return res.status(400).json({ message: "itemId is required" })

    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: "User not found" })

    const existingIndex = user.cart.findIndex(c => c.item && c.item.toString() === itemId)
    if (existingIndex > -1) {
      user.cart[existingIndex].quantity += Number(quantity)
    } else {
      user.cart.push({ item: itemId, quantity: Number(quantity) })
    }

    await user.save()
    await user.populate("cart.item")
    return res.status(200).json(formatUserCart(user.cart))
  } catch (error) {
    return res.status(500).json({ message: `addToCart error ${error}` })
  }
}

export const updateCartQuantityBackend = async (req, res) => {
  try {
    const { itemId, quantity } = req.body
    if (!itemId) return res.status(400).json({ message: "itemId is required" })

    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: "User not found" })

    if (quantity <= 0) {
      user.cart = user.cart.filter(c => c.item && c.item.toString() !== itemId)
    } else {
      const existing = user.cart.find(c => c.item && c.item.toString() === itemId)
      if (existing) {
        existing.quantity = Number(quantity)
      }
    }

    await user.save()
    await user.populate("cart.item")
    return res.status(200).json(formatUserCart(user.cart))
  } catch (error) {
    return res.status(500).json({ message: `updateCartQuantity error ${error}` })
  }
}

export const removeCartItemBackend = async (req, res) => {
  try {
    const { itemId } = req.params
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: "User not found" })

    user.cart = user.cart.filter(c => c.item && c.item.toString() !== itemId)
    await user.save()
    await user.populate("cart.item")
    return res.status(200).json(formatUserCart(user.cart))
  } catch (error) {
    return res.status(500).json({ message: `removeCartItem error ${error}` })
  }
}

export const clearCartBackend = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: "User not found" })

    user.cart = []
    await user.save()
    return res.status(200).json([])
  } catch (error) {
    return res.status(500).json({ message: `clearCart error ${error}` })
  }
}

