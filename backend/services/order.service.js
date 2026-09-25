import { computeOrderSplit } from "../utils/orderSplit.js";

export const groupCartByShop = (cartItems) => {
  const grouped = {};
  cartItems.forEach((item) => {
    const shopId = item.shop;
    if (!grouped[shopId]) {
      grouped[shopId] = [];
    }
    grouped[shopId].push(item);
  });
  return grouped;
};

export const calculateShopOrderItems = (shop, items) => {
  const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0);
  const rate = shop.commissionRate || 20;
  const commissionAmount = Math.round((subtotal * (rate / 100)) * 100) / 100;
  const restaurantPayout = Math.round((subtotal - commissionAmount) * 100) / 100;

  return {
    shop: shop._id,
    owner: shop.owner._id,
    subtotal,
    commissionRate: rate,
    commissionAmount,
    restaurantPayout,
    settlementStatus: "unsettled",
    shopOrderItems: items.map((i) => ({
      item: i.id,
      price: i.price,
      quantity: i.quantity,
      name: i.name
    }))
  };
};

export const computeFinalSplit = (shopOrders, shopCommissionRates) => {
  return computeOrderSplit({ shopOrders }, shopCommissionRates);
};
