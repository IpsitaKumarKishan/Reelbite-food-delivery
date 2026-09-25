import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import Reel from "../models/reel.model.js";

export const ensureIndexes = async () => {
  try {
    await Order.collection.createIndex({ user: 1 });
    await Order.collection.createIndex({ "shopOrders.owner": 1 });
    await Order.collection.createIndex({ "shopOrders.assignedDeliveryBoy": 1 });
    await Shop.collection.createIndex({ owner: 1 });
    await Shop.collection.createIndex({ city: 1 });
    await Reel.collection.createIndex({ likes: 1 });
    await Reel.collection.createIndex({ shop: 1, createdAt: -1 });
    console.log("Database indexes ensured");
  } catch (error) {
    console.log("Database indexing notice:", error.message || error);
  }
};
