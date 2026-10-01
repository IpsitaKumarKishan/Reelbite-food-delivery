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
        <div className='min-w-0 flex-1'>
          <h1 className='font-bold text-stone-900 text-sm sm:text-base truncate'>{data.name}</h1>
          <p className='text-xs text-stone-500'>₹{data.price} x {data.quantity}</p>
          <p className="font-extrabold text-[#ff5200] text-sm sm:text-base">₹{data.price * data.quantity}</p>

          {/* Customization Details */}
          {data.customization && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {data.customization.spiceLevel && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 ${
                  data.customization.spiceLevel === "extra-spicy"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : data.customization.spiceLevel === "spicy"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : data.customization.spiceLevel === "mild"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  <span>{data.customization.spiceLevel === "extra-spicy" ? "🔥" : data.customization.spiceLevel === "spicy" ? "🌶️" : "🟡"}</span>
                  <span className="capitalize">{data.customization.spiceLevel}</span>
                </span>
              )}
              {data.customization.cookingStyle && data.customization.cookingStyle !== "Chef's Special" && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                  {data.customization.cookingStyle}
                </span>
              )}
              {Array.isArray(data.customization.addons) && data.customization.addons.map((add, idx) => (
                <span key={idx} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  +{add}
                </span>
              ))}
              {data.customization.notes && (
                <p className="text-[10px] italic text-stone-500 w-full truncate mt-0.5">
                  📝 "{data.customization.notes}"
                </p>
              )}
            </div>
          )}
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
