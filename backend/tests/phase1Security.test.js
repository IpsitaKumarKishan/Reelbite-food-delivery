import test from "node:test";
import assert from "node:assert/strict";

test("Phase 1 Security: Role whitelisting guard", () => {
  const ALLOWED_PUBLIC_ROLES = ["user", "owner", "deliveryBoy"];
  
  const sanitizeRole = (role) => {
    return ALLOWED_PUBLIC_ROLES.includes(role) ? role : "user";
  };

  // Malicious role escalation attempts must fallback to "user"
  assert.equal(sanitizeRole("admin"), "user");
  assert.equal(sanitizeRole("superadmin"), "user");
  assert.equal(sanitizeRole("root"), "user");
  assert.equal(sanitizeRole(""), "user");
  assert.equal(sanitizeRole(null), "user");
  assert.equal(sanitizeRole(undefined), "user");

  // Legitimate public roles must be preserved
  assert.equal(sanitizeRole("user"), "user");
  assert.equal(sanitizeRole("owner"), "owner");
  assert.equal(sanitizeRole("deliveryBoy"), "deliveryBoy");
});

test("Phase 1 Security: Server-side item price verification integrity", () => {
  // Mock DB item repository
  const dbItems = [
    { _id: "item1", name: "Butter Chicken", price: 350, shop: "shop1" },
    { _id: "item2", name: "Garlic Naan", price: 60, shop: "shop1" },
  ];
  const dbMap = new Map(dbItems.map((i) => [i._id, i]));

  // Mock client payload trying to forge prices to 1 rupee
  const clientCartItems = [
    { id: "item1", name: "Butter Chicken", price: 1, quantity: 2, shop: "shop1" },
    { id: "item2", name: "Garlic Naan", price: 0.5, quantity: 3, shop: "shop1" },
  ];

  // Verified calculation logic
  let verifiedSubtotal = 0;
  const verifiedItems = clientCartItems.map((ci) => {
    const dbItem = dbMap.get(ci.id);
    assert.ok(dbItem, "Item must exist in DB");
    const verifiedPrice = Number(dbItem.price);
    const quantity = Math.max(1, Number(ci.quantity) || 1);
    verifiedSubtotal += verifiedPrice * quantity;
    return {
      item: dbItem._id,
      name: dbItem.name,
      price: verifiedPrice,
      quantity,
    };
  });

  // Client attempted subtotal: 1*2 + 0.5*3 = ₹3.50
  // Verified actual subtotal: 350*2 + 60*3 = ₹880
  assert.equal(verifiedSubtotal, 880);
  assert.equal(verifiedItems[0].price, 350);
  assert.equal(verifiedItems[1].price, 60);
});

test("Phase 1 Security: IDOR item ownership check", () => {
  const ownerShop = { _id: "shop_owner_1", owner: "user_owner_1" };
  const competitorItem = { _id: "item_999", name: "Secret Recipe", shop: "shop_owner_2" };

  const canEditItem = (item, shop) => {
    if (!shop || String(item.shop) !== String(shop._id)) {
      return false;
    }
    return true;
  };

  // Competitor attempt must be denied
  assert.equal(canEditItem(competitorItem, ownerShop), false);

  // Own item attempt must be allowed
  const ownItem = { _id: "item_100", name: "My Dish", shop: "shop_owner_1" };
  assert.equal(canEditItem(ownItem, ownerShop), true);
});
