import axios from "axios";
import React, { useEffect, useState } from "react";
import { serverUrl } from "../App";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaStore,
  FaLocationDot,
  FaStar,
  FaClock,
  FaTag,
  FaArrowLeft,
  FaLeaf,
  FaDrumstickBite,
  FaPlus,
  FaMinus,
} from "react-icons/fa6";
import { FaSearch, FaShoppingBag } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, setCartItems, updateQuantity } from "../redux/userSlice";
import Nav from "../components/Nav";

const SwiggyDishItem = ({ item, shopId }) => {
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.user);
  const cartItem = cartItems.find((i) => i.id === item._id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const handleAdd = async () => {
    dispatch(
      addToCart({
        id: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        shop: shopId,
        quantity: 1,
        foodType: item.foodType,
      })
    );
    try {
      const res = await axios.post(
        `${serverUrl}/api/user/cart/add`,
        { itemId: item._id, quantity: 1 },
        { withCredentials: true }
      );
      if (res.data) dispatch(setCartItems(res.data));
    } catch (err) {
      console.error("Cart add error:", err);
    }
  };

  const handleIncrement = async () => {
    dispatch(updateQuantity({ id: item._id, quantity: quantityInCart + 1 }));
    try {
      const res = await axios.put(
        `${serverUrl}/api/user/cart/update`,
        { itemId: item._id, quantity: quantityInCart + 1 },
        { withCredentials: true }
      );
      if (res.data) dispatch(setCartItems(res.data));
    } catch (err) {
      console.error("Cart update error:", err);
    }
  };

  const handleDecrement = async () => {
    const newQty = quantityInCart - 1;
    dispatch(updateQuantity({ id: item._id, quantity: newQty }));
    try {
      const res = await axios.put(
        `${serverUrl}/api/user/cart/update`,
        { itemId: item._id, quantity: newQty },
        { withCredentials: true }
      );
      if (res.data) dispatch(setCartItems(res.data));
    } catch (err) {
      console.error("Cart update error:", err);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md transition gap-4">
      {/* Left Details */}
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          {item.foodType === "veg" ? (
            <span className="w-4 h-4 rounded border-2 border-emerald-600 flex items-center justify-center p-0.5" title="Veg">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            </span>
          ) : (
            <span className="w-4 h-4 rounded border-2 border-red-600 flex items-center justify-center p-0.5" title="Non-Veg">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
            </span>
          )}
          {item.category && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              {item.category}
            </span>
          )}
        </div>

        <h4 className="font-extrabold text-stone-900 text-base">{item.name}</h4>
        <p className="font-black text-stone-900 text-sm">₹{item.price}</p>
        <p className="text-xs text-stone-500 line-clamp-2">Freshly prepared with authentic ingredients and secret spices.</p>
      </div>

      {/* Right Image + Swiggy ADD Button */}
      <div className="relative w-28 h-28 shrink-0 flex flex-col items-center">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover rounded-2xl shadow-sm"
        />

        {/* Swiggy Style ADD Stepper Overlay */}
        <div className="absolute -bottom-2 z-10 bg-white border border-stone-300 shadow-md rounded-xl overflow-hidden px-2 py-1 flex items-center justify-center min-w-[90px]">
          {quantityInCart > 0 ? (
            <div className="flex items-center justify-between w-full text-[#ff5200] font-black text-sm">
              <button onClick={handleDecrement} className="px-1.5 hover:bg-stone-100 rounded">
                <FaMinus size={10} />
              </button>
              <span>{quantityInCart}</span>
              <button onClick={handleIncrement} className="px-1.5 hover:bg-stone-100 rounded">
                <FaPlus size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className="text-[#ff5200] font-black text-xs uppercase tracking-wider w-full hover:bg-stone-50 py-0.5 transition"
            >
              ADD
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function Shop() {
  const { shopId } = useParams();
  const [items, setItems] = useState([]);
  const [shop, setShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const navigate = useNavigate();

  const handleShop = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`, {
        withCredentials: true,
      });
      setShop(result.data.shop);
      setItems(result.data.items || []);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    handleShop();
  }, [shopId]);

  // Extract categories present in items
  const itemCategories = ["All", ...new Set(items.map((i) => i.category).filter(Boolean))];

  // Filter items by category and search query
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-stone-900 font-sans pb-20">
      <Nav />

      {/* Top Banner Header */}
      {shop && (
        <div className="pt-20 max-w-5xl mx-auto px-4">
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-full md:w-48 h-36 rounded-2xl overflow-hidden shadow shrink-0 relative">
                <img src={shop.image} alt={shop.name} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-700 text-white text-xs font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <span>{shop.rating?.average || 4.3}</span>
                    <FaStar size={10} className="text-yellow-300" />
                  </span>
                  <span className="text-xs text-stone-500 font-semibold">• 25-35 mins</span>
                </div>

                <h1 className="text-3xl font-black text-stone-900 tracking-tight">{shop.name}</h1>
                <p className="text-xs text-stone-500 font-medium">North Indian, Fast Food, South Indian, Desserts</p>
                <div className="flex items-center gap-1 text-xs text-stone-600 font-medium pt-1">
                  <FaLocationDot className="text-[#ff5200]" />
                  <span>{shop.address || shop.city}</span>
                </div>
              </div>

              {/* Offer Pill */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl flex items-center gap-3 shrink-0">
                <FaTag className="text-[#ff5200] text-xl" />
                <div>
                  <h5 className="font-extrabold text-xs">50% OFF UP TO ₹100</h5>
                  <p className="text-[10px] text-amber-700 font-semibold">USE CODE: REELBITE50</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu & Search Controls */}
      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-stone-200 p-4 rounded-2xl shadow-sm">
          {/* Search within Menu */}
          <div className="w-full sm:w-72 bg-stone-100 rounded-full px-4 py-2 flex items-center gap-2 border border-stone-200 focus-within:border-[#ff5200]">
            <FaSearch className="text-stone-400" size={14} />
            <input
              type="text"
              placeholder="Search in menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-800 outline-none w-full"
            />
          </div>

          {/* Category Quick Filter */}
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {itemCategories.map((cate) => (
              <button
                key={cate}
                onClick={() => setSelectedCategory(cate)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition border shrink-0 ${
                  selectedCategory === cate
                    ? "bg-[#ff5200] text-white border-[#ff5200]"
                    : "bg-white text-stone-700 border-stone-200 hover:border-[#ff5200]"
                }`}
              >
                {cate}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Dishes List */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-stone-900 border-b border-stone-200 pb-2">
            Recommended Menu ({filteredItems.length})
          </h3>

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <SwiggyDishItem key={item._id} item={item} shopId={shopId} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-500 text-sm">
              No dishes found matching your search.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Shop;
