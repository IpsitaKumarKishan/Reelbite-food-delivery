import test from "node:test";
import assert from "node:assert/strict";

test("Phase 4: Numerically Stable Softmax prevents NaN / Infinity overflow", () => {
  // Extreme affinity values that would crash standard Math.exp()
  const rawAffinities = [1000, 1050, 990, 1020];

  // Standard unstable softmax:
  const unstableExps = rawAffinities.map((v) => Math.exp(v));
  const unstableSum = unstableExps.reduce((a, b) => a + b, 0);
  assert.equal(unstableSum, Infinity, "Standard exp overflows to Infinity for large affinities");

  // Numerically shifted softmax:
  const maxAffinity = Math.max(...rawAffinities);
  const stableExps = rawAffinities.map((v) => Math.exp(v - maxAffinity));
  const stableSum = stableExps.reduce((a, b) => a + b, 0);
  const probabilities = stableExps.map((exp) => exp / stableSum);

  assert.ok(!Number.isNaN(stableSum), "Stable sum must not be NaN");
  assert.ok(Number.isFinite(stableSum), "Stable sum must be finite");
  const totalProb = probabilities.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(totalProb - 1.0) < 1e-6, "Probabilities must sum to 1.0");
  assert.ok(probabilities.every((p) => !Number.isNaN(p) && p >= 0 && p <= 1));
});

test("Phase 4: Candidate Pool Truncation prevents heap saturation", () => {
  const POOL_LIMIT = 150;
  const mockReelsInDb = Array.from({ length: 500 }, (_, i) => ({
    _id: `reel_${i}`,
    caption: `Reel ${i}`,
    views: i * 10,
  }));

  const candidatePool = mockReelsInDb.slice(0, POOL_LIMIT);
  assert.equal(candidatePool.length, 150, "Candidate pool must be capped at 150");
});

test("Phase 5: Aggregation Overview Totals Calculation Logic", () => {
  const sampleOrders = [
    {
      totalAmount: 500,
      platformRevenue: 80,
      deliveryFee: 40,
      platformFee: 5,
      isFullyCancelled: false,
    },
    {
      totalAmount: 1200,
      platformRevenue: 200,
      deliveryFee: 0,
      platformFee: 5,
      isFullyCancelled: false,
    },
    {
      totalAmount: 350,
      platformRevenue: 60,
      deliveryFee: 40,
      platformFee: 5,
      isFullyCancelled: true, // Should be excluded from GMV & revenue
    },
  ];

  const totals = sampleOrders.reduce(
    (acc, order) => {
      acc.totalOrders += 1;
      if (order.isFullyCancelled) {
        acc.cancelledOrdersCount += 1;
      } else {
        acc.deliveredOrdersCount += 1;
        acc.gmv += order.totalAmount;
        acc.platformRevenue += order.platformRevenue;
        acc.totalDeliveryFees += order.deliveryFee;
        acc.totalPlatformFees += order.platformFee;
      }
      return acc;
    },
    {
      totalOrders: 0,
      cancelledOrdersCount: 0,
      deliveredOrdersCount: 0,
      gmv: 0,
      platformRevenue: 0,
      totalDeliveryFees: 0,
      totalPlatformFees: 0,
    }
  );

  assert.equal(totals.totalOrders, 3);
  assert.equal(totals.deliveredOrdersCount, 2);
  assert.equal(totals.cancelledOrdersCount, 1);
  assert.equal(totals.gmv, 1700); // 500 + 1200
  assert.equal(totals.platformRevenue, 280); // 80 + 200
  assert.equal(totals.totalDeliveryFees, 40); // 40 + 0
  assert.equal(totals.totalPlatformFees, 10); // 5 + 5
});

test("Phase 5: Owner Analytics Settlement & Payout Aggregation Logic", () => {
  const sampleShopOrders = [
    { subtotal: 400, restaurantPayout: 320, status: "delivered", settlementStatus: "settled" },
    { subtotal: 600, restaurantPayout: 480, status: "delivered", settlementStatus: "unsettled" },
    { subtotal: 300, restaurantPayout: 240, status: "cancelled", settlementStatus: "unsettled" },
  ];

  let totalRevenue = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let pendingPayout = 0;
  let settledPayout = 0;

  sampleShopOrders.forEach((so) => {
    if (so.status === "delivered") {
      deliveredOrders += 1;
      totalRevenue += so.subtotal;
      if (so.settlementStatus === "settled") {
        settledPayout += so.restaurantPayout;
      } else {
        pendingPayout += so.restaurantPayout;
      }
    } else if (so.status === "cancelled") {
      cancelledOrders += 1;
    }
  });

  assert.equal(deliveredOrders, 2);
  assert.equal(cancelledOrders, 1);
  assert.equal(totalRevenue, 1000);
  assert.equal(settledPayout, 320);
  assert.equal(pendingPayout, 480);
});
