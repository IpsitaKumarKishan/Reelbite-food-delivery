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
 * Calculates a recommendation score (0 - 100) and tasteMatchPercent for a food item
 * @param {Object} item - Item document
 * @param {Object} user - User document
 * @param {Object} userAffinities - { categoryCounts, shopCounts } from user's past orders
 * @param {Array<string>} timeSlotCategories - Categories relevant to current hour
 */
export const calculateRecommendationScore = (item, user, userAffinities = {}, timeSlotCategories = []) => {
  let score = 0;
  const foodPrefs = user?.foodPreferences || {};
  const userDiet = foodPrefs.dietType || user?.dietPreference || "all";
  const userSpice = foodPrefs.spiceLevel || "medium";
  const userFlavors = Array.isArray(foodPrefs.flavorTags) ? foodPrefs.flavorTags : [];
  const userAllergies = Array.isArray(foodPrefs.allergies) ? foodPrefs.allergies : [];

  // 1. Mandatory Diet Check
  if (userDiet === "veg" && item.foodType !== "veg") {
    return -1; // Disqualified
  }
  if (userDiet === "vegan") {
    const isItemVegan = item.tasteProfile?.isVegan || (item.foodType === "veg" && !/paneer|cheese|butter|curd|milk|ghee/i.test(item.name || ""));
    if (!isItemVegan) return -1;
  }
  if (userDiet === "jain") {
    const isItemJain = item.tasteProfile?.isJainFriendly || (item.foodType === "veg" && !/onion|garlic|potato|root/i.test(item.name || ""));
    if (!isItemJain) return -1;
  }

  // 1b. Allergy Safety Check: Penalize items that match user allergies
  if (userAllergies.length > 0) {
    const itemText = `${item.name || ""} ${item.category || ""} ${(item.tasteProfile?.flavorTags || []).join(" ")}`.toLowerCase();
    const hasAllergen = userAllergies.some(allergy => {
      const lower = allergy.toLowerCase();
      if (lower === "peanuts" || lower === "nuts") return /nut|peanut|kaju|badam/i.test(itemText);
      if (lower === "dairy") return /milk|cheese|paneer|butter|cream|curd|ghee/i.test(itemText);
      if (lower === "gluten") return /bread|naan|roti|wheat|flour|maida/i.test(itemText);
      return itemText.includes(lower);
    });
    if (hasAllergen) return -1; // Exclude allergen-conflicting dishes
  }

  // 2. User Explicit Onboarding Cuisines (+25 pts)
  if (user?.preferredCuisines && user.preferredCuisines.includes(item.category)) {
    score += 25;
  }

  // 3. Spice Level Affinity (+20 pts)
  const itemSpice = item.tasteProfile?.spiceLevel || "medium";
  if (itemSpice === userSpice) {
    score += 20;
  } else if (
    (userSpice === "mild" && itemSpice === "medium") ||
    (userSpice === "extra-spicy" && itemSpice === "spicy") ||
    (userSpice === "medium" && (itemSpice === "mild" || itemSpice === "spicy"))
  ) {
    score += 10;
  }

  // 4. Flavor Tag Affinity (+15 pts max)
  const itemFlavors = item.tasteProfile?.flavorTags || [];
  if (userFlavors.length > 0 && itemFlavors.length > 0) {
    const matchingFlavors = itemFlavors.filter(f => userFlavors.includes(f));
    score += Math.min(15, matchingFlavors.length * 8);
  }

  // 5. Time-of-day Slot Alignment (+18 pts)
  if (timeSlotCategories.includes(item.category)) {
    score += 18;
  }

  // 6. Past Order Category Frequency (+12 pts max)
  const categoryFreq = userAffinities.categoryCounts?.[item.category] || 0;
  score += Math.min(12, categoryFreq * 4);

  // 7. Past Order Favorite Shop Affinity (+10 pts)
  const shopIdStr = item.shop?._id ? item.shop._id.toString() : item.shop?.toString();
  if (shopIdStr && userAffinities.shopCounts?.[shopIdStr]) {
    score += Math.min(10, userAffinities.shopCounts[shopIdStr] * 3);
  }

  // 8. Item Quality / Rating (+10 pts max)
  const avgRating = item.rating?.average || 4.0;
  score += (avgRating / 5.0) * 10;

  return Math.min(100, Math.round(score));
};

