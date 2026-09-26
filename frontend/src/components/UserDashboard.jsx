import React, { useEffect, useState, useMemo } from 'react';
import Nav from './Nav';
import { useSelector } from 'react-redux';
import FoodCard from './FoodCard';
import RestaurantCard from './RestaurantCard';
import { useNavigate } from 'react-router-dom';
import ReelTeaserStrip from './ReelTeaserStrip';
import useGetRecommendations from '../hooks/useGetRecommendations';
import OrderAgainCarousel from './OrderAgainCarousel';
import TimeSlotCarousel from './TimeSlotCarousel';
import SearchFilterBar from './SearchFilterBar';

function UserDashboard() {
  const { currentCity, shopInMyCity, itemsInMyCity, searchItems, userData } = useSelector(state => state.user);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");

  // Hook for personalized recommendations (Order Again & Time of Day)
  const { orderAgain, timeSlot, forYou } = useGetRecommendations();

  // Multi-facet filter state
  const [filters, setFilters] = useState({
    vegOnly: userData?.dietPreference === "veg",
    minRating: null,
    priceBracket: "all",
    sortBy: "relevance"
  });

  // Keep vegOnly in sync if user changes profile diet preference
  useEffect(() => {
    if (userData?.dietPreference === "veg") {
      setFilters(prev => ({ ...prev, vegOnly: true }));
    }
  }, [userData?.dietPreference]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      vegOnly: userData?.dietPreference === "veg",
      minRating: null,
      priceBracket: "all",
      sortBy: "relevance"
    });
    setActiveCategory("All");
  };

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.vegOnly && userData?.dietPreference !== "veg") ||
      filters.minRating !== null ||
      filters.priceBracket !== "all" ||
      filters.sortBy !== "relevance" ||
      activeCategory !== "All"
    );
  }, [filters, activeCategory, userData?.dietPreference]);

  // Compute filtered & sorted items
  const filteredItems = useMemo(() => {
    let list = itemsInMyCity ? [...itemsInMyCity] : [];

    // Category filter
    if (activeCategory !== "All") {
      list = list.filter(i => i.category === activeCategory);
    }

    // Pure Veg filter
    if (filters.vegOnly) {
      list = list.filter(i => i.foodType === "veg");
    }

    // Min Rating filter
    if (filters.minRating) {
      list = list.filter(i => (i.rating?.average || 4.0) >= filters.minRating);
    }

    // Price Bracket filter
    if (filters.priceBracket === "under150") {
      list = list.filter(i => i.price <= 150);
    } else if (filters.priceBracket === "150to300") {
      list = list.filter(i => i.price > 150 && i.price <= 300);
    } else if (filters.priceBracket === "above300") {
      list = list.filter(i => i.price > 300);
    }

    // Sorting
    if (filters.sortBy === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === "rating_desc") {
      list.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    }

    return list;
  }, [itemsInMyCity, activeCategory, filters]);

  // Compute filtered shops
  const filteredShops = useMemo(() => {
    let shops = shopInMyCity ? [...shopInMyCity] : [];

    if (filters.minRating) {
      shops = shops.filter(s => (s.rating?.average || 4.2) >= filters.minRating);
    }

    return shops;
  }, [shopInMyCity, filters.minRating]);

  return (
    <div className='w-full min-h-screen flex flex-col bg-[#f8f9fa] text-stone-900 font-sans pb-20 md:pb-12'>
      {/* Top Navbar */}
      <Nav />

      {/* Main Container */}
      <main className="pt-[68px] sm:pt-[76px] max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Search Results (if user is typing in Nav) */}
        {searchItems && searchItems.length > 0 && (
          <section className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm space-y-4">
            <h2 className="text-xl font-extrabold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <span className="text-[#ff5200]">🔍</span>
              <span>Search Results ({searchItems.length} items found)</span>
            </h2>
            <div className="flex flex-wrap gap-6 justify-center">
              {searchItems.map((item) => (
                <FoodCard data={item} key={item._id} />
              ))}
            </div>
          </section>
        )}

        {/* Module 1.1: Order Again Carousel (if user has previous orders) */}
        {orderAgain && orderAgain.length > 0 && (
          <OrderAgainCarousel items={orderAgain} />
        )}

        {/* Module 1.1: Time-of-Day Dynamic Carousel (e.g. Breakfast, Lunch, Snacks, Dinner, Late Night) */}
        {timeSlot && timeSlot.items?.length > 0 && (
          <TimeSlotCarousel timeSlot={timeSlot} />
        )}

        {/* Reels Near You Strip */}
        <ReelTeaserStrip />

        {/* Module 1.2: Faceted Filter Toolbar */}
        <SearchFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          itemCount={filteredItems.length}
        />

        {/* Restaurant Listing Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Top Restaurants in {currentCity || "your city"}
              </h2>
              <p className="text-xs text-stone-500 font-medium">Explore top-rated kitchens delivering fresh food</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredShops && filteredShops.length > 0 ? (
              filteredShops.map((shop) => (
                <RestaurantCard
                  key={shop._id}
                  shop={shop}
                  onClick={() => navigate(`/shop/${shop._id}`)}
                />
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-stone-500 text-sm">
                No restaurants found matching your criteria in {currentCity || "your area"}.
              </div>
            )}
          </div>
        </section>

        {/* Popular Dishes / Filtered Food Grid Section */}
        <section className="space-y-4 pt-4 border-t border-stone-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {activeCategory !== "All" ? `${activeCategory} Specials` : "Popular Dishes Near You"}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Showing {filteredItems.length} dishes
                {filters.vegOnly ? " (Pure Veg)" : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredItems && filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <FoodCard key={item._id || index} data={item} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-stone-500 text-sm bg-white rounded-2xl border border-stone-200 w-full">
                No food items found matching your current filter selection.
                <button
                  onClick={handleResetFilters}
                  className="block mx-auto mt-2 text-[#ff5200] font-bold text-xs underline cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default UserDashboard;
