import test from "node:test";
import assert from "node:assert/strict";

test("Owner Account Deletion: Cascade deletion and feed filtering logic", () => {
  // Mock Database Collections
  let users = [
    { _id: "owner_1", fullName: "Chef Mario", role: "owner", status: "active" },
    { _id: "owner_2", fullName: "Chef Luigi", role: "owner", status: "suspended" },
    { _id: "user_3", fullName: "Customer Alice", role: "user", status: "active" },
  ];

  let shops = [
    { _id: "shop_1", name: "Mario's Pizzeria", owner: "owner_1", status: "active", isApproved: true },
    { _id: "shop_2", name: "Luigi's Pasta", owner: "owner_2", status: "suspended", isApproved: false },
    { _id: "shop_orphaned", name: "Ghost Kitchen", owner: "owner_deleted", status: "active", isApproved: true },
  ];

  let items = [
    { _id: "item_1", name: "Margherita Pizza", shop: "shop_1" },
    { _id: "item_2", name: "Spaghetti Carbonara", shop: "shop_2" },
    { _id: "item_ghost", name: "Phantom Burger", shop: "shop_orphaned" },
  ];

  let reels = [
    { _id: "reel_1", shop: "shop_1", owner: "owner_1" },
    { _id: "reel_ghost", shop: "shop_orphaned", owner: "owner_deleted" },
  ];

  // 1. Simulate feed query filter: Only return shops with active status & valid, non-suspended owner
  const getFeedShops = () => {
    return shops
      .filter((s) => s.status === "active" && s.isApproved !== false)
      .map((s) => {
        const ownerDoc = users.find((u) => u._id === s.owner);
        return { ...s, owner: ownerDoc || null };
      })
      .filter((s) => s.owner && s.owner.status !== "suspended");
  };

  const initialFeed = getFeedShops();
  assert.equal(initialFeed.length, 1, "Only Mario's active shop should be in the feed initially");
  assert.equal(initialFeed[0].name, "Mario's Pizzeria");

  // 2. Simulate Admin deleting Chef Mario's owner account
  const deleteOwnerAccount = (ownerId) => {
    const ownerShops = shops.filter((s) => s.owner === ownerId);
    const shopIds = ownerShops.map((s) => s._id);

    // Cascade delete items and reels
    items = items.filter((i) => !shopIds.includes(i.shop));
    reels = reels.filter((r) => !shopIds.includes(r.shop) && r.owner !== ownerId);
    shops = shops.filter((s) => s.owner !== ownerId);
    users = users.filter((u) => u._id !== ownerId);
  };

  deleteOwnerAccount("owner_1");

  // Verify DB state after deletion
  assert.equal(users.some((u) => u._id === "owner_1"), false, "Owner user should be deleted");
  assert.equal(shops.some((s) => s.owner === "owner_1"), false, "Owner shop should be deleted");
  assert.equal(items.some((i) => i.shop === "shop_1"), false, "Shop menu items should be deleted");
  assert.equal(reels.some((r) => r.shop === "shop_1"), false, "Shop reels should be deleted");

  // Verify Feed state after deletion
  const postDeletionFeed = getFeedShops();
  assert.equal(postDeletionFeed.length, 0, "Feed must be completely empty after owner deletion");

  // 3. Simulate self-healing orphan cleanup
  const cleanupOrphaned = () => {
    const userIds = new Set(users.map((u) => u._id));
    const orphanedShopIds = shops.filter((s) => !userIds.has(s.owner)).map((s) => s._id);

    items = items.filter((i) => !orphanedShopIds.includes(i.shop));
    reels = reels.filter((r) => !orphanedShopIds.includes(r.shop));
    shops = shops.filter((s) => !orphanedShopIds.includes(s._id));
    return orphanedShopIds.length;
  };

  const purgedCount = cleanupOrphaned();
  assert.equal(purgedCount, 1, "Ghost kitchen shop should be purged by cleanup");
  assert.equal(shops.some((s) => s._id === "shop_orphaned"), false);
  assert.equal(items.some((i) => i._id === "item_ghost"), false);
  assert.equal(reels.some((r) => r._id === "reel_ghost"), false);
});
