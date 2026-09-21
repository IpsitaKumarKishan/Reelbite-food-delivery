import User from "../models/user.model.js"
import Item from "../models/item.model.js"
import bcrypt from "bcryptjs"

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

export const updateDietPreference = async (req, res) => {
  try {
    const { dietPreference } = req.body
    if (!["veg", "all"].includes(dietPreference)) {
      return res.status(400).json({ message: "Invalid dietPreference. Must be 'veg' or 'all'" })
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { dietPreference },
      { new: true }
    ).populate("cart.item")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const userObj = user.toObject()
    userObj.cart = formatUserCart(user.cart)

    return res.status(200).json(userObj)
  } catch (error) {
    return res.status(500).json({ message: `Update diet preference error ${error}` })
  }
}

/**
 * PATCH /api/user/preferences
 * Saves the user's preferred cuisine categories chosen during onboarding.
 * Accepts { preferredCuisines: string[] }. An empty array (user skipped)
 * is valid — the cold-start logic checks for non-empty before using it.
 */
export const updatePreferences = async (req, res) => {
  try {
    const { preferredCuisines } = req.body
    if (!Array.isArray(preferredCuisines)) {
      return res.status(400).json({ message: "preferredCuisines must be an array" })
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferredCuisines },
      { new: true }
    ).populate("cart.item")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const userObj = user.toObject()
    userObj.cart = formatUserCart(user.cart)
    return res.status(200).json(userObj)
  } catch (error) {
    return res.status(500).json({ message: `Update preferences error ${error}` })
  }
}

/**
 * GET /api/user/cuisine-categories
 * Returns the distinct food item categories that exist in the database.
 * Used by the onboarding UI to populate cuisine-selection buttons dynamically.
 * Public endpoint (no auth required, but mounted behind isAuth in routes).
 */
export const getDistinctCategories = async (req, res) => {
  try {
    const categories = await Item.distinct("category")
    const filtered = categories.filter(Boolean).sort()
    return res.status(200).json({ categories: filtered })
  } catch (error) {
    return res.status(500).json({ message: `Get categories error ${error}` })
  }
}

/**
 * PUT /api/user/profile
 * Updates user full name, mobile number, and optionally updates password
 */
export const updateProfile = async (req, res) => {
  try {
    const { fullName, mobile, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName && fullName.trim()) user.fullName = fullName.trim();
    if (mobile && mobile.trim()) {
      if (mobile.trim().length < 10) {
        return res.status(400).json({ message: "Mobile number must be at least 10 digits." });
      }
      user.mobile = mobile.trim();
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
      }

      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to set a new password." });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Current password is incorrect." });
        }
      }

      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    await user.populate("cart.item");

    const userObj = user.toObject();
    userObj.cart = formatUserCart(user.cart);
    return res.status(200).json({ message: "Profile updated successfully", user: userObj });
  } catch (error) {
    return res.status(500).json({ message: `Update profile error ${error.message || error}` });
  }
};

/**
 * POST /api/user/addresses
 * Adds a new delivery address
 */
export const addAddress = async (req, res) => {
  try {
    const { label, street, city, state, isDefault } = req.body;
    if (!street || !street.trim()) {
      return res.status(400).json({ message: "Street address is required." });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.addresses) user.addresses = [];

    const shouldBeDefault = isDefault || user.addresses.length === 0;
    if (shouldBeDefault) {
      user.addresses.forEach((a) => { a.isDefault = false; });
    }

    user.addresses.push({
      label: label || "Home",
      street: street.trim(),
      city: city || "",
      state: state || "",
      isDefault: shouldBeDefault,
    });

    await user.save();
    return res.status(200).json({ message: "Address added successfully", addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: `Add address error ${error.message || error}` });
  }
};

/**
 * DELETE /api/user/addresses/:addressId
 * Removes a saved address
 */
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const wasDefault = user.addresses.find((a) => a._id.toString() === addressId)?.isDefault;
    user.addresses = user.addresses.filter((a) => a._id.toString() !== addressId);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return res.status(200).json({ message: "Address removed", addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: `Delete address error ${error.message || error}` });
  }
};

/**
 * PATCH /api/user/addresses/:addressId/default
 * Sets an address as the default delivery address
 */
export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.forEach((a) => {
      a.isDefault = a._id.toString() === addressId;
    });

    await user.save();
    return res.status(200).json({ message: "Default address updated", addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: `Set default address error ${error.message || error}` });
  }
};
