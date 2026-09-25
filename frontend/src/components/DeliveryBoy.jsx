import React, { useEffect, useState } from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { useSocket } from '../context/SocketContext'

function DeliveryBoy() {
  const { userData } = useSelector(state => state.user)
  const { socket } = useSocket()
  const [availableAssignments, setAvailableAssignments] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [otp, setOtp] = useState("")
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [todayDeliveries, setTodayDeliveries] = useState([])
  const [totalEarning, setTotalEarning] = useState(0)
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!socket || userData?.role !== "deliveryBoy") return
    let watchId
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        setDeliveryBoyLocation({ lat: latitude, lon: longitude })
        socket.emit('updateLocation', {
          latitude,
          longitude,
          userId: userData._id
        })
      },
        (error) => {
          console.log(error)
        },
        {
          enableHighAccuracy: true
        })
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [socket, userData])

  const getAssignments = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-assignments`, { withCredentials: true })
      setAvailableAssignments(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-current-order`, { withCredentials: true })
      setCurrentOrder(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  const acceptOrder = async (assignmentId) => {
    try {
      await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`, { withCredentials: true })
      await getAssignments()
      await getCurrentOrder()
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!socket) return;
    socket.on('newAssignment', (data) => {
      setAvailableAssignments(prev => ([...prev, data]))
    })
    return () => {
      socket.off('newAssignment')
    }
  }, [socket])

  const sendOtp = async () => {
    setLoading(true)
    setMessage("")
    try {
      const result = await axios.post(`${serverUrl}/api/order/send-delivery-otp`, {
        orderId: currentOrder._id,
        shopOrderId: currentOrder.shopOrder._id
      }, { withCredentials: true })
      setLoading(false)
      setShowOtpBox(true)
      console.log(result.data)
    } catch (error) {
      console.log(error)
      setLoading(false)
      setMessage(error.response?.data?.message || "Failed to send OTP")
    }
  }

  const verifyOtp = async () => {
    if (!otp) {
      setMessage("Please enter the 4-digit OTP from customer")
      return
    }
    setMessage("")
    setVerifying(true)
    try {
      const result = await axios.post(`${serverUrl}/api/order/verify-delivery-otp`, {
        orderId: currentOrder._id,
        shopOrderId: currentOrder.shopOrder._id,
        otp: otp.trim()
      }, { withCredentials: true })

      setVerifying(false)
      setMessage(result.data.message || "Order Delivered Successfully! 🎉")
      setTimeout(() => {
        location.reload()
      }, 1200)
    } catch (error) {
      console.error("verifyOtp error:", error)
      setVerifying(false)
      setMessage(error.response?.data?.message || "Invalid or Expired OTP")
    }
  }

  const handleTodayDeliveries = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-today-deliveries`, { withCredentials: true })
      if (result.data) {
        setTodayDeliveries(result.data.stats || (Array.isArray(result.data) ? result.data : []))
        setTotalEarning(result.data.totalEarning || 0)
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (userData) {
      getAssignments()
      getCurrentOrder()
      handleTodayDeliveries()
    }
  }, [userData])

  return (
    <div className='w-screen min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto pb-12'>
      <Nav />
      <div className='w-full max-w-[800px] flex flex-col gap-5 items-center pt-20'>
        <div className='bg-white rounded-2xl shadow-md p-5 flex flex-col justify-start items-center w-[90%] border border-orange-100 text-center gap-2'>
          <h1 className='text-xl font-bold text-[#ff4d2d]'>Welcome, {userData?.fullName}</h1>
          <p className='text-[#ff4d2d] text-xs sm:text-sm'><span className='font-semibold'>Latitude:</span> {deliveryBoyLocation?.lat || 'Locating...'}, <span className='font-semibold'>Longitude:</span> {deliveryBoyLocation?.lon || 'Locating...'}</p>
        </div>

        <div className='bg-white rounded-2xl shadow-md p-5 w-[90%] mb-2 border border-orange-100'>
          <h1 className='text-lg font-bold mb-3 text-[#ff4d2d] '>Today Deliveries</h1>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={todayDeliveries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, "orders"]} labelFormatter={label => `${label}:00`} />
              <Bar dataKey="count" fill='#ff4d2d' />
            </BarChart>
          </ResponsiveContainer>

          <div className='max-w-sm mx-auto mt-6 p-6 bg-white rounded-2xl shadow-lg text-center border border-stone-100'>
            <h1 className='text-xl font-semibold text-gray-800 mb-2'>Today's Earning</h1>
            <span className='text-3xl font-bold text-green-600'>₹{totalEarning}</span>
          </div>
        </div>

        {!currentOrder && (
          <div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100'>
            <h1 className='text-lg font-bold mb-4 flex items-center gap-2 text-stone-800'>Available Orders</h1>

            <div className='space-y-4'>
              {availableAssignments?.length > 0 ? (
                availableAssignments.map((a, index) => (
                  <div className='border rounded-xl p-4 flex justify-between items-center bg-stone-50/50' key={index}>
                    <div>
                      <p className='text-sm font-bold text-stone-800'>{a?.shopName}</p>
                      <p className='text-xs text-stone-500 mt-0.5'><span className='font-semibold'>Address:</span> {a?.deliveryAddress.text}</p>
                      <p className='text-xs text-stone-400 mt-1'>{a.items.length} items | ₹{a.subtotal}</p>
                    </div>
                    <button
                      className='bg-[#ff5200] hover:bg-[#c2410c] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition'
                      onClick={() => acceptOrder(a.assignmentId)}
                    >
                      Accept
                    </button>
                  </div>
                ))
              ) : (
                <p className='text-stone-400 text-xs font-semibold py-4 text-center'>No Available Orders</p>
              )}
            </div>
          </div>
        )}

        {currentOrder && (
          <div className='bg-white rounded-2xl p-5 shadow-md w-[90%] border border-orange-100 space-y-4'>
            <h2 className='text-lg font-bold text-stone-900'>📦 Active Order Assignment</h2>
            <div className='border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-1'>
              <p className='font-bold text-sm text-stone-800'>{currentOrder?.shopOrder.shop.name}</p>
              <p className='text-xs text-stone-600'><span className="font-bold">Customer Address:</span> {currentOrder.deliveryAddress.text}</p>
              <p className='text-xs text-stone-400 pt-1'>{currentOrder.shopOrder.shopOrderItems.length} items | Subtotal: ₹{currentOrder.shopOrder.subtotal}</p>
            </div>

            <DeliveryBoyTracking data={{
              deliveryBoyLocation: deliveryBoyLocation || {
                lat: userData?.location?.coordinates[1] || 0,
                lon: userData?.location?.coordinates[0] || 0
              },
              customerLocation: {
                lat: currentOrder.deliveryAddress.latitude,
                lon: currentOrder.deliveryAddress.longitude
              }
            }} />

            {!showOtpBox ? (
              <button
                className='mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2'
                onClick={sendOtp}
                disabled={loading}
              >
                {loading ? <ClipLoader size={18} color='white' /> : "Mark As Delivered (Send OTP)"}
              </button>
            ) : (
              <div className='mt-4 p-4 border border-stone-200 rounded-2xl bg-stone-50 space-y-3'>
                <p className='text-xs sm:text-sm font-bold text-stone-800'>
                  Enter OTP received from customer (<span className='text-[#ff5200]'>{currentOrder?.user?.fullName}</span>)
                </p>

                <input
                  type="text"
                  className='w-full border border-stone-300 px-4 py-2.5 rounded-xl text-sm font-bold text-stone-800 focus:outline-none focus:border-[#ff5200] focus:ring-1 focus:ring-[#ff5200]'
                  placeholder='Enter 4-digit OTP'
                  onChange={(e) => setOtp(e.target.value)}
                  value={otp}
                />

                {message && (
                  <p className={`text-xs font-bold text-center p-2 rounded-xl border ${
                    message.includes("Successfully") || message.includes("Delivered")
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}>
                    {message}
                  </p>
                )}

                <button
                  className="w-full bg-[#ff5200] hover:bg-[#c2410c] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow transition disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={verifyOtp}
                  disabled={verifying || !otp}
                >
                  {verifying ? <ClipLoader size={16} color="white" /> : "Submit OTP & Complete Order"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryBoy;
