import React, { useRef, useState, useEffect } from "react";
import { FaCircleChevronLeft, FaCircleChevronRight, FaLeaf, FaDrumstickBite, FaRotateRight, FaPlus, FaCheck } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/userSlice";
import axios from "axios";
import { serverUrl } from "../App";
import toast from "react-hot-toast";

export default function OrderAgainCarousel({ items = [] }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.user);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll);
    return () => el?.removeEventListener("scroll", checkScroll);
  }, [items]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -280 : 280,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  const handleReorder = async (item) => {
    dispatch(
      addToCart({
        id: item._id,
        _id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        shop: item.shop?._id || item.shop,
        quantity: 1,
        foodType: item.foodType,
      })
    );
    toast.success(`Added ${item.name} to cart!`);
    try {
      await axios.post(
        `${serverUrl}/api/user/cart/add`,
        { itemId: item._id, quantity: 1 },
        { withCredentials: true }
      );
    } catch (e) {}
  };

  return (
    <section className="space-y-3.5 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#ff5200]">
            <FaRotateRight className="animate-spin-slow text-sm" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
              Order Again
            </h2>
            <p className="text-xs text-stone-500 font-medium">Your frequently ordered favorites</p>
          </div>
        </div>
      </div>

      <div className="relative group">
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white text-stone-800 p-2.5 rounded-full shadow-xl border border-stone-200 hover:bg-[#ff5200] hover:text-white z-10 transition-all duration-200"
            aria-label="Scroll left"
          >
            <FaCircleChevronLeft size={16} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 pb-2 scrollbar-none snap-x scroll-smooth"
        >
          {items.map((item) => {
            const inCart = cartItems.some((c) => c.id === item._id);

            return (
              <div
                key={item._id}
                className="flex-none w-[220px] sm:w-[240px] bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="relative w-full h-[125px] rounded-xl overflow-hidden bg-stone-100 mb-2.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md rounded-full p-1 shadow-sm">
                      {item.foodType === "veg" ? (
                        <FaLeaf className="text-emerald-600 text-xs" />
                      ) : (
                        <FaDrumstickBite className="text-red-600 text-xs" />
                      )}
                    </div>
                    {item.reorderStats?.timesOrdered > 1 && (
                      <span className="absolute bottom-2 right-2 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        Ordered {item.reorderStats.timesOrdered}x
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm truncate mb-0.5" title={item.name}>
                    {item.name}
                  </h3>
                  <p className="text-xs text-stone-500 truncate mb-2">
                    {item.shop?.name || "Local Kitchen"}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="font-extrabold text-stone-900 text-sm">₹{item.price}</span>
                  <button
                    onClick={() => handleReorder(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                      inCart
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-[#ff5200] text-white hover:bg-[#e04800]"
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
                        <span>Reorder</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white text-stone-800 p-2.5 rounded-full shadow-xl border border-stone-200 hover:bg-[#ff5200] hover:text-white z-10 transition-all duration-200"
            aria-label="Scroll right"
          >
            <FaCircleChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
