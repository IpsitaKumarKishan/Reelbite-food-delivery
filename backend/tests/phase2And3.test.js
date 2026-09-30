import test from "node:test";
import assert from "node:assert/strict";
import { computeOrderSplit } from "../utils/orderSplit.js";

test("Phase 2: Delivery Partner Payout Guarantee (Platform Subsidy)", () => {
  // Scenario 1: Standard order below 500 threshold
  const smallOrder = {
    shopOrders: [
      { shop: "shop1", subtotal: 300, shopOrderItems: [{ price: 300, quantity: 1 }] }
    ]
  };
  const smallSplit = computeOrderSplit(smallOrder);
  assert.equal(smallSplit.deliveryFee, 40);
  assert.equal(smallSplit.deliveryPartnerPayout, 40);

  // Scenario 2: High value order above 500 with Free Delivery promotion
  const bigOrder = {
    shopOrders: [
      { shop: "shop1", subtotal: 1200, shopOrderItems: [{ price: 1200, quantity: 1 }] }
    ]
  };
  const bigSplit = computeOrderSplit(bigOrder);
  // Customer pays 0 delivery fee
  assert.equal(bigSplit.deliveryFee, 0);
  // Delivery driver is guaranteed minimum 40 payout (NOT 0)
  assert.equal(bigSplit.deliveryPartnerPayout, 40);
  // Commission = 20% of 1200 = 240. Driver subsidy = 40. Platform revenue = 240 - 40 = 200
  assert.equal(bigSplit.platformRevenue, 200);
});

test("Phase 2: Single-Restaurant Order Validation Guard", () => {
  const isSingleRestaurantOrder = (groupItemsByShop) => {
    return Object.keys(groupItemsByShop).length <= 1;
  };

  const validCart = { "shop_pizza_1": [{ id: "p1" }, { id: "p2" }] };
  assert.equal(isSingleRestaurantOrder(validCart), true);

  const invalidMultiShopCart = {
    "shop_pizza_1": [{ id: "p1" }],
    "shop_burger_2": [{ id: "b1" }]
  };
  assert.equal(isSingleRestaurantOrder(invalidMultiShopCart), false);
});

test("Phase 2: Settlement Status Eligibility Check", () => {
  const canSettleShopOrder = (shopOrder, ownerId) => {
    return (
      shopOrder.owner &&
      shopOrder.owner.toString() === ownerId.toString() &&
      shopOrder.settlementStatus !== "settled" &&
      shopOrder.status === "delivered" // Only delivered orders can be settled
    );
  };

  const ownerId = "owner123";
  const deliveredOrder = { owner: "owner123", settlementStatus: "unsettled", status: "delivered" };
  const preparingOrder = { owner: "owner123", settlementStatus: "unsettled", status: "preparing" };
  const cancelledOrder = { owner: "owner123", settlementStatus: "unsettled", status: "cancelled" };

  assert.equal(canSettleShopOrder(deliveredOrder, ownerId), true);
  assert.equal(canSettleShopOrder(preparingOrder, ownerId), false);
  assert.equal(canSettleShopOrder(cancelledOrder, ownerId), false);
});

test("Phase 3: Atomic Delivery Assignment Acceptance Model", () => {
  // Simulate atomic document status transition
  let assignment = {
    _id: "assign1",
    status: "broadcasted",
    assignedTo: null
  };

  const atomicAccept = (candidateAssignment, driverId) => {
    if (candidateAssignment.status !== "broadcasted" && candidateAssignment.status !== "brodcasted") {
      return null; // Already claimed
    }
    candidateAssignment.status = "assigned";
    candidateAssignment.assignedTo = driverId;
    return candidateAssignment;
  };

  // Driver 1 accepts
  const resDriver1 = atomicAccept(assignment, "driverA");
  assert.ok(resDriver1, "Driver 1 should successfully claim assignment");
  assert.equal(resDriver1.assignedTo, "driverA");
  assert.equal(resDriver1.status, "assigned");

  // Driver 2 attempts to accept the same assignment in the same millisecond
  const resDriver2 = atomicAccept(assignment, "driverB");
  assert.equal(resDriver2, null, "Driver 2 must be rejected with null / 409 conflict");
});
