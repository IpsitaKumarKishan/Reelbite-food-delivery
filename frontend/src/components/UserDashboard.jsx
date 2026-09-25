import React, { useEffect, useRef, useState } from 'react';
import Nav from './Nav';
import { categories } from '../category';
import CategoryCard from './CategoryCard';
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";
import { FaStar, FaFilter, FaMotorcycle, FaTag, FaSearch } from "react-icons/fa";
import { useSelector } from 'react-redux';
import FoodCard from './FoodCard';
import RestaurantCard from './RestaurantCard';
import { useNavigate } from 'react-router-dom';
import ReelTeaserStrip from './ReelTeaserStrip';

function UserDashboard() {
  const { currentCity, shopInMyCity, itemsInMyCity, searchItems } = useSelector(state => state.user);
  const cateScrollRef = useRef();
  const shopScrollRef = useRef();
  const searchInputRef = useRef();
  const navigate = useNavigate();

  const [showLeftCateButton, setShowLeftCateButton] = useState(false);
  const [showRightCateButton, setShowRightCateButton] = useState(false);
  const [updatedItemsList, setUpdatedItemsList] = useState([]);
  const [filteredShopsList, setFilteredShopsList] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");

  // Filters state
  const [ratingFilter, setRatingFilter] = useState(false);
  const [vegFilter, setVegFilter] = useState(false);
  const [fastDeliveryFilter, setFastDeliveryFilter] = useState(false);

  useEffect(() => {
    setUpdatedItemsList(itemsInMyCity);
  }, [itemsInMyCity]);

  useEffect(() => {
    let shops = shopInMyCity ? [...shopInMyCity] : [];
    if (ratingFilter) {
      shops = shops.filter(s => (s.rating?.average || 4.2) >= 4.0);
    }
    setFilteredShopsList(shops);
  }, [shopInMyCity, ratingFilter]);

  const handleFilterByCategory = (category) => {
    setActiveCategory(category);
    if (category === "All") {
      setUpdatedItemsList(itemsInMyCity);
    } else {
      let filtered = itemsInMyCity?.filter(i => i.category === category);
      if (vegFilter) {
        filtered = filtered?.filter(i => i.foodType === "veg");
      }
      setUpdatedItemsList(filtered);
    }
  };

  const handleVegToggle = () => {
    const nextVeg = !vegFilter;
    setVegFilter(nextVeg);
    if (nextVeg) {
      const filtered = (activeCategory === "All" ? itemsInMyCity : itemsInMyCity?.filter(i => i.category === activeCategory))?.filter(i => i.foodType === "veg");
      setUpdatedItemsList(filtered);
    } else {
      handleFilterByCategory(activeCategory);
    }
  };

  const updateButton = (ref, setLeftButton, setRightButton) => {
    const element = ref.current;
    if (element) {
      setLeftButton(element.scrollLeft > 0);
      setRightButton(element.scrollLeft + element.clientWidth < element.scrollWidth);
    }
  };

  const scrollHandler = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === "left" ? -250 : 250,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (cateScrollRef.current) {
      updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton);
      const cateElem = cateScrollRef.current;
      const onCateScroll = () => updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton);
      cateElem?.addEventListener('scroll', onCateScroll);
      return () => cateElem?.removeEventListener('scroll', onCateScroll);
    }
  }, [categories]);

  return (
    <div className='w-full min-h-screen flex flex-col bg-[#f8f9fa] text-stone-900 font-sans pb-20 md:pb-12'>
      {/* Top Navbar */}
      <Nav />

      {/* Main Container - ultra-compact top spacing directly below fixed navbar */}
      <main className="pt-[68px] sm:pt-[76px] max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-4">

        {/* Search Results if any */}
        {searchItems && searchItems.length > 0 && (
          <section className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <span className="text-[#ff5200]">🔍</span>
              <span>Search Results for "{searchItems.length} items found"</span>
            </h2>
            <div className="flex flex-wrap gap-6 justify-center">
              {searchItems.map((item) => (
                <FoodCard data={item} key={item._id} />
              ))}
            </div>
          </section>
        )}

        {/* Cuisine / Category Scrollable Chip Row */}
        <section className="space-y-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">
            What's on your mind?
          </h2>

          <div className="relative">
            {showLeftCateButton && (
              <button
                className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white text-stone-800 p-2.5 rounded-full shadow-lg border border-stone-200 hover:bg-[#ff5200] hover:text-white z-10 transition"
                onClick={() => scrollHandler(cateScrollRef, "left")}
              >
                <FaCircleChevronLeft size={16} />
              </button>
            )}

            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-none snap-x" ref={cateScrollRef}>
              <button
                onClick={() => handleFilterByCategory("All")}
                className={`flex-none px-5 py-2.5 rounded-2xl font-bold text-xs transition border shadow-sm ${activeCategory === "All"
                    ? "bg-[#ff5200] text-white border-[#ff5200]"
                    : "bg-white text-stone-700 border-stone-200 hover:border-[#ff5200]"
                  }`}
              >
                All Cuisines
              </button>

              {categories.map((cate, index) => (
                <CategoryCard
                  name={cate.category}
                  image={cate.image}
                  key={index}
                  onClick={() => handleFilterByCategory(cate.category)}
                />
              ))}
            </div>

            {showRightCateButton && (
              <button
                className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white text-stone-800 p-2.5 rounded-full shadow-lg border border-stone-200 hover:bg-[#ff5200] hover:text-white z-10 transition"
                onClick={() => scrollHandler(cateScrollRef, "right")}
              >
                <FaCircleChevronRight size={16} />
              </button>
            )}
          </div>
        </section>

        {/* Reels Near You Strip */}
        <ReelTeaserStrip />

        {/* Filter & Sort Action Bar */}
        <section className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-200">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Restaurants in {currentCity || "City"}
            </h2>
            <p className="text-xs text-stone-500 font-medium">Explore top rated kitchens delivering near you</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Pure Veg Filter Chip */}
            <button
              onClick={handleVegToggle}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${vegFilter
                  ? "bg-emerald-700 text-white border-emerald-700 shadow"
                  : "bg-white text-stone-700 border-stone-300 hover:border-emerald-600"
                }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Pure Veg</span>
            </button>

            {/* Rating 4.0+ Chip */}
            <button
              onClick={() => setRatingFilter(!ratingFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${ratingFilter
                  ? "bg-[#ff5200] text-white border-[#ff5200] shadow"
                  : "bg-white text-stone-700 border-stone-300 hover:border-[#ff5200]"
                }`}
            >
              <FaStar className="text-yellow-400" size={12} />
              <span>Rating 4.0+</span>
            </button>

            {/* Fast Delivery Chip */}
            <button
              onClick={() => setFastDeliveryFilter(!fastDeliveryFilter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${fastDeliveryFilter
                  ? "bg-stone-900 text-white border-stone-900 shadow"
                  : "bg-white text-stone-700 border-stone-300 hover:border-stone-800"
                }`}
            >
              <FaMotorcycle size={14} />
              <span>Fast Delivery</span>
            </button>
          </div>
        </section>

        {/* Restaurant Listing Grid */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredShopsList && filteredShopsList.length > 0 ? (
              filteredShopsList.map((shop) => (
                <RestaurantCard
                  key={shop._id}
                  shop={shop}
                  onClick={() => navigate(`/shop/${shop._id}`)}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-stone-500 text-sm">
                No restaurants found matching your filters in {currentCity || "your area"}.
              </div>
            )}
          </div>
        </section>

        {/* Popular Food Items Section */}
        <section className="space-y-4 pt-6 border-t border-stone-200">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Popular Dishes Near You
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {updatedItemsList && updatedItemsList.length > 0 ? (
              updatedItemsList.map((item, index) => (
                <FoodCard key={index} data={item} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-stone-500 text-sm">
                No food items found for this selection.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default UserDashboard;
