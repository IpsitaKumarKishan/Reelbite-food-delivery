import React, { useState } from 'react';
import { FaLeaf, FaDrumstickBite, FaStar, FaRegStar, FaMinus, FaPlus, FaShoppingCart } from "react-icons/fa";
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../redux/userSlice';

function FoodCard({ data }) {
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatch();
  const { cartItems } = useSelector(state => state.user);

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

  const isAlreadyInCart = cartItems.some(i => i.id === data._id);

  return (
    <div className='w-full max-w-[260px] rounded-3xl border border-amber-500/20 bg-white shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col overflow-hidden group'>
      
      {/* Image container */}
      <div className='relative w-full h-[180px] bg-stone-100 overflow-hidden'>
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
      <div className="flex-1 flex flex-col p-4 space-y-2">
        <h3 className='font-bold text-stone-900 text-base truncate group-hover:text-[#ea580c] transition'>
          {data.name}
        </h3>

        <div className='flex items-center gap-1.5'>
          <div className="flex items-center gap-0.5">{renderStars(data.rating?.average || 4)}</div>
          <span className='text-[11px] font-semibold text-stone-500'>
            ({data.rating?.count || 12})
          </span>
        </div>
      </div>

      {/* Price and Cart Controller */}
      <div className='flex items-center justify-between p-4 pt-0 mt-auto'>
        <span className='font-black text-stone-900 text-lg'>
          ₹{data.price}
        </span>

        <div className='flex items-center bg-stone-100 border border-stone-200 rounded-full overflow-hidden shadow-inner p-0.5'>
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
            className={`ml-1 px-3 py-1.5 rounded-full text-white text-xs font-bold transition flex items-center gap-1 shadow ${
              isAlreadyInCart
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#ea580c] hover:bg-[#c2410c]"
            }`}
            onClick={() => {
              dispatch(
                addToCart({
                  id: data._id,
                  name: data.name,
                  price: data.price,
                  image: data.image,
                  shop: data.shop,
                  quantity,
                  foodType: data.foodType,
                })
              );
            }}
          >
            <FaShoppingCart size={12} />
            <span>{isAlreadyInCart ? "Added" : "Add"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
