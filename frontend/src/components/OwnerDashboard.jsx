import React, { useState, useEffect } from 'react'
import Nav from './NaV.JSX'
import { useSelector } from 'react-redux'
import { FaUtensils, FaPen, FaWallet, FaCheckCircle, FaClock, FaReceipt } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import OwnerItemCard from './ownerItemCard';
import axios from 'axios';
import { serverUrl } from '../App';

function OwnerDashboard() {
  const { myShopData } = useSelector(state => state.owner)
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState("menu") // "menu" | "earnings"
  const [earningsData, setEarningsData] = useState(null)
  const [loadingEarnings, setLoadingEarnings] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [settling, setSettling] = useState(false)
  const [settleMessage, setSettleMessage] = useState("")

  useEffect(() => {
    if (myShopData && activeTab === "earnings") {
      fetchEarnings()
    }
  }, [myShopData, activeTab])

  const fetchEarnings = async () => {
    try {
      setLoadingEarnings(true)
      const res = await axios.get(`${serverUrl}/api/payouts/owner`, { withCredentials: true })
      setEarningsData(res.data)
    } catch (err) {
      console.error("Failed to fetch earnings:", err)
    } finally {
      setLoadingEarnings(false)
    }
  }

  const toggleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const handleSelectAllUnsettled = () => {
    if (!earningsData?.orders) return
    const unsettledIds = earningsData.orders
      .filter(o => o.settlementStatus === "unsettled")
      .map(o => o.orderId)
    
    if (selectedOrders.length === unsettledIds.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(unsettledIds)
    }
  }

  const handleSettle = async () => {
    if (selectedOrders.length === 0) return
    try {
      setSettling(true)
      setSettleMessage("")
      await axios.post(
        `${serverUrl}/api/payouts/settle`,
        { orderIds: selectedOrders },
        { withCredentials: true }
      )
      setSettleMessage("Orders successfully marked as settled & Payout logged!")
      setSelectedOrders([])
      fetchEarnings()
    } catch (err) {
      setSettleMessage(err.response?.data?.message || "Failed to settle orders")
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex flex-col items-center pb-16'>
      <Nav />
      {!myShopData &&
        <div className='flex justify-center items-center p-4 sm:p-6 mt-6'>
          <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your Restaurant</h2>
              <p className='text-gray-600 mb-4 text-sm sm:text-base'>Join our food delivery platform and reach thousands of hungry customers every day.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={() => navigate("/create-edit-shop")}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      }

      {myShopData &&
        <div className='w-full flex flex-col items-center gap-6 px-4 sm:px-6 max-w-4xl'>
          <h1 className='text-2xl sm:text-3xl text-gray-900 flex items-center gap-3 mt-8 text-center'>
            <FaUtensils className='text-[#ff4d2d] w-10 h-10' />
            <span>Welcome to {myShopData.name}</span>
          </h1>

          {/* Restaurant Header Card */}
          <div className='bg-white shadow-lg rounded-xl overflow-hidden border border-orange-100 hover:shadow-2xl transition-all duration-300 w-full relative'>
            <div className='absolute top-4 right-4 bg-[#ff4d2d] text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors cursor-pointer' onClick={() => navigate("/create-edit-shop")}>
              <FaPen size={18} />
            </div>
            <img src={myShopData.image} alt={myShopData.name} className='w-full h-48 sm:h-60 object-cover' />
            <div className='p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div>
                <h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-1'>{myShopData.name}</h1>
                <p className='text-gray-500 text-sm'>{myShopData.city}, {myShopData.state}</p>
                <p className='text-gray-500 text-xs mt-1'>{myShopData.address}</p>
              </div>
              <div className='bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl text-center'>
                <span className='text-xs text-orange-600 font-bold block uppercase tracking-wider'>Commission Rate</span>
                <span className='text-lg font-black text-gray-900'>{myShopData.commissionRate || 20}%</span>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className='flex gap-2 bg-stone-200/80 p-1.5 rounded-2xl w-full max-w-md justify-center font-bold text-sm'>
            <button
              onClick={() => setActiveTab("menu")}
              className={`flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === "menu"
                  ? "bg-white text-[#ff4d2d] shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FaUtensils />
              <span>Menu Items ({myShopData.items.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex-1 py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 ${
                activeTab === "earnings"
                  ? "bg-white text-[#ff4d2d] shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <FaWallet />
              <span>Earnings & Payouts</span>
            </button>
          </div>

          {/* TAB 1: MENU ITEMS */}
          {activeTab === "menu" && (
            <div className='w-full flex flex-col items-center gap-4'>
              {myShopData.items.length === 0 ? (
                <div className='flex justify-center items-center p-4 sm:p-6 w-full'>
                  <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
                    <div className='flex flex-col items-center text-center'>
                      <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
                      <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your Food Item</h2>
                      <p className='text-gray-600 mb-4 text-sm sm:text-base'>
                        Share your delicious creations with our customers by adding them to the menu.
                      </p>
                      <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={() => navigate("/add-item")}>
                        Add Food
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center gap-4 w-full'>
                  {myShopData.items.map((item, index) => (
                    <OwnerItemCard data={item} key={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EARNINGS & PAYOUTS */}
          {activeTab === "earnings" && (
            <div className='w-full space-y-6'>
              {loadingEarnings ? (
                <div className='py-12 text-center text-gray-500 font-medium'>
                  Loading earnings details...
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                    <div className='bg-white border border-amber-200 p-5 rounded-2xl shadow-sm space-y-1'>
                      <div className='flex items-center justify-between text-amber-600 text-xs font-bold uppercase tracking-wider'>
                        <span>Unsettled Payout</span>
                        <FaClock size={16} />
                      </div>
                      <p className='text-2xl font-black text-gray-900'>
                        ₹{earningsData?.summary?.totalUnsettledPayout || 0}
                      </p>
                      <p className='text-[11px] text-gray-500'>Pending settlement to bank</p>
                    </div>

                    <div className='bg-white border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-1'>
                      <div className='flex items-center justify-between text-emerald-600 text-xs font-bold uppercase tracking-wider'>
                        <span>Settled Payout</span>
                        <FaCheckCircle size={16} />
                      </div>
                      <p className='text-2xl font-black text-gray-900'>
                        ₹{earningsData?.summary?.totalSettledPayout || 0}
                      </p>
                      <p className='text-[11px] text-gray-500'>Cleared & transferred</p>
                    </div>

                    <div className='bg-white border border-rose-200 p-5 rounded-2xl shadow-sm space-y-1'>
                      <div className='flex items-center justify-between text-rose-600 text-xs font-bold uppercase tracking-wider'>
                        <span>Commission Paid</span>
                        <FaReceipt size={16} />
                      </div>
                      <p className='text-2xl font-black text-gray-900'>
                        ₹{earningsData?.summary?.totalCommissionDeducted || 0}
                      </p>
                      <p className='text-[11px] text-gray-500'>Platform revenue ({myShopData.commissionRate || 20}%)</p>
                    </div>
                  </div>

                  {/* Settlement Action Banner */}
                  {settleMessage && (
                    <div className='p-4 bg-orange-100 border border-orange-300 text-orange-900 rounded-xl text-xs font-bold flex justify-between items-center'>
                      <span>{settleMessage}</span>
                      <button onClick={() => setSettleMessage("")} className='font-black'>&times;</button>
                    </div>
                  )}

                  {/* Settlement Action Bar */}
                  <div className='bg-white border border-gray-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm'>
                    <div className='flex items-center gap-3 text-xs font-bold text-gray-700'>
                      <button
                        onClick={handleSelectAllUnsettled}
                        className='bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg border text-gray-800 transition'
                      >
                        Select All Unsettled
                      </button>
                      <span>Selected: {selectedOrders.length} orders</span>
                    </div>
                    <button
                      onClick={handleSettle}
                      disabled={settling || selectedOrders.length === 0}
                      className='w-full sm:w-auto bg-[#ff4d2d] hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow'
                    >
                      <FaCheckCircle />
                      <span>{settling ? "Processing..." : "Mark Selected as Settled"}</span>
                    </button>
                  </div>

                  {/* Order Earnings Table */}
                  <div className='bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm'>
                    <div className='p-4 border-b border-gray-100 flex items-center justify-between'>
                      <h3 className='font-bold text-gray-800 text-sm'>Order Commission Breakdown</h3>
                      <span className='text-xs text-gray-500'>Total Orders: {earningsData?.orders?.length || 0}</span>
                    </div>

                    {(!earningsData?.orders || earningsData.orders.length === 0) ? (
                      <div className='py-12 text-center text-gray-400 text-xs font-medium'>
                        No orders recorded yet.
                      </div>
                    ) : (
                      <div className='overflow-x-auto'>
                        <table className='w-full text-left border-collapse text-xs'>
                          <thead>
                            <tr className='bg-gray-50 border-b border-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[11px]'>
                              <th className='p-3 text-center'>Select</th>
                              <th className='p-3'>Order Date</th>
                              <th className='p-3'>Food Subtotal</th>
                              <th className='p-3'>Commission ({myShopData.commissionRate || 20}%)</th>
                              <th className='p-3'>Net Payout</th>
                              <th className='p-3 text-center'>Status</th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-gray-100 text-gray-700'>
                            {earningsData.orders.map((o) => {
                              const isSelected = selectedOrders.includes(o.orderId);
                              return (
                                <tr key={o.orderId} className='hover:bg-orange-50/50 transition'>
                                  <td className='p-3 text-center'>
                                    {o.settlementStatus === "unsettled" ? (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectOrder(o.orderId)}
                                        className="rounded text-[#ff4d2d] focus:ring-[#ff4d2d] cursor-pointer"
                                      />
                                    ) : (
                                      <span className="text-emerald-500 font-bold">&check;</span>
                                    )}
                                  </td>
                                  <td className='p-3 font-medium'>
                                    <div>{new Date(o.createdAt).toLocaleDateString()}</div>
                                    <div className='text-[10px] text-gray-400'>#{o.orderId.slice(-6)}</div>
                                  </td>
                                  <td className='p-3 font-semibold'>₹{o.subtotal}</td>
                                  <td className='p-3 text-rose-600 font-semibold'>-₹{o.commissionAmount}</td>
                                  <td className='p-3 text-emerald-700 font-bold text-sm'>₹{o.restaurantPayout}</td>
                                  <td className='p-3 text-center'>
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                        o.settlementStatus === "settled"
                                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : "bg-amber-100 text-amber-800 border border-amber-200"
                                      }`}
                                    >
                                      {o.settlementStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      }
    </div>
  )
}

export default OwnerDashboard
