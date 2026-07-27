import { createSlice } from "@reduxjs/toolkit";

const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem("cartItems");
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (error) {
    console.error("Failed to load cart from storage:", error);
    return [];
  }
};

const saveCartToStorage = (cartItems) => {
  try {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  } catch (error) {
    console.error("Failed to save cart to storage:", error);
  }
};

const initialCartItems = loadCartFromStorage();
const initialTotalAmount = initialCartItems.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopInMyCity: null,
    itemsInMyCity: null,
    cartItems: initialCartItems,
    totalAmount: initialTotalAmount,
    myOrders: [],
    searchItems: null,
    socket: null
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
    setSocket: (state, action) => {
      state.socket = action.payload
    },
    addToCart: (state, action) => {
      const cartItem = action.payload
      const existingItem = state.cartItems.find(i => i.id == cartItem.id)
      if (existingItem) {
        existingItem.quantity += cartItem.quantity
      } else {
        state.cartItems.push(cartItem)
      }

      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      saveCartToStorage(state.cartItems)
    },

    setTotalAmount: (state, action) => {
      state.totalAmount = action.payload
    },

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload
      if (quantity <= 0) {
        state.cartItems = state.cartItems.filter(i => i.id != id)
      } else {
        const item = state.cartItems.find(i => i.id == id)
        if (item) {
          item.quantity = quantity
        }
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      saveCartToStorage(state.cartItems)
    },

    removeCartItem: (state, action) => {
      state.cartItems = state.cartItems.filter(i => i.id !== action.payload)
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
      saveCartToStorage(state.cartItems)
    },

    clearCart: (state) => {
      state.cartItems = []
      state.totalAmount = 0
      saveCartToStorage([])
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
    }
  }
})

export const { setUserData, setCurrentAddress, setCurrentCity, setCurrentState, setShopsInMyCity, setItemsInMyCity, addToCart, updateQuantity, removeCartItem, clearCart, setMyOrders, addMyOrder, updateOrderStatus, setSearchItems, setTotalAmount, setSocket ,updateRealtimeOrderStatus} = userSlice.actions
export default userSlice.reducer