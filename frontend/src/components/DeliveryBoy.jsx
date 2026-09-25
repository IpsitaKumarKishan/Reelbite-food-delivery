import React, { useEffect, useState } from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { useSocket } from '../context/SocketContext'
import { toast } from 'react-hot-toast'

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
      if (
        result.data?.hasActiveOtp ||
        result.data?.shopOrder?.deliveryOtp ||
        (result.data?.shopOrder?.otpExpires && new Date(result.data.shopOrder.otpExpires) > new Date())
      ) {
        setShowOtpBox(true)
      }
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
    if (!currentOrder?._id || !currentOrder?.shopOrder?._id) {
      toast.error("Active order details missing")
      return
    }
    setLoading(true)
    setMessage("")
    try {
      const result = await axios.post(`${serverUrl}/api/order/send-delivery-otp`, {
        orderId: currentOrder._id,
        shopOrderId: currentOrder.shopOrder._id
      }, { withCredentials: true })
      setLoading(false)
      setShowOtpBox(true)
      const successMsg = result.data?.message || "OTP sent successfully to customer!"
      setMessage(successMsg)
      toast.success(successMsg)
    } catch (error) {
      console.error("sendOtp error:", error)
      setLoading(false)
      const errMsg = error.response?.data?.message || "Failed to send OTP. Please try again."
      setMessage(errMsg)
      toast.error(errMsg)
      // If error indicates OTP already sent or rate limited, reveal the OTP box so the driver can still enter customer's code
      if (errMsg.toLowerCase().includes("too many") || errMsg.toLowerCase().includes("already") || errMsg.toLowerCase().includes("wait")) {
        setShowOtpBox(true)
      }
    }
  }

  const verifyOtp = async () => {
    if (!otp || otp.trim().length !== 4) {
      const err = "Please enter the 4-digit OTP received from customer"
      setMessage(err)
      toast.error(err)
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
      const successMsg = result.data.message || "Order Delivered Successfully! 🎉"
      setMessage(successMsg)
      toast.success(successMsg)
      setTimeout(() => {
        location.reload()
      }, 1200)
    } catch (error) {
      console.error("verifyOtp error:", error)
      setVerifying(false)
      const errMsg = error.response?.data?.message || "Invalid or Expired OTP. Please check with customer."
      setMessage(errMsg)
      toast.error(errMsg)
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

            {/* Feedback message when not in OTP box */}
            {message && !showOtpBox && (
              <p className="mt-3 text-xs font-bold text-center p-2.5 rounded-xl border bg-amber-50 text-amber-800 border-amber-200">
                {message}
              </p>
            )}

            {!showOtpBox ? (
              <div className="mt-4 space-y-2">
                <button
                  className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75'
                  onClick={sendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <ClipLoader size={18} color='white' />
                      <span>Sending OTP to Customer...</span>
                    </>
                  ) : (
                    "Mark As Delivered (Send OTP)"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowOtpBox(true)}
                  className="w-full text-center text-xs font-bold text-stone-500 hover:text-[#ff5200] py-1 cursor-pointer transition"
                >
                  Already sent OTP? Click here to enter OTP
                </button>
              </div>
            ) : (
              <div className='mt-4 p-4 border border-stone-200 rounded-2xl bg-stone-50 space-y-3.5 shadow-inner'>
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <p className='text-xs sm:text-sm font-bold text-stone-800'>
                    Enter OTP from <span className='text-[#ff5200]'>{currentOrder?.user?.fullName || "customer"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowOtpBox(false)}
                    className="text-[11px] text-stone-400 hover:text-stone-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-[11px] text-stone-500">
                  Ask the customer for the 4-digit verification code sent to their registered email.
                </p>

                <input
                  type="text"
                  maxLength={4}
                  className='w-full border border-stone-300 bg-white px-4 py-3 rounded-xl text-center text-lg tracking-widest font-black text-stone-900 focus:outline-none focus:border-[#ff5200] focus:ring-2 focus:ring-[#ff5200]/20'
                  placeholder='• • • •'
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  value={otp}
                  autoFocus
                />

                {message && (
                  <p className={`text-xs font-bold text-center p-2.5 rounded-xl border ${
                    message.includes("Successfully") || message.includes("Delivered")
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}>
                    {message}
                  </p>
                )}

                <button
                  className="w-full bg-[#ff5200] hover:bg-[#c2410c] text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  onClick={verifyOtp}
                  disabled={verifying || otp.trim().length !== 4}
                >
                  {verifying ? <ClipLoader size={16} color="white" /> : "Submit OTP & Complete Order"}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={loading}
                    className="text-xs font-bold text-stone-500 hover:text-[#ff5200] transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Resending OTP..." : "Didn't receive code? Resend OTP"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryBoy;
