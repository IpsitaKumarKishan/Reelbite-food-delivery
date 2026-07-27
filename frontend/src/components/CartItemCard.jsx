import axios from 'axios';
import React from 'react';
import { FaMinus, FaPlus } from "react-icons/fa";
import { CiTrash } from "react-icons/ci";
import { useDispatch } from 'react-redux';
import { removeCartItem, setCartItems, updateQuantity } from '../redux/userSlice';
import { serverUrl } from '../App';

function CartItemCard({ data }) {
  const dispatch = useDispatch();

  const handleIncrease = async (id, currentQty) => {
    const newQty = currentQty + 1;
    dispatch(updateQuantity({ id, quantity: newQty }));
    try {
      const res = await axios.put(
        `${serverUrl}/api/user/cart/update`,
        { itemId: id, quantity: newQty },
        { withCredentials: true }
      );
      if (res.data) dispatch(setCartItems(res.data));
    } catch (err) {
      console.error("Increase cart qty error:", err);
    }
  };

  const handleDecrease = async (id, currentQty) => {
    const newQty = currentQty - 1;
    dispatch(updateQuantity({ id, quantity: newQty }));
    try {
      const res = await axios.put(
        `${serverUrl}/api/user/cart/update`,
        { itemId: id, quantity: newQty },
        { withCredentials: true }
      );
      if (res.data) dispatch(setCartItems(res.data));
    } catch (err) {
      console.error("Decrease cart qty error:", err);
    }
  };

  const handleRemove = async (id) => {
    dispatch(removeCartItem(id));
    try {
      const res = await axios.delete(
        `${serverUrl}/api/user/cart/remove/${id}`,
        { withCredentials: true }
      );
      if (res.data) dispatch(setCartItems(res.data));
    } catch (err) {
      console.error("Remove cart item error:", err);
    }
  };

  return (
    <div className='flex items-center justify-between bg-white p-4 rounded-xl shadow border'>
      <div className='flex items-center gap-4'>
        <img src={data.image} alt="" className='w-20 h-20 object-cover rounded-lg border' />
        <div>
          <h1 className='font-medium text-gray-800'>{data.name}</h1>
          <p className='text-sm text-gray-500'>₹{data.price} x {data.quantity}</p>
          <p className="font-bold text-gray-900">₹{data.price * data.quantity}</p>
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <button className='p-2 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200' onClick={() => handleDecrease(data.id, data.quantity)}>
          <FaMinus size={12} />
        </button>
        <span>{data.quantity}</span>
        <button className='p-2 cursor-pointer bg-gray-100 rounded-full hover:bg-gray-200' onClick={() => handleIncrease(data.id, data.quantity)}>
          <FaPlus size={12} />
        </button>
        <button className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
          onClick={() => handleRemove(data.id)}>
          <CiTrash size={18} />
        </button>
      </div>
    </div>
  );
}

export default CartItemCard
