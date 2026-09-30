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
import { Phone, User as UserIcon, Clock, AlertTriangle, XCircle, X } from 'lucide-react'

const CANCELLATION_REASONS = [
  "Receiver unreachable / not picking up calls (Waited 20+ mins)",
  "Receiver refused to accept food / delivery",
  "Incorrect / unreachable delivery address",
  "Receiver requested cancellation on doorstep",
  "Customer unavailable / premises locked",
  "Other reason"
]

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

  // Wait time tracking and cancellation modal state
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0])
  const [customReason, setCustomReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

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
          userId: userData._id,
          orderId: currentOrder?._id || null
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
  }, [socket, userData, currentOrder?._id])

  useEffect(() => {
    if (!socket || !currentOrder?._id) return;
    socket.emit('joinOrder', { orderId: currentOrder._id });
    return () => {
      socket.emit('leaveOrder', { orderId: currentOrder._id });
    };
  }, [socket, currentOrder?._id]);

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

  // Live timer for elapsed time since assignment acceptance
  useEffect(() => {
    if (!currentOrder) {
      setElapsedSeconds(0)
      return
    }

    const computeElapsed = () => {
      const startTime = currentOrder.acceptedAt
        ? new Date(currentOrder.acceptedAt).getTime()
        : (currentOrder.shopOrder?.updatedAt ? new Date(currentOrder.shopOrder.updatedAt).getTime() : Date.now())
      const diffSec = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      setElapsedSeconds(diffSec)
    }

    computeElapsed()
    const timerInterval = setInterval(computeElapsed, 1000)

    return () => clearInterval(timerInterval)
  }, [currentOrder])

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  const remainingSeconds = elapsedSeconds % 60
  const isOver20Minutes = elapsedMinutes >= 20
  const formattedTime = `${elapsedMinutes}m ${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}s`

  const handleRiderCancelOrder = async () => {
    const finalReason = cancelReason === "Other reason" 
      ? customReason.trim() 
      : cancelReason

    if (!finalReason) {
      toast.error("Please provide or select a valid cancellation reason")
      return
    }

    if (cancelReason === "Other reason" && customReason.trim().length < 5) {
      toast.error("Please explain the reason in more detail (min 5 characters)")
      return
    }

    setCancelling(true)
    try {
      const result = await axios.post(`${serverUrl}/api/order/rider-cancel`, {
        orderId: currentOrder._id,
        shopOrderId: currentOrder.shopOrder?._id,
        reason: finalReason
      }, { withCredentials: true })

      setCancelling(false)
      setShowCancelModal(false)
      setCurrentOrder(null)
      setShowOtpBox(false)
      setOtp("")
      const successMsg = result.data?.message || "Order cancelled successfully."
      toast.success(successMsg)
      await getAssignments()
      await getCurrentOrder()
      await handleTodayDeliveries()
    } catch (error) {
      console.error("handleRiderCancelOrder error:", error)
      setCancelling(false)
      const errMsg = error.response?.data?.message || "Failed to cancel order. Please try again."
      toast.error(errMsg)
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
    <div className='w-full min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto pb-28 md:pb-12 px-3 sm:px-4'>
      <Nav />
      <div className='w-full max-w-[800px] flex flex-col gap-5 items-center pt-20'>
        <div className='bg-white rounded-2xl shadow-md p-4 sm:p-5 flex flex-col justify-start items-center w-full border border-orange-100 text-center gap-2'>
          <h1 className='text-lg sm:text-xl font-bold text-[#ff4d2d]'>Welcome, {userData?.fullName}</h1>
          <p className='text-[#ff4d2d] text-xs sm:text-sm'><span className='font-semibold'>Latitude:</span> {deliveryBoyLocation?.lat || 'Locating...'}, <span className='font-semibold'>Longitude:</span> {deliveryBoyLocation?.lon || 'Locating...'}</p>
        </div>

        <div className='bg-white rounded-2xl shadow-md p-4 sm:p-5 w-full mb-2 border border-orange-100'>
          <h1 className='text-lg font-bold mb-3 text-[#ff4d2d]'>Today Deliveries</h1>

          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={todayDeliveries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, "orders"]} labelFormatter={label => `${label}:00`} />
              <Bar dataKey="count" fill='#ff4d2d' />
            </BarChart>
          </ResponsiveContainer>

          <div className='max-w-sm mx-auto mt-6 p-4 sm:p-6 bg-white rounded-2xl shadow-lg text-center border border-stone-100'>
            <h1 className='text-lg sm:text-xl font-semibold text-gray-800 mb-2'>Today's Earning</h1>
            <span className='text-3xl font-bold text-green-600'>₹{totalEarning}</span>
          </div>
        </div>

        {!currentOrder && (
          <div className='bg-white rounded-2xl p-4 sm:p-5 shadow-md w-full border border-orange-100'>
            <h1 className='text-lg font-bold mb-4 flex items-center gap-2 text-stone-800'>Available Orders</h1>

            <div className='space-y-4'>
              {availableAssignments?.length > 0 ? (
                availableAssignments.map((a, index) => (
                  <div className='border rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50' key={index}>
                    <div>
                      <p className='text-sm font-bold text-stone-800'>{a?.shopName}</p>
                      <p className='text-xs text-stone-500 mt-0.5'><span className='font-semibold'>Address:</span> {a?.deliveryAddress.text}</p>
                      <p className='text-xs text-stone-400 mt-1'>{a.items.length} items | ₹{a.subtotal}</p>
                    </div>
                    <button
                      className='bg-[#ff5200] hover:bg-[#c2410c] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition self-end sm:self-auto cursor-pointer'
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
          <div className='bg-white rounded-2xl p-4 sm:p-5 shadow-md w-full border border-orange-100 space-y-4'>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <h2 className='text-lg font-bold text-stone-900'>📦 Active Order Assignment</h2>
              <span className="text-xs font-bold text-stone-500">
                Order #{currentOrder._id?.slice(-6)?.toUpperCase()}
              </span>
            </div>

            {/* Delivery Timer & 20-Minute Average Wait Policy Banner */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isOver20Minutes 
                ? "bg-amber-50/90 border-amber-300 text-amber-900 shadow-sm" 
                : "bg-blue-50/80 border-blue-200 text-blue-900"
            }`}>
              <div className="flex items-center gap-2.5">
                <Clock size={18} className={isOver20Minutes ? "text-amber-600 animate-pulse shrink-0" : "text-blue-600 shrink-0"} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">Delivery Wait Time:</span>
                    <span className={`font-mono text-xs px-2 py-0.5 rounded font-black border ${
                      isOver20Minutes ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-white border-blue-200 text-blue-800"
                    }`}>
                      {formattedTime}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    {isOver20Minutes 
                      ? "⚠️ 20+ mins elapsed. If receiver is not responding or refusing delivery, you may cancel with valid reason." 
                      : "⏳ Standard policy: wait an average of 20 mins before cancelling for unreachable receiver."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                  isOver20Minutes
                    ? "bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm"
                    : "bg-white hover:bg-red-50 text-red-600 border-red-200"
                }`}
              >
                <AlertTriangle size={13} />
                <span>Cancel Order {isOver20Minutes ? "(20m+ waited)" : ""}</span>
              </button>
            </div>

            <div className='border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5'>
              <div className="flex items-center justify-between">
                <p className='font-bold text-sm text-stone-800'>{currentOrder?.shopOrder?.shop?.name}</p>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                  ₹{currentOrder?.shopOrder?.subtotal}
                </span>
              </div>

              {/* Customer Contact Box */}
              {(currentOrder?.contactMobile || currentOrder?.user?.mobile) && (
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <UserIcon size={13} className="text-[#ff5200]" />
                      <span>{currentOrder?.user?.fullName || "Customer"}</span>
                    </p>
                    <p className="text-xs font-semibold text-stone-600 flex items-center gap-1">
                      <Phone size={12} className="text-emerald-600" />
                      <span>{currentOrder?.contactMobile || currentOrder?.user?.mobile}</span>
                    </p>
                  </div>
                  <a
                    href={`tel:${currentOrder?.contactMobile || currentOrder?.user?.mobile}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition"
                  >
                    <Phone size={13} />
                    <span>Call Customer</span>
                  </a>
                </div>
              )}

              <p className='text-xs text-stone-600'><span className="font-bold">Customer Address:</span> {currentOrder.deliveryAddress.text}</p>
              <p className='text-xs text-stone-400'>{currentOrder.shopOrder.shopOrderItems.length} items</p>
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
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <button
                    className='w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75'
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
                    onClick={() => setShowCancelModal(true)}
                    className="w-full sm:w-auto px-4 py-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle size={15} />
                    <span>Cancel Delivery</span>
                  </button>
                </div>

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

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={sendOtp}
                    disabled={loading}
                    className="font-bold text-stone-500 hover:text-[#ff5200] transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Resending OTP..." : "Resend OTP"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="font-bold text-red-600 hover:text-red-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <XCircle size={13} />
                    <span>Customer Refusing / Cancel Order</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel Delivery Modal */}
        {showCancelModal && currentOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2 text-red-600 font-bold text-base sm:text-lg">
                  <AlertTriangle size={20} />
                  <span>Cancel Delivery Assignment</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-lg transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Wait Time Indicator */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isOver20Minutes 
                  ? "bg-amber-50 border-amber-300 text-amber-900" 
                  : "bg-orange-50 border-orange-200 text-orange-950"
              }`}>
                <Clock size={20} className={isOver20Minutes ? "text-amber-600 shrink-0" : "text-orange-500 shrink-0"} />
                <div className="text-xs">
                  <p className="font-bold">
                    Elapsed Wait Time: <span className="font-mono text-sm underline">{formattedTime}</span>
                  </p>
                  <p className="mt-0.5 text-stone-600 leading-relaxed">
                    {isOver20Minutes ? (
                      <span className="text-emerald-700 font-semibold">
                        ✓ 20+ minutes elapsed. You may cancel if the receiver is unresponsive or refusing delivery.
                      </span>
                    ) : (
                      <span>
                        Standard policy recommends waiting an average of <strong>20 minutes</strong> before cancelling for an unresponsive receiver.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Receiver phone contact helper */}
              {(currentOrder?.contactMobile || currentOrder?.user?.mobile) && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-stone-500 font-medium">Customer: {currentOrder?.user?.fullName || "Receiver"}</p>
                    <p className="font-bold text-stone-800">{currentOrder?.contactMobile || currentOrder?.user?.mobile}</p>
                  </div>
                  <a
                    href={`tel:${currentOrder?.contactMobile || currentOrder?.user?.mobile}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-xs"
                  >
                    <Phone size={12} />
                    <span>Call Receiver</span>
                  </a>
                </div>
              )}

              {/* Reason Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-800">
                  Select Valid Reason for Cancellation <span className="text-red-500">*</span>:
                </label>
                <div className="space-y-1.5">
                  {CANCELLATION_REASONS.map((r, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        cancelReason === r
                          ? "border-[#ff5200] bg-orange-50/50 font-bold text-stone-900"
                          : "border-stone-200 hover:bg-stone-50 text-stone-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancellationReason"
                        value={r}
                        checked={cancelReason === r}
                        onChange={() => setCancelReason(r)}
                        className="mt-0.5 accent-[#ff5200]"
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom reason input if "Other reason" is selected */}
              {cancelReason === "Other reason" && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Describe Reason in Detail <span className="text-red-500">*</span>:
                  </label>
                  <textarea
                    rows={2}
                    className="w-full text-xs p-2.5 border border-stone-300 rounded-xl focus:outline-none focus:border-[#ff5200] focus:ring-1 focus:ring-[#ff5200]"
                    placeholder="Please explain why the delivery cannot be completed..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                </div>
              )}

              {/* Advisory warning if under 20 mins and selecting unreachable */}
              {!isOver20Minutes && cancelReason.includes("unreachable") && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    You have waited {formattedTime}. If customer does not answer, please attempt at least 2 phone calls before submitting cancellation.
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  onClick={handleRiderCancelOrder}
                  disabled={cancelling}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? (
                    <>
                      <ClipLoader size={14} color="white" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    "Confirm Cancellation"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryBoy;
