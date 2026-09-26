/**
 * Heuristic Recommendation Engine for Reelbite Food Delivery
 * No Machine Learning required - uses deterministic scoring, time-of-day slots,
 * and user behavioral affinities.
 */

/**
 * Returns current meal slot based on server hour (0 - 23)
 */
export const getMealTimeSlot = (customHour = null) => {
  const hour = customHour !== null ? customHour : new Date().getHours();

  if (hour >= 6 && hour < 11) {
    return {
      slot: "breakfast",
      title: "Rise & Shine Breakfast",
      subtitle: "Fresh morning bites, steaming tea & wholesome starters",
      icon: "☀️",
      categories: ["South Indian", "Sandwiches", "Fast Food", "Others"]
    };
  } else if (hour >= 11 && hour < 16) {
    return {
      slot: "lunch",
      title: "Lunch Feasts & Thalis",
      subtitle: "Hearty main courses and delicious meals to power your day",
      icon: "🍛",
      categories: ["Main Course", "North Indian", "South Indian", "Chinese", "Fast Food"]
    };
  } else if (hour >= 16 && hour < 19) {
    return {
      slot: "snacks",
      title: "Chai & Evening Snacks",
      subtitle: "Crispy bites, warm beverages & sweet treats",
      icon: "☕",
      categories: ["Snacks", "Fast Food", "Burgers", "Sandwiches", "Desserts"]
    };
  } else if (hour >= 19 && hour < 23) {
    return {
      slot: "dinner",
      title: "Dinner Specials",
      subtitle: "Satisfying meals, gourmet pizzas & comfort food",
      icon: "🍽️",
      categories: ["Main Course", "Pizza", "North Indian", "Chinese", "Burgers", "South Indian"]
    };
  } else {
    return {
      slot: "late_night",
      title: "Late Night Munchies",
      subtitle: "Midnight cravings, sizzling snacks & quick desserts",
      icon: "🌙",
      categories: ["Fast Food", "Burgers", "Pizza", "Desserts", "Snacks", "Sandwiches"]
    };
  }
};

/**
 * Calculates a recommendation score (0 - 100) for a food item
 * @param {Object} item - Item document
 * @param {Object} user - User document
 * @param {Object} userAffinities - { categoryCounts, shopCounts } from user's past orders
 * @param {Array<string>} timeSlotCategories - Categories relevant to current hour
 */
export const calculateRecommendationScore = (item, user, userAffinities = {}, timeSlotCategories = []) => {
  let score = 0;

  // 1. Mandatory Diet Check
  if (user?.dietPreference === "veg" && item.foodType !== "veg") {
    return -1; // Disqualified
  }

  // 2. User Explicit Onboarding Cuisines (+30 pts)
  if (user?.preferredCuisines && user.preferredCuisines.includes(item.category)) {
    score += 30;
  }

  // 3. Time-of-day Slot Alignment (+25 pts)
  if (timeSlotCategories.includes(item.category)) {
    score += 25;
  }

  // 4. Past Order Category Frequency (+20 pts max)
  const categoryFreq = userAffinities.categoryCounts?.[item.category] || 0;
  score += Math.min(20, categoryFreq * 5);

  // 5. Past Order Favorite Shop Affinity (+10 pts)
  const shopIdStr = item.shop?._id ? item.shop._id.toString() : item.shop?.toString();
  if (shopIdStr && userAffinities.shopCounts?.[shopIdStr]) {
    score += Math.min(10, userAffinities.shopCounts[shopIdStr] * 3);
  }

  // 6. Item Quality / Rating (+15 pts max)
  const avgRating = item.rating?.average || 4.0;
  score += (avgRating / 5.0) * 15;

  return Math.round(score);
};
