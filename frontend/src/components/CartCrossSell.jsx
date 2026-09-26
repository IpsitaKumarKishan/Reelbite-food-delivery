import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../App";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/userSlice";
import { FaLeaf, FaDrumstickBite, FaPlus, FaCheck, FaUtensils } from "react-icons/fa6";
import toast from "react-hot-toast";

export default function CartCrossSell() {
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.user);
  const [crossSells, setCrossSells] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setCrossSells([]);
      return;
    }

    const itemIds = cartItems.map((c) => c.id).filter(Boolean);
    if (itemIds.length === 0) return;

    let isMounted = true;
    const fetchCrossSells = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${serverUrl}/api/recommendations/cart-cross-sells?itemIds=${itemIds.join(",")}`,
          { withCredentials: true }
        );

        if (isMounted && res.data?.success) {
          // Exclude any items that are already in the cart
          const filtered = (res.data.crossSells || []).filter(
            (item) => !cartItems.some((c) => c.id === item._id)
          );
          setCrossSells(filtered);
        }
      } catch (err) {
        console.error("Failed to load cross-sells:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCrossSells();
    return () => {
      isMounted = false;
    };
  }, [cartItems]);

  if (!crossSells || crossSells.length === 0) return null;

  const handleAdd = (item) => {
    dispatch(
      addToCart({
        id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        shop: item.shop?._id || item.shop,
        quantity: 1,
        foodType: item.foodType,
      })
    );
    toast.success(`Added ${item.name} to cart!`);
  };

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 mt-6">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[#ff5200]">
          <FaUtensils size={12} />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900">Complete Your Meal</h3>
          <p className="text-xs text-stone-500">Popular dishes customers frequently add with your order</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {crossSells.map((item) => {
          const inCart = cartItems.some((c) => c.id === item._id);

          return (
            <div
              key={item._id}
              className="flex items-center justify-between p-3 rounded-xl border border-stone-100 hover:border-orange-200 bg-stone-50/50 hover:bg-white transition-all shadow-2xs group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute top-1 left-1 bg-white/90 backdrop-blur-xs rounded-full p-0.5 shadow-2xs">
                    {item.foodType === "veg" ? (
                      <FaLeaf className="text-emerald-600 text-[10px]" />
                    ) : (
                      <FaDrumstickBite className="text-red-600 text-[10px]" />
                    )}
                  </div>
                </div>

                <div className="overflow-hidden">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 truncate">{item.shop?.name || item.category}</p>
                  <span className="text-xs font-black text-stone-900">₹{item.price}</span>
                </div>
              </div>

              <button
                onClick={() => handleAdd(item)}
                disabled={inCart}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                  inCart
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : "bg-[#ff5200] hover:bg-[#e04800] text-white shadow-xs"
                }`}
              >
                {inCart ? (
                  <>
                    <FaCheck size={10} />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <FaPlus size={10} />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
