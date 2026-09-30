import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import Reel from "../models/reel.model.js";
import Item from "../models/item.model.js";
import User from "../models/user.model.js";

export const ensureIndexes = async () => {
  try {
    await Order.collection.createIndex({ user: 1, createdAt: -1 });
    await Order.collection.createIndex({ "shopOrders.owner": 1, createdAt: -1 });
    await Order.collection.createIndex({ "shopOrders.shop": 1, "shopOrders.status": 1 });
    await Order.collection.createIndex({ "shopOrders.assignedDeliveryBoy": 1 });
    await Order.collection.createIndex({ createdAt: -1 });
    await Order.collection.createIndex({ "cancellation.isCancelled": 1, createdAt: -1 });

    await Shop.collection.createIndex({ location: "2dsphere" });
    await Shop.collection.createIndex({ owner: 1 });
    await Shop.collection.createIndex({ city: 1, status: 1 });

    await User.collection.createIndex({ location: "2dsphere" });
    await User.collection.createIndex({ role: 1, isOnline: 1 });
    await User.collection.createIndex({ mobile: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true, sparse: true });

    await Reel.collection.createIndex({ likes: 1 });
    await Reel.collection.createIndex({ shop: 1, createdAt: -1 });
    await Reel.collection.createIndex({ owner: 1, views: -1 });

    await Item.collection.createIndex({ shop: 1, foodType: 1, category: 1 });
    await Item.collection.createIndex({ "rating.average": -1 });
    console.log("Database indexes ensured");

    // Purge any orphaned shops whose owners no longer exist in User collection
    const allShops = await Shop.find().select("_id name owner").lean();
    const orphanedShopIds = [];
    for (const s of allShops) {
      if (!s.owner) {
        orphanedShopIds.push(s._id);
        continue;
      }
      const ownerExists = await User.exists({ _id: s.owner });
      if (!ownerExists) {
        orphanedShopIds.push(s._id);
      }
    }
    if (orphanedShopIds.length > 0) {
      await Item.deleteMany({ shop: { $in: orphanedShopIds } });
      await Reel.deleteMany({ shop: { $in: orphanedShopIds } });
      await Shop.deleteMany({ _id: { $in: orphanedShopIds } });
      console.log(`Cleaned up ${orphanedShopIds.length} orphaned shop(s) with removed owners.`);
    }
  } catch (error) {
    console.log("Database indexing notice:", error.message || error);
  }
};

