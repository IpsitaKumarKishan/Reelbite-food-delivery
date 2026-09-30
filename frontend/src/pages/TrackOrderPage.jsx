import axios from 'axios';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { serverUrl } from '../App';
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaClock, FaBan, FaRotateLeft, FaCircleCheck, FaTriangleExclamation, FaStar } from "react-icons/fa6";
import DeliveryBoyTracking from '../components/DeliveryBoyTracking';
import { useSocket } from '../context/SocketContext';
import RatingModal from '../components/modals/RatingModal';
import toast from 'react-hot-toast';

function TrackOrderPage() {
  const { orderId } = useParams();
  const [currentOrder, setCurrentOrder] = useState(null);
  const [liveLocations, setLiveLocations] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Ordered by mistake");
  const [isCancelling, setIsCancelling] = useState(false);
  const [reviewTargetShopOrder, setReviewTargetShopOrder] = useState(null);

  const navigate = useNavigate();
  const { socket } = useSocket();

  const handleGetOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-order-by-id/${orderId}`, {
        withCredentials: true,
      });
      setCurrentOrder(result.data);
    } catch (error) {
      console.error("Failed to get order:", error);
    }
  };

  // Socket for live tracking and status updates
  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('joinOrder', { orderId });

    const handleLocationUpdate = ({ deliveryBoyId, latitude, longitude }) => {
      setLiveLocations((prev) => ({
        ...prev,
        [deliveryBoyId]: { lat: latitude, lon: longitude },
      }));
    };

    const handleStatusUpdate = (payload) => {
      if (String(payload?.orderId) === String(orderId)) {
        handleGetOrder();
      }
    };

    const handleDelivered = (payload) => {
      if (String(payload?.orderId) === String(orderId)) {
        handleGetOrder();
        toast.success("Your food has been delivered! Enjoy your meal!");
      }
    };

    const handleDriverAssigned = (payload) => {
      if (String(payload?.orderId) === String(orderId)) {
        handleGetOrder();
        toast("A delivery partner has been assigned to your order!", { icon: "🛵" });
      }
    };

    socket.on('updateDeliveryLocation', handleLocationUpdate);
    socket.on('update-status', handleStatusUpdate);
    socket.on('orderDelivered', handleDelivered);
    socket.on('driverAssigned', handleDriverAssigned);

    return () => {
      socket.emit('leaveOrder', { orderId });
      socket.off('updateDeliveryLocation', handleLocationUpdate);
      socket.off('update-status', handleStatusUpdate);
      socket.off('orderDelivered', handleDelivered);
      socket.off('driverAssigned', handleDriverAssigned);
    };
  }, [socket, orderId]);

  useEffect(() => {
    handleGetOrder();
  }, [orderId]);

  // 120s cancellation countdown calculation
  useEffect(() => {
    if (!currentOrder || currentOrder.cancellation?.isCancelled) {
      setRemainingSeconds(0);
      return;
    }

    const createdAt = new Date(currentOrder.createdAt).getTime();
    const calculateSeconds = () => {
      const elapsed = Math.floor((Date.now() - createdAt) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setRemainingSeconds(remaining);
    };

    calculateSeconds();
    const timer = setInterval(calculateSeconds, 1000);
    return () => clearInterval(timer);
  }, [currentOrder]);

  // Check if order can be cancelled:
  // Allowed if placed within 120s window, or while all shop orders are still strictly pending
  const canCancel = useMemo(() => {
    if (!currentOrder || currentOrder.cancellation?.isCancelled) return false;
    const anyStarted = currentOrder.shopOrders?.some((so) =>
      ["preparing", "out of delivery", "delivered"].includes(so.status)
    );
    if (!anyStarted) return true; // all still pending
    return remainingSeconds > 0;
  }, [currentOrder, remainingSeconds]);

  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true);
      const res = await axios.post(
        `${serverUrl}/api/order/cancel/${orderId}`,
        { reason: cancelReason },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success(res.data.message || "Order cancelled successfully");
        setShowCancelModal(false);
        setCurrentOrder(res.data.order);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className='max-w-4xl mx-auto p-3 sm:p-6 flex flex-col gap-5 sm:gap-6 pb-28 md:pb-20'>
      {/* Top Header */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div className='flex items-center gap-2 sm:gap-3 cursor-pointer' onClick={() => navigate("/")}>
          <IoIosArrowRoundBack size={36} className='text-[#ff5200] hover:-translate-x-1 transition' />
          <div>
            <h1 className='text-xl sm:text-2xl font-black text-stone-900 tracking-tight'>Track Order</h1>
            <p className='text-xs text-stone-500 font-medium'>Order ID: #{orderId?.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        {/* Cancellation CTA button in header if eligible */}
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className='bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs'
          >
            <FaBan size={12} />
            <span>Cancel Order</span>
          </button>
        )}
      </div>

      {/* Cancellation Window Alert Box */}
      {canCancel && remainingSeconds > 0 && (
        <div className='bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0'>
              <FaClock size={14} />
            </div>
            <div>
              <p className='text-xs sm:text-sm font-bold'>
                Need to change something? You can cancel within {formatCountdown(remainingSeconds)}
              </p>
              <p className='text-[11px] text-amber-700'>
                Full automated refund will be initiated if already paid online.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCancelModal(true)}
            className='text-xs font-extrabold text-red-600 hover:text-red-700 bg-white border border-red-200 px-3 py-1.5 rounded-lg shrink-0 shadow-2xs'
          >
            Cancel
          </button>
        </div>
      )}

      {/* Order Cancelled Notification Banner */}
      {currentOrder?.cancellation?.isCancelled && (
        <div className='bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 space-y-2 text-red-950'>
          <div className='flex items-center gap-2 font-black text-base text-red-700'>
            <FaTriangleExclamation size={18} />
            <span>This Order Has Been Cancelled</span>
          </div>
          <p className='text-xs text-red-700'>
            <span className='font-semibold'>Reason:</span> {currentOrder.cancellation.reason || "Customer requested cancellation"}
          </p>
          {currentOrder.refund?.status === "initiated" && (
            <div className='bg-white/80 border border-emerald-300 rounded-xl p-3 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold'>
              <FaRotateLeft className='text-emerald-600 shrink-0' size={14} />
              <span>
                Refund of ₹{currentOrder.refund.amount} initiated to your original payment method. (Ref: {currentOrder.refund.refundId})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Shop Orders Tracking Cards */}
      {currentOrder?.shopOrders?.map((shopOrder, index) => {
        const isShopCancelled = shopOrder.status === "cancelled" || currentOrder?.cancellation?.isCancelled;

        return (
          <div
            className={`bg-white p-5 rounded-2xl shadow-sm border space-y-4 transition ${
              isShopCancelled ? "border-red-200 bg-red-50/20" : "border-stone-200"
            }`}
            key={shopOrder._id || index}
          >
            {/* Header info */}
            <div className='flex items-start justify-between border-b border-stone-100 pb-3'>
              <div>
                <p className='text-lg font-black text-[#ff5200]'>{shopOrder.shop?.name || "Restaurant"}</p>
                <p className='text-xs text-stone-500 font-medium'>
                  Items: {shopOrder.shopOrderItems?.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                </p>
              </div>

              {/* Status Badge */}
              <span
                className={`text-xs font-extrabold uppercase px-3 py-1 rounded-full ${
                  isShopCancelled
                    ? "bg-red-100 text-red-700"
                    : shopOrder.status === "delivered"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-orange-100 text-[#ff5200]"
                }`}
              >
                {isShopCancelled ? "Cancelled" : shopOrder.status}
              </span>
            </div>

            {/* Delivery address & subtotal */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700'>
              <p>
                <span className='font-bold text-stone-900'>Subtotal:</span> ₹{shopOrder.subtotal}
              </p>
              <p className='truncate'>
                <span className='font-bold text-stone-900'>Delivery to:</span> {currentOrder.deliveryAddress?.text}
              </p>
            </div>

            {/* Delivery Boy Details */}
            {!isShopCancelled && (
              shopOrder.status !== "delivered" ? (
                shopOrder.assignedDeliveryBoy ? (
                  <div className='bg-stone-50 border border-stone-200/80 rounded-xl p-3 flex items-center justify-between text-xs'>
                    <div>
                      <p className='font-bold text-stone-900'>
                        Rider: {shopOrder.assignedDeliveryBoy.fullName}
                      </p>
                      <p className='text-stone-500'>Contact: {shopOrder.assignedDeliveryBoy.mobile}</p>
                    </div>
                    <span className='bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]'>
                      On The Way
                    </span>
                  </div>
                ) : (
                  <p className='text-xs text-stone-500 font-medium italic'>
                    Assigning a delivery partner near the restaurant...
                  </p>
                )
              ) : (
                <div className='flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-200 gap-3'>
                  <div className='flex items-center gap-1.5 text-emerald-700 font-bold text-xs sm:text-sm'>
                    <FaCircleCheck />
                    <span>Delivered successfully! Enjoy your meal.</span>
                  </div>
                  <button
                    onClick={() => setReviewTargetShopOrder(shopOrder)}
                    className='px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer shrink-0'
                  >
                    <FaStar size={11} />
                    <span>Rate Meal</span>
                  </button>
                </div>
              )
            )}

            {/* Live Map Tracking */}
            {!isShopCancelled && shopOrder.assignedDeliveryBoy && shopOrder.status !== "delivered" && (
              <div className='h-[350px] w-full rounded-2xl overflow-hidden shadow-inner border border-stone-200'>
                <DeliveryBoyTracking
                  data={{
                    deliveryBoyLocation: liveLocations[shopOrder.assignedDeliveryBoy._id] || {
                      lat: shopOrder.assignedDeliveryBoy.location?.coordinates?.[1] || 0,
                      lon: shopOrder.assignedDeliveryBoy.location?.coordinates?.[0] || 0,
                    },
                    customerLocation: {
                      lat: currentOrder.deliveryAddress.latitude,
                      lon: currentOrder.deliveryAddress.longitude,
                    },
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0'>
                <FaBan size={18} />
              </div>
              <div>
                <h3 className='text-lg font-black text-stone-900'>Cancel Order?</h3>
                <p className='text-xs text-stone-500'>Are you sure you want to cancel this order?</p>
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-xs font-bold text-stone-700'>Reason for cancellation</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className='w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-semibold text-stone-800 outline-none focus:border-[#ff5200]'
              >
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Wrong delivery address selected">Wrong delivery address selected</option>
                <option value="Need to change items/dishes">Need to change items/dishes</option>
                <option value="Wait time is longer than expected">Wait time is longer than expected</option>
                <option value="Other reason">Other reason</option>
              </select>
            </div>

            {currentOrder?.paymentMethod === "online" && currentOrder?.payment && (
              <div className='bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900'>
                <p className='font-bold'>Automatic Refund Notice</p>
                <p className='mt-0.5 text-[11px] text-blue-700'>
                  ₹{currentOrder.totalAmount} will be immediately refunded back to your original payment method via Razorpay.
                </p>
              </div>
            )}

            <div className='flex items-center justify-end gap-3 pt-2'>
              <button
                type='button'
                onClick={() => setShowCancelModal(false)}
                className='px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-100 rounded-xl transition'
              >
                Keep Order
              </button>
              <button
                type='button'
                disabled={isCancelling}
                onClick={handleCancelOrder}
                className='px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 cursor-pointer'
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Delivery Rating Modal */}
      {reviewTargetShopOrder && (
        <RatingModal
          order={currentOrder}
          shopOrder={reviewTargetShopOrder}
          onClose={() => setReviewTargetShopOrder(null)}
          onReviewSubmitted={() => {
            setReviewTargetShopOrder(null);
            handleGetOrder();
          }}
        />
      )}
    </div>
  );
}

export default TrackOrderPage;
