/**
 * Recommendation Engine – Scoring Configuration
 *
 * All magic numbers for the getAllReels scoring formula live here.
 * Tune these values without touching controller logic.
 */

const RECOMMENDATION_WEIGHTS = {
  // ─── Interaction Weights ───────────────────────────────────────────────────
  // Applied when building categoryAffinity / shopAffinity from a user's
  // ReelInteraction history.
  interaction: {
    addedToCart: 10,      // strongest positive signal
    likedOrShared: 5,     // explicit positive engagement
    highWatch: 3,         // watched > HIGH_WATCH_THRESHOLD %
    negativeSignal: -3,   // skipped OR watched < LOW_WATCH_THRESHOLD %
    default: 1,           // neutral watch with no special signal
  },

  // Watch-percentage thresholds that determine which weight bucket is used.
  watchThresholds: {
    high: 70,  // watchPercentage > this  → highWatch weight
    low: 15,   // watchPercentage < this  → negativeSignal weight (if also skipped)
  },

  // ─── Time-Decay ────────────────────────────────────────────────────────────
  // Older interactions contribute less via Math.exp(-ageInDays / HALF_LIFE_DAYS).
  // At ageInDays = HALF_LIFE_DAYS the contribution is ~37% of the original weight.
  decay: {
    halfLifeDays: 10,
  },

  // ─── Affinity Scoring Multipliers ──────────────────────────────────────────
  // Used when converting raw affinity scores into a per-reel affinityScore.
  affinity: {
    categoryMultiplier: 1.5,
    shopMultiplier: 1.0,
  },

  // ─── Popularity Scoring ────────────────────────────────────────────────────
  popularity: {
    likesMultiplier: 3,
    viewsMultiplier: 0.5,
  },

  // ─── Recency Boost ─────────────────────────────────────────────────────────
  recency: {
    baseBoost: 50,       // max recency boost (applied to brand-new reels)
    decayPerHour: 0.5,   // boost decreases by this amount each hour
  },

  // ─── Final Score Multipliers ───────────────────────────────────────────────
  // Relative weighting of each sub-score in the final composite.
  finalScore: {
    // Personalised path (hasSufficientHistory = true)
    personalised: {
      affinityMultiplier: 4,
      popularityMultiplier: 1.5,
    },
    // Cold-start path (hasSufficientHistory = false)
    coldStart: {
      popularityMultiplier: 3,
      // Modest seed added to categoryAffinity for each category the user
      // selected during onboarding. Enough to surface preferred categories
      // above unrelated reels, but not so large it overrides popularity.
      preferenceSeed: 5,
    },
    // Session-level skip penalty: subtracted from finalScore when a reel's
    // category appears in the request's penalizedCategories list.
    // Keeps penalised reels visible but pushes them lower in the feed.
    skipPenalty: 30,
  },

  // ─── Exploration / Diversity ───────────────────────────────────────────────
  exploration: {
    // 1 exploration slot every N feed positions (e.g. 5 → 20%)
    slotInterval: 5,

    // How many top-affinity categories to rotate across for "exploit" slots.
    topCategoriesCount: 3,
  },
};

export default RECOMMENDATION_WEIGHTS;
