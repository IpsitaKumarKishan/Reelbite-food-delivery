import React, { useEffect, useState, useMemo, useRef } from 'react';
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
import FoodPreferencesModal from './modals/FoodPreferencesModal';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';


function UserDashboard() {
  const { currentCity, shopInMyCity, itemsInMyCity, searchItems, userData } = useSelector(state => state.user);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [isTasteModalOpen, setIsTasteModalOpen] = useState(false);
  const palateScrollRef = useRef(null);

  const scrollPalate = (direction) => {
    if (palateScrollRef.current) {
      palateScrollRef.current.scrollBy({
        left: direction === "left" ? -320 : 320,
        behavior: "smooth"
      });
    }
  };


  // Hook for personalized recommendations (Order Again & Time of Day)
  const { orderAgain, timeSlot, forYou } = useGetRecommendations();

  // Multi-facet filter state
  const [filters, setFilters] = useState({
    vegOnly: userData?.dietPreference === "veg",
    minRating: null,
    priceBracket: "all",
    tasteTag: "all",
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
      tasteTag: "all",
      sortBy: "relevance"
    });
    setActiveCategory("All");
  };

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.vegOnly && userData?.dietPreference !== "veg") ||
      filters.minRating !== null ||
      filters.priceBracket !== "all" ||
      (filters.tasteTag && filters.tasteTag !== "all") ||
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

    // Taste & Craving Tag filter
    if (filters.tasteTag && filters.tasteTag !== "all") {
      list = list.filter(i => {
        const itemFlavorTags = (i.tasteProfile?.flavorTags || []).map(t => t.toLowerCase());
        const itemSpice = (i.tasteProfile?.spiceLevel || "").toLowerCase();
        const itemText = `${i.name || ""} ${i.category || ""}`.toLowerCase();

        switch (filters.tasteTag) {
          case "spicy":
            return ["spicy", "extra-spicy"].includes(itemSpice) ||
              itemFlavorTags.some(t => t.includes("spicy") || t.includes("masala") || t.includes("fiery")) ||
              /spicy|chilli|mirch|masala|schezwan|tikka|peri peri|tadka|curry/i.test(itemText);
          case "cheesy":
            return itemFlavorTags.some(t => t.includes("cheesy") || t.includes("cheese")) ||
              /cheese|cheesy|mozzarella|pizza|burger|fondue/i.test(itemText);
          case "crispy":
            return itemFlavorTags.some(t => t.includes("crispy") || t.includes("crunchy")) ||
              /crisp|crispy|fried|fry|crunchy|pakoda|nugget|roast|dosa/i.test(itemText);
          case "tangy":
            return itemFlavorTags.some(t => t.includes("tangy") || t.includes("chatpata")) ||
              /tangy|chatpata|chaat|lemon|chutney|pani puri|sev|kachori|samosa/i.test(itemText);
          case "creamy":
            return itemFlavorTags.some(t => t.includes("creamy") || t.includes("makhani")) ||
              /cream|creamy|malai|makhani|butter|paneer butter|korma|gravy/i.test(itemText);
          case "smoky":
            return itemFlavorTags.some(t => t.includes("smoky") || t.includes("tandoori")) ||
              /tandoor|tandoori|smoky|barbeque|bbq|tikka|kebab|charcoal/i.test(itemText);
          case "sweet":
            return ["desserts", "sweets", "bakery", "beverages"].includes((i.category || "").toLowerCase()) ||
              itemFlavorTags.some(t => t.includes("sweet")) ||
              /sweet|cake|ice cream|shake|halwa|gulab jamun|brownie|dessert|chocolate/i.test(itemText);
          case "protein":
            return itemFlavorTags.some(t => t.includes("protein")) ||
              /protein|paneer|chicken|egg|fish|soya|tofu|dal|mutton/i.test(itemText);
          case "light":
            return itemFlavorTags.some(t => t.includes("light")) ||
              /salad|soup|khichdi|steamed|idli|sprouts|boiled|plain/i.test(itemText);
          default:
            return true;
        }
      });
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

  // Compute curated palate items (combines backend forYou or client heuristic scoring)
  const curatedPalateItems = useMemo(() => {
    if (forYou && forYou.length > 0) return forYou;
    if (!itemsInMyCity || itemsInMyCity.length === 0) return [];

    const userPrefs = userData?.foodPreferences || {};
    const userDiet = userPrefs.dietType || userData?.dietPreference || "all";
    const userSpice = userPrefs.spiceLevel || "medium";
    const userFlavors = Array.isArray(userPrefs.flavorTags) ? userPrefs.flavorTags : [];

    let candidates = [...itemsInMyCity];
    if (["veg", "vegan", "jain"].includes(userDiet)) {
      candidates = candidates.filter(i => i.foodType === "veg");
    }

    return candidates
      .map(item => {
        let affinity = 72;
        const itemSpice = item.tasteProfile?.spiceLevel || "medium";
        if (itemSpice === userSpice) affinity += 14;
        const itemFlavors = item.tasteProfile?.flavorTags || [];
        const matches = itemFlavors.filter(f => userFlavors.includes(f));
        affinity += Math.min(10, matches.length * 5);
        const rating = item.rating?.average || 4.0;
        affinity += Math.round((rating / 5) * 4);
        return {
          ...item,
          tasteMatchPercent: Math.min(99, affinity)
        };
      })
      .sort((a, b) => (b.tasteMatchPercent || 0) - (a.tasteMatchPercent || 0))
      .slice(0, 8);
  }, [forYou, itemsInMyCity, userData]);

  // Compute filtered shops
  const filteredShops = useMemo(() => {
    let shops = shopInMyCity ? [...shopInMyCity] : [];

    if (filters.minRating) {
      shops = shops.filter(s => (s.rating?.average || 4.2) >= filters.minRating);
    }

    return shops;
  }, [shopInMyCity, filters.minRating]);


  return (
    <div className='w-full min-h-screen flex flex-col bg-[#f8f9fa] text-stone-900 font-sans pb-28 md:pb-12'>
      {/* Top Navbar */}
      <Nav />

      {/* Main Container */}
      <main className="pt-[68px] sm:pt-[76px] max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 space-y-6">

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

        {/* Module 1.3: Curated For Your Palate (Taste & Preference Matched) */}
        {curatedPalateItems && curatedPalateItems.length > 0 && (
          <section className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-orange-200/80 p-4 sm:p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                    Curated For Your Palate
                  </h2>
                  {userData?.foodPreferences?.spiceLevel && (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white text-stone-800 border border-stone-200 shadow-xs flex items-center gap-1">
                      <span>{userData.foodPreferences.spiceLevel === "extra-spicy" ? "🔥" : userData.foodPreferences.spiceLevel === "spicy" ? "🌶️" : "🟡"}</span>
                      <span className="capitalize">{userData.foodPreferences.spiceLevel}</span>
                    </span>
                  )}
                  {userData?.foodPreferences?.dietType && userData.foodPreferences.dietType !== "all" && (
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🌱 {userData.foodPreferences.dietType.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 font-medium mt-0.5">
                  Dishes handpicked to match your saved taste profile, diet choices & preferred spices
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTasteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⚙️</span>
                  <span>Tune Palate</span>
                </button>

                {/* Left and Right navigation buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => scrollPalate("left")}
                    className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 shadow-xs flex items-center justify-center transition cursor-pointer hover:border-[#ff5200] hover:text-[#ff5200] active:scale-95"
                    aria-label="Scroll left"
                    title="Previous dishes"
                  >
                    <FaChevronLeft size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollPalate("right")}
                    className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 shadow-xs flex items-center justify-center transition cursor-pointer hover:border-[#ff5200] hover:text-[#ff5200] active:scale-95"
                    aria-label="Scroll right"
                    title="Next dishes"
                  >
                    <FaChevronRight size={11} />
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Scroll Carousel with side buttons */}
            <div className="relative group/palate">
              {/* Floating Left Button */}
              <button
                type="button"
                onClick={() => scrollPalate("left")}
                className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-stone-800 border border-stone-200 shadow-lg items-center justify-center z-10 transition-all duration-200 hover:bg-[#ff5200] hover:text-white hover:scale-105 cursor-pointer opacity-0 group-hover/palate:opacity-100"
                aria-label="Scroll left"
              >
                <FaChevronLeft size={11} />
              </button>

              <div
                ref={palateScrollRef}
                className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin scroll-smooth"
              >
                {curatedPalateItems.map((item) => (
                  <div key={item._id} className="shrink-0 w-[240px] sm:w-[260px]">
                    <FoodCard data={item} />
                  </div>
                ))}
              </div>

              {/* Floating Right Button */}
              <button
                type="button"
                onClick={() => scrollPalate("right")}
                className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-stone-800 border border-stone-200 shadow-lg items-center justify-center z-10 transition-all duration-200 hover:bg-[#ff5200] hover:text-white hover:scale-105 cursor-pointer opacity-0 group-hover/palate:opacity-100"
                aria-label="Scroll right"
              >
                <FaChevronRight size={11} />
              </button>
            </div>
          </section>
        )}


        {/* Reels Near You Strip */}
        <ReelTeaserStrip />


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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
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

        {/* Module 1.2: Faceted Filter Toolbar */}
        <SearchFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          itemCount={filteredItems.length}
        />


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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
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

      {/* Food Preferences Modal */}
      <FoodPreferencesModal
        isOpen={isTasteModalOpen}
        onClose={() => setIsTasteModalOpen(false)}
      />
    </div>
  );
}

export default UserDashboard;

