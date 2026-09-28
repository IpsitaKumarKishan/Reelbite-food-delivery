import axios from 'axios';
import React from 'react';
import { FaMinus, FaPlus } from "react-icons/fa";
import { CiTrash } from "react-icons/ci";
import { useDispatch } from 'react-redux';
import { removeCartItem, setCartItems, updateQuantity } from '../redux/userSlice';
import { serverUrl } from '../App';

function CartItemCard({ data }) {
  const dispatch = useDispatch();
  const itemId = String(data?.id || data?._id || (data?.item && (data.item._id || data.item)) || "").trim();

  const handleIncrease = async (currentQty) => {
    if (!itemId) return;
    const newQty = (Number(currentQty) || 1) + 1;
    dispatch(updateQuantity({ id: itemId, quantity: newQty }));
    try {
      await axios.put(
        `${serverUrl}/api/user/cart/update`,
        { itemId, quantity: newQty },
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Increase cart qty error:", err);
    }
  };

  const handleDecrease = async (currentQty) => {
    if (!itemId) return;
    const newQty = (Number(currentQty) || 1) - 1;
    if (newQty <= 0) {
      handleRemove();
      return;
    }
    dispatch(updateQuantity({ id: itemId, quantity: newQty }));
    try {
      await axios.put(
        `${serverUrl}/api/user/cart/update`,
        { itemId, quantity: newQty },
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Decrease cart qty error:", err);
    }
  };

  const handleRemove = async () => {
    if (!itemId) return;
    // Remove specifically this item from Redux immediately
    dispatch(removeCartItem(itemId));
    try {
      await axios.delete(
        `${serverUrl}/api/user/cart/remove/${itemId}`,
        { withCredentials: true }
      );
    } catch (err) {
      console.error("Remove cart item error:", err);
    }
  };

  return (
    <div className='flex items-center justify-between bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-stone-200/80 gap-3'>
      <div className='flex items-center gap-3 sm:gap-4 min-w-0'>
        <img src={data.image} alt={data.name || "Food"} className='w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-stone-100 shrink-0' />
        <div className='min-w-0'>
          <h1 className='font-bold text-stone-900 text-sm sm:text-base truncate'>{data.name}</h1>
          <p className='text-xs text-stone-500'>₹{data.price} x {data.quantity}</p>
          <p className="font-extrabold text-[#ff5200] text-sm sm:text-base">₹{data.price * data.quantity}</p>
        </div>
      </div>
      <div className='flex items-center gap-1.5 sm:gap-3 shrink-0'>
        <button
          className='w-7 h-7 flex items-center justify-center cursor-pointer bg-stone-100 rounded-full hover:bg-stone-200 text-stone-700 transition'
          onClick={() => handleDecrease(data.quantity)}
        >
          <FaMinus size={10} />
        </button>
        <span className="font-bold text-stone-900 text-xs sm:text-sm px-1">{data.quantity}</span>
        <button
          className='w-7 h-7 flex items-center justify-center cursor-pointer bg-stone-100 rounded-full hover:bg-stone-200 text-stone-700 transition'
          onClick={() => handleIncrease(data.quantity)}
        >
          <FaPlus size={10} />
        </button>
        <button
          className="p-1.5 sm:p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 cursor-pointer ml-1 transition"
          onClick={handleRemove}
          title="Remove item"
        >
          <CiTrash size={17} />
        </button>
      </div>
    </div>
  );
}

export default CartItemCard
