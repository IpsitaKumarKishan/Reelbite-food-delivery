import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopInMyCity: null,
    itemsInMyCity: null,
    cartItems: [],
    totalAmount: 0,
    myOrders: [],
    searchItems: null
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload
    },
    setShopsInMyCity: (state, action) => {
      state.shopInMyCity = action.payload
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload
    },
    setCartItems: (state, action) => {
      const items = Array.isArray(action.payload) ? action.payload : []
      state.cartItems = items.map(i => ({
        ...i,
        id: String(i.id || i._id || (i.item && (i.item._id || i.item)) || ""),
        _id: String(i._id || i.id || (i.item && (i.item._id || i.item)) || ""),
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1
      }))
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
    },
    addToCart: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.cartItems = action.payload.map(i => ({
          ...i,
          id: String(i.id || i._id || (i.item && (i.item._id || i.item)) || ""),
          _id: String(i._id || i.id || (i.item && (i.item._id || i.item)) || ""),
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        }))
      } else if (action.payload) {
        const rawId = action.payload.id || action.payload._id || (action.payload.item && (action.payload.item._id || action.payload.item)) || ""
        const cartItem = {
          ...action.payload,
          id: String(rawId),
          _id: String(rawId),
          price: Number(action.payload.price) || 0,
          quantity: Number(action.payload.quantity) || 1
        }
        const existingIndex = state.cartItems.findIndex(
          i => (i.id && i.id === cartItem.id) || (i._id && i._id === cartItem._id)
        )
        if (existingIndex > -1) {
          state.cartItems[existingIndex].quantity += cartItem.quantity
        } else {
          state.cartItems.push(cartItem)
        }
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
    },

    setTotalAmount: (state, action) => {
      state.totalAmount = action.payload
    },

    updateQuantity: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.cartItems = action.payload.map(i => ({
          ...i,
          id: String(i.id || i._id || (i.item && (i.item._id || i.item)) || ""),
          _id: String(i._id || i.id || (i.item && (i.item._id || i.item)) || ""),
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        }))
      } else if (action.payload) {
        const { id, quantity } = action.payload
        const targetId = String(id || "").trim()
        if (!targetId || targetId === "undefined" || targetId === "null") return

        if (quantity <= 0) {
          state.cartItems = state.cartItems.filter(
            i => String(i.id || i._id) !== targetId
          )
        } else {
          const item = state.cartItems.find(
            i => String(i.id || i._id) === targetId
          )
          if (item) {
            item.quantity = Number(quantity)
          }
        }
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
    },

    removeCartItem: (state, action) => {
      if (Array.isArray(action.payload)) {
        state.cartItems = action.payload.map(i => ({
          ...i,
          id: String(i.id || i._id || (i.item && (i.item._id || i.item)) || ""),
          _id: String(i._id || i.id || (i.item && (i.item._id || i.item)) || ""),
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        }))
      } else if (action.payload) {
        const targetId = String(action.payload).trim()
        if (targetId && targetId !== "undefined" && targetId !== "null") {
          state.cartItems = state.cartItems.filter(
            i => String(i.id || i._id) !== targetId
          )
        }
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
    },

    clearCart: (state) => {
      state.cartItems = []
      state.totalAmount = 0
    },

    setMyOrders: (state, action) => {
      state.myOrders = action.payload
    },
    addMyOrder: (state, action) => {
      state.myOrders = [action.payload, ...state.myOrders]
    },

    updateOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        if (order.shopOrders && order.shopOrders.shop._id == shopId) {
          order.shopOrders.status = status
        }
      }
    },

    updateRealtimeOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        const shopOrder = order.shopOrders.find(so => so.shop._id == shopId)
        if (shopOrder) {
          shopOrder.status = status
        }
      }
    },

    setSearchItems: (state, action) => {
      state.searchItems = action.payload
    },

    updateUserDietPreference: (state, action) => {
      if (state.userData) {
        state.userData.dietPreference = action.payload
      }
    },

    updateUserPreferredCuisines: (state, action) => {
      if (state.userData) {
        state.userData.preferredCuisines = action.payload
      }
    }
  }
})

export const { setUserData, setCurrentAddress, setCurrentCity, setCurrentState, setShopsInMyCity, setItemsInMyCity, setCartItems, addToCart, updateQuantity, removeCartItem, clearCart, setMyOrders, addMyOrder, updateOrderStatus, setSearchItems, setTotalAmount, updateRealtimeOrderStatus, updateUserDietPreference, updateUserPreferredCuisines } = userSlice.actions
export default userSlice.reducer