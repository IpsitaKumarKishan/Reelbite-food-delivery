import React, { useRef, useState, useEffect } from "react";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";
import FoodCard from "./FoodCard";

export default function TimeSlotCarousel({ timeSlot }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

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
  }, [timeSlot]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  if (!timeSlot || !timeSlot.items || timeSlot.items.length === 0) return null;

  return (
    <section className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>{timeSlot.icon}</span>
            <span>{timeSlot.title}</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium">{timeSlot.subtitle}</p>
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
          className="flex overflow-x-auto gap-5 pb-3 pt-1 scrollbar-none snap-x scroll-smooth"
        >
          {timeSlot.items.map((item) => (
            <div key={item._id} className="flex-none snap-start">
              <FoodCard data={item} />
            </div>
          ))}
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
