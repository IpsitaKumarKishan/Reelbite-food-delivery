import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ForgotPassword from './pages/ForgotPassword'
import useGetCurrentUser from './hooks/useGetCurrentUser'
import { useSelector } from 'react-redux'
import Home from './pages/Home'
import LandingPage from './pages/LandingPage'
import useGetCity from './hooks/useGetCity'
import useGetMyshop from './hooks/useGetMyShop'
import CreateEditShop from './pages/CreateEditShop'
import AddItem from './pages/AddItem'
import EditItem from './pages/EditItem'
import useGetShopByCity from './hooks/useGetShopByCity'
import useGetItemsByCity from './hooks/useGetItemsByCity'
import CartPage from './pages/CartPage'
import CheckOut from './pages/CheckOut'
import OrderPlaced from './pages/OrderPlaced'
import MyOrders from './pages/MyOrders'
import useGetMyOrders from './hooks/useGetMyOrders'
import useUpdateLocation from './hooks/useUpdateLocation'
import TrackOrderPage from './pages/TrackOrderPage'
import Shop from './pages/Shop'
import Reels from './pages/Reels'
import OwnerReels from './pages/OwnerReels'
import LikedReels from './pages/LikedReels'
import NotFound from './pages/NotFound'
import { Toaster } from 'react-hot-toast'
import MobileBottomTab from './components/MobileBottomTab'

export const serverUrl = (import.meta.env.VITE_SERVER_URL !== undefined && import.meta.env.VITE_SERVER_URL !== "")
  ? import.meta.env.VITE_SERVER_URL
  : (import.meta.env.MODE === 'production' ? "" : "http://localhost:8000");

function AuthenticatedDataLoader() {
  useUpdateLocation()
  useGetCity()
  useGetMyshop()
  useGetShopByCity()
  useGetItemsByCity()
  useGetMyOrders()
  return null
}

function App() {
  const { userData } = useSelector(state => state.user)
  useGetCurrentUser()

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      {userData && <AuthenticatedDataLoader />}
      <Routes>
        <Route path='/signup' element={!userData ? <SignUp/> : <Navigate to={"/"}/>}/>
        <Route path='/signin' element={!userData ? <SignIn/> : <Navigate to={"/"}/>}/>
        <Route path='/forgot-password' element={!userData ? <ForgotPassword/> : <Navigate to={"/"}/>}/>
        <Route path='/' element={userData ? <Home/> : <LandingPage/>}/>
        <Route path='/landing' element={<LandingPage/>}/>
        <Route path='/reels' element={<Reels/>}/>
        <Route path='/liked-reels' element={userData ? <LikedReels/> : <Navigate to={"/signin"}/>}/>
        <Route path='/owner/reels' element={userData && userData.role === "owner" ? <OwnerReels/> : <Navigate to={"/"}/>}/>
        <Route path='/create-edit-shop' element={userData ? <CreateEditShop/> : <Navigate to={"/signin"}/>}/>
        <Route path='/add-item' element={userData ? <AddItem/> : <Navigate to={"/signin"}/>}/>
        <Route path='/edit-item/:itemId' element={userData ? <EditItem/> : <Navigate to={"/signin"}/>}/>
        <Route path='/cart' element={userData ? <CartPage/> : <Navigate to={"/signin"}/>}/>
        <Route path='/checkout' element={userData ? <CheckOut/> : <Navigate to={"/signin"}/>}/>
        <Route path='/order-placed' element={userData ? <OrderPlaced/> : <Navigate to={"/signin"}/>}/>
        <Route path='/my-orders' element={userData ? <MyOrders/> : <Navigate to={"/signin"}/>}/>
        <Route path='/track-order/:orderId' element={userData ? <TrackOrderPage/> : <Navigate to={"/signin"}/>}/>
        <Route path='/shop/:shopId' element={userData ? <Shop/> : <Navigate to={"/signin"}/>}/>
        <Route path='*' element={<NotFound />}/>
      </Routes>
      <MobileBottomTab />
    </>
  )
}

export default App
