import { test, describe } from "node:test";
import assert from "node:assert";
import { computeOrderSplit } from "../utils/orderSplit.js";

describe("computeOrderSplit unit tests", () => {
  test("computes split for a single shop with default 20% commission", () => {
    const orderData = {
      shopOrders: [
        {
          shop: "shop123",
          subtotal: 200,
          shopOrderItems: [{ price: 100, quantity: 2 }]
        }
      ]
    };

    const result = computeOrderSplit(orderData);

    assert.strictEqual(result.subtotal, 200);
    assert.strictEqual(result.commissionAmount, 40); // 20% of 200
    assert.strictEqual(result.restaurantPayout, 160); // 200 - 40
    assert.strictEqual(result.deliveryFee, 40); // subtotal <= 500
    assert.strictEqual(result.platformRevenue, 40);
  });

  test("applies free delivery when subtotal exceeds 500", () => {
    const orderData = {
      shopOrders: [
        {
          shop: "shopA",
          subtotal: 600,
          shopOrderItems: [{ price: 600, quantity: 1 }]
        }
      ]
    };

    const result = computeOrderSplit(orderData);

    assert.strictEqual(result.subtotal, 600);
    assert.strictEqual(result.deliveryFee, 0);
  });

  test("supports multiple shops with custom commission rates", () => {
    const orderData = {
      shopOrders: [
        { shop: "shop1", subtotal: 300 },
        { shop: "shop2", subtotal: 200 }
      ]
    };

    const customRates = {
      shop1: 15, // 15% of 300 = 45
      shop2: 25  // 25% of 200 = 50
    };

    const result = computeOrderSplit(orderData, customRates);

    assert.strictEqual(result.subtotal, 500);
    assert.strictEqual(result.commissionAmount, 95); // 45 + 50
    assert.strictEqual(result.restaurantPayout, 405); // (300-45) + (200-50) = 255 + 150 = 405
    assert.strictEqual(result.shopOrders[0].commissionRate, 15);
    assert.strictEqual(result.shopOrders[1].commissionRate, 25);
  });

  test("handles empty order data gracefully", () => {
    const result = computeOrderSplit({});

    assert.strictEqual(result.subtotal, 0);
    assert.strictEqual(result.commissionAmount, 0);
    assert.strictEqual(result.restaurantPayout, 0);
    assert.strictEqual(result.deliveryFee, 40);
  });
});
