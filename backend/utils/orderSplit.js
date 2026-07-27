/**
 * Utility function to compute money split for an order.
 * Calculates subtotal, commissionAmount, restaurantPayout, deliveryPartnerPayout, platformRevenue.
 */
export const computeOrderSplit = (orderData, shopCommissionRates = {}) => {
  const shopOrders = orderData.shopOrders || [];
  
  let totalSubtotal = 0;
  let totalCommissionAmount = 0;
  let totalRestaurantPayout = 0;

  const updatedShopOrders = shopOrders.map((so) => {
    const shopIdStr = (so.shop && (so.shop._id || so.shop)) ? (so.shop._id || so.shop).toString() : "";
    const rate = shopCommissionRates[shopIdStr] || so.commissionRate || 20;
    
    const items = so.shopOrderItems || [];
    const subtotal = Number(so.subtotal) > 0 
      ? Number(so.subtotal) 
      : items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      
    const commissionAmount = Math.round((subtotal * (rate / 100)) * 100) / 100;
    const restaurantPayout = Math.round((subtotal - commissionAmount) * 100) / 100;

    totalSubtotal += subtotal;
    totalCommissionAmount += commissionAmount;
    totalRestaurantPayout += restaurantPayout;

    const rawShopOrder = typeof so.toObject === 'function' ? so.toObject() : so;

    return {
      ...rawShopOrder,
      subtotal,
      commissionRate: rate,
      commissionAmount,
      restaurantPayout,
      settlementStatus: rawShopOrder.settlementStatus || "unsettled"
    };
  });

  const deliveryFee = totalSubtotal > 500 ? 0 : 40;
  const platformFee = Number(orderData.platformFee) || 0;
  const deliveryPartnerPayout = deliveryFee;
  const platformRevenue = Math.round((totalCommissionAmount + platformFee) * 100) / 100;

  return {
    subtotal: totalSubtotal,
    deliveryFee,
    platformFee,
    commissionAmount: totalCommissionAmount,
    restaurantPayout: totalRestaurantPayout,
    deliveryPartnerPayout,
    platformRevenue,
    settlementStatus: orderData.settlementStatus || "unsettled",
    shopOrders: updatedShopOrders
  };
};
