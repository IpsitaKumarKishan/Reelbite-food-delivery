import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaWallet, FaBagShopping, FaRotateRight } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { serverUrl } from '../App';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { setMyOrders, updateRealtimeOrderStatus } from '../redux/userSlice';
import { useSocket } from '../context/SocketContext';

function MyOrders() {
  const { userData, myOrders } = useSelector(state => state.user);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const ordersList = Array.isArray(myOrders)
    ? myOrders
    : (Array.isArray(myOrders?.data) ? myOrders.data : []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await axios.get(`${serverUrl}/api/order/my-orders`, { withCredentials: true });
      dispatch(setMyOrders(result.data));
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userData?._id]);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (data) => {
      const ownerId = data.shopOrders?.owner?._id || data.shopOrders?.owner;
      if (ownerId?.toString() === userData?._id?.toString()) {
        dispatch(setMyOrders([data, ...ordersList]));
      }
    };

    const handleStatusUpdate = ({ orderId, shopId, status, userId }) => {
      if (userId === userData?._id || userData?.role === "owner") {
        dispatch(updateRealtimeOrderStatus({ orderId, shopId, status }));
      }
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('update-status', handleStatusUpdate);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('update-status', handleStatusUpdate);
    };
  }, [socket, userData?._id, userData?.role, ordersList, dispatch]);

  // Calculate earnings for Restaurant Owner
  const ownerEarnings = useMemo(() => {
    if (!ordersList.length || userData?.role !== "owner") {
      return { totalRevenue: 0, todayRevenue: 0, deliveredCount: 0 };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let totalRevenue = 0;
    let todayRevenue = 0;
    let deliveredCount = 0;

    ordersList.forEach((order) => {
      if (!order) return;
      const shopOrder = order.shopOrders;
      if (shopOrder && shopOrder.status === "delivered") {
        deliveredCount += 1;
        const subtotal = Number(shopOrder.subtotal || 0);
        totalRevenue += subtotal;
        if (order.createdAt && new Date(order.createdAt) >= startOfDay) {
          todayRevenue += subtotal;
        }
      }
    });

    return { totalRevenue, todayRevenue, deliveredCount };
  }, [ordersList, userData]);

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-3 sm:px-4 pb-28 md:pb-16'>
      <div className='w-full max-w-[800px] pt-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6 border-b border-amber-900/10 pb-4'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <button
              onClick={() => navigate("/")}
              className='p-1.5 rounded-full hover:bg-stone-200/60 transition cursor-pointer'
              title="Back"
            >
              <IoIosArrowRoundBack size={32} className='text-[#ff5200]' />
            </button>
            <h1 className='text-xl sm:text-2xl font-black text-stone-900'>
              {userData?.role === "owner" ? "Restaurant Orders & Revenue" : "My Orders"}
            </h1>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-xs text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh orders"
          >
            <FaRotateRight className={`${loading ? "animate-spin text-[#ff5200]" : "text-stone-500"}`} size={12} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Owner Total Earnings Summary Banner */}
        {userData?.role === "owner" && (
          <div className='bg-gradient-to-br from-stone-900 to-stone-950 rounded-3xl p-4 sm:p-6 shadow-xl mb-8 border border-stone-800 text-white space-y-4'>
            <div className='flex items-center justify-between border-b border-stone-800 pb-3'>
              <h2 className='text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2'>
                <FaWallet className="text-[#ff5200]" />
                <span>Restaurant Revenue Dashboard</span>
              </h2>
              <span className='text-[10px] sm:text-[11px] bg-stone-800 text-stone-300 px-2.5 sm:px-3 py-1 rounded-full font-bold'>
                Live Financials
              </span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1'>
              <div className='bg-stone-900/80 p-4 rounded-2xl border border-stone-800/80'>
                <p className='text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1'>Total Revenue</p>
                <p className='text-2xl font-black text-emerald-400'>₹{ownerEarnings.totalRevenue.toLocaleString()}</p>
                <p className='text-[10px] text-stone-500 mt-1'>From all delivered orders</p>
              </div>

              <div className='bg-stone-900/80 p-4 rounded-2xl border border-stone-800/80'>
                <p className='text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1'>Today's Revenue</p>
                <p className='text-2xl font-black text-amber-400'>₹{ownerEarnings.todayRevenue.toLocaleString()}</p>
                <p className='text-[10px] text-stone-500 mt-1'>Earnings generated today</p>
              </div>

              <div className='bg-stone-900/80 p-4 rounded-2xl border border-stone-800/80'>
                <p className='text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1'>Orders Completed</p>
                <p className='text-2xl font-black text-white'>{ownerEarnings.deliveredCount}</p>
                <p className='text-[10px] text-stone-500 mt-1'>Successfully delivered</p>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        <div className='space-y-6'>
          {loading && ordersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-[#ff5200] rounded-full animate-spin"></div>
              <p className="text-xs text-stone-500 font-medium">Fetching orders...</p>
            </div>
          ) : ordersList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-3">
              <FaBagShopping className="mx-auto text-3xl text-stone-400" />
              <p className="text-sm font-bold text-stone-700">No orders found</p>
              <p className="text-xs text-stone-500">When customers place orders with your kitchen, they will appear here live.</p>
              <button
                onClick={fetchOrders}
                className="mt-2 px-4 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
              >
                Check for new orders
              </button>
            </div>
          ) : (
            ordersList.map((order, index) => (
              userData?.role === "user" ? (
                <UserOrderCard data={order} key={order?._id || index} />
              ) : userData?.role === "owner" ? (
                <OwnerOrderCard data={order} key={order?._id || index} />
              ) : null
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MyOrders;
