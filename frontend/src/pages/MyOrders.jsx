import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaWallet, FaBagShopping, FaChartLine } from "react-icons/fa6";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { setMyOrders, updateRealtimeOrderStatus } from '../redux/userSlice';
import { useSocket } from '../context/SocketContext';

function MyOrders() {
  const { userData, myOrders } = useSelector(state => state.user);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    socket?.on('newOrder', (data) => {
      if (data.shopOrders?.owner._id === userData?._id) {
        dispatch(setMyOrders([data, ...(myOrders || [])]));
      }
    });

    socket?.on('update-status', ({ orderId, shopId, status, userId }) => {
      if (userId === userData?._id) {
        dispatch(updateRealtimeOrderStatus({ orderId, shopId, status }));
      }
    });

    return () => {
      socket?.off('newOrder');
      socket?.off('update-status');
    };
  }, [socket, userData, myOrders, dispatch]);

  // Calculate earnings for Restaurant Owner
  const ownerEarnings = useMemo(() => {
    if (!myOrders || userData?.role !== "owner") {
      return { totalRevenue: 0, todayRevenue: 0, deliveredCount: 0 };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let totalRevenue = 0;
    let todayRevenue = 0;
    let deliveredCount = 0;

    myOrders.forEach((order) => {
      const shopOrder = order.shopOrders;
      if (shopOrder && shopOrder.status === "delivered") {
        deliveredCount += 1;
        const subtotal = Number(shopOrder.subtotal || 0);
        totalRevenue += subtotal;
        if (new Date(order.createdAt) >= startOfDay) {
          todayRevenue += subtotal;
        }
      }
    });

    return { totalRevenue, todayRevenue, deliveredCount };
  }, [myOrders, userData]);

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4 pb-24 md:pb-16'>
      <div className='w-full max-w-[800px] pt-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6 border-b border-amber-900/10 pb-4'>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => navigate("/")}
              className='p-1.5 rounded-full hover:bg-stone-200/60 transition'
            >
              <IoIosArrowRoundBack size={32} className='text-[#ff5200]' />
            </button>
            <h1 className='text-2xl font-black text-stone-900'>
              {userData?.role === "owner" ? "Restaurant Orders & Revenue" : "My Orders"}
            </h1>
          </div>
        </div>

        {/* Owner Total Earnings Summary Banner */}
        {userData?.role === "owner" && (
          <div className='bg-gradient-to-br from-stone-900 to-stone-950 rounded-3xl p-6 shadow-xl mb-8 border border-stone-800 text-white space-y-4'>
            <div className='flex items-center justify-between border-b border-stone-800 pb-3'>
              <h2 className='text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2'>
                <FaWallet className="text-[#ff5200]" />
                <span>Restaurant Revenue Dashboard</span>
              </h2>
              <span className='text-[11px] bg-stone-800 text-stone-300 px-3 py-1 rounded-full font-bold'>
                Live Financials
              </span>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1'>
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
          {myOrders?.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-2">
              <FaBagShopping className="mx-auto text-3xl text-stone-400" />
              <p className="text-sm font-bold text-stone-700">No orders found</p>
            </div>
          ) : (
            myOrders?.map((order, index) => (
              userData?.role === "user" ? (
                <UserOrderCard data={order} key={index} />
              ) : userData?.role === "owner" ? (
                <OwnerOrderCard data={order} key={index} />
              ) : null
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MyOrders;
