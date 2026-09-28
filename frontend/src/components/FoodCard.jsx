import React, { useState } from 'react';
import { FaLeaf, FaDrumstickBite, FaStar, FaRegStar, FaMinus, FaPlus, FaShoppingCart, FaStore } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/userSlice';
import axios from 'axios';
import { serverUrl } from '../App';

function FoodCard({ data }) {
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatch();
  const { cartItems, shopInMyCity } = useSelector(state => state.user);

  // Safely extract shopId and owner shop name
  const shopId = (typeof data.shop === 'object' && data.shop?._id)
    ? data.shop._id
    : (typeof data.shop === 'string' ? data.shop : null);

  const matchedShop = shopInMyCity?.find(s => s._id === shopId);
  const shopName = (typeof data.shop === 'object' && data.shop?.name)
    ? data.shop.name
    : (matchedShop?.name || data.shopName || "Restaurant");

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? (
          <FaStar key={i} className='text-amber-500 text-xs' />
        ) : (
          <FaRegStar key={i} className='text-amber-300 text-xs' />
        )
      );
    }
    return stars;
  };

  const handleIncrease = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecrease = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const isAlreadyInCart = cartItems.some(i => (i.id || i._id) === data._id);

  const handleAddToCart = async () => {
    dispatch(
      addToCart({
        id: data._id,
        _id: data._id,
        name: data.name,
        price: data.price,
        image: data.image,
        shop: shopId || data.shop,
        quantity,
        foodType: data.foodType,
      })
    );
    try {
      await axios.post(
        `${serverUrl}/api/user/cart/add`,
        { itemId: data._id, quantity },
        { withCredentials: true }
      );
    } catch (e) {
      // Redux retains the item for client session
    }
  };

  return (
    <div className='w-full max-w-[320px] sm:max-w-[270px] rounded-3xl border border-amber-500/20 bg-white shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group mx-auto sm:mx-0'>
      
      {/* Image container */}
      <div className='relative w-full h-[160px] sm:h-[180px] bg-stone-100 overflow-hidden'>
        <div className='absolute top-3 right-3 bg-white/90 backdrop-blur-md rounded-full p-1.5 shadow-md z-10'>
          {data.foodType === "veg" ? (
            <FaLeaf className='text-emerald-600 text-sm' title="Vegetarian" />
          ) : (
            <FaDrumstickBite className='text-red-600 text-sm' title="Non-Vegetarian" />
          )}
        </div>

        <img
          src={data.image}
          alt={data.name}
          className='w-full h-full object-cover group-hover:scale-108 transition-transform duration-500'
        />
      </div>

      {/* Item info */}
      <div className="flex-1 flex flex-col p-4 space-y-1.5">
        <h3 className='font-bold text-stone-900 text-base truncate group-hover:text-[#ea580c] transition'>
          {data.name}
        </h3>

        {/* Owner Shop Name (Clickable link redirecting to the shop page) */}
        <div className="flex items-center min-w-0">
          {shopId ? (
            <Link
              to={`/shop/${shopId}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#ea580c] transition-colors truncate max-w-full group/shop"
              title={`Visit ${shopName}`}
            >
              <FaStore className="text-stone-400 group-hover/shop:text-[#ea580c] text-[11px] shrink-0 transition-colors" />
              <span className="truncate hover:underline underline-offset-2">{shopName}</span>
            </Link>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 truncate">
              <FaStore className="text-stone-400 text-[11px] shrink-0" />
              <span className="truncate">{shopName}</span>
            </div>
          )}
        </div>

        <div className='flex items-center gap-1.5 pt-0.5'>
          <div className="flex items-center gap-0.5">{renderStars(data.rating?.average || 4)}</div>
          <span className='text-[11px] font-semibold text-stone-500'>
            ({data.rating?.count || 12})
          </span>
        </div>
      </div>

      {/* Price and Cart Controller */}
      <div className='flex items-center justify-between p-4 pt-0 mt-auto gap-2'>
        <span className='font-black text-stone-900 text-base sm:text-lg shrink-0'>
          ₹{data.price}
        </span>

        <div className='flex items-center bg-stone-100 border border-stone-200 rounded-full overflow-hidden shadow-inner p-0.5 shrink-0'>
          <button
            className='w-7 h-7 flex items-center justify-center hover:bg-stone-200 text-stone-700 rounded-full transition text-xs'
            onClick={handleDecrease}
          >
            <FaMinus size={10} />
          </button>
          <span className="px-2 text-xs font-bold text-stone-900">{quantity}</span>
          <button
            className='w-7 h-7 flex items-center justify-center hover:bg-stone-200 text-stone-700 rounded-full transition text-xs'
            onClick={handleIncrease}
          >
            <FaPlus size={10} />
          </button>

          <button
            className={`ml-1 px-2.5 sm:px-3 py-1.5 rounded-full text-white text-xs font-bold transition flex items-center gap-1 shadow shrink-0 ${
              isAlreadyInCart
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#ea580c] hover:bg-[#c2410c]"
            }`}
            onClick={handleAddToCart}
          >
            <FaShoppingCart size={11} />
            <span>{isAlreadyInCart ? "Added" : "Add"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
