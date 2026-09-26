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
    <div className='flex items-center justify-between bg-white p-4 rounded-xl shadow border'>
      <div className='flex items-center gap-4'>
        <img src={data.image} alt={data.name || "Food"} className='w-20 h-20 object-cover rounded-lg border' />
        <div>
          <h1 className='font-medium text-gray-800'>{data.name}</h1>
          <p className='text-sm text-gray-500'>₹{data.price} x {data.quantity}</p>
          <p className="font-bold text-gray-900">₹{data.price * data.quantity}</p>
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <button
          className='p-2 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200'
          onClick={() => handleDecrease(data.quantity)}
        >
          <FaMinus size={12} />
        </button>
        <span className="font-semibold text-gray-800">{data.quantity}</span>
        <button
          className='p-2 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200'
          onClick={() => handleIncrease(data.quantity)}
        >
          <FaPlus size={12} />
        </button>
        <button
          className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 cursor-pointer"
          onClick={handleRemove}
        >
          <CiTrash size={18} />
        </button>
      </div>
    </div>
  );
}

export default CartItemCard
