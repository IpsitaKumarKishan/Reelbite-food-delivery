import React, { useState, useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { setMyShopData } from "../redux/ownerSlice";
import { FaTrash, FaUpload, FaFilm, FaArrowLeft, FaCheckCircle, FaUtensils, FaImage } from "react-icons/fa";

const OwnerReels = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { myShopData } = useSelector((state) => state.owner || {});
  const myShopItems = myShopData?.items || [];
  const navigate = useNavigate();

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [selectedFoodItem, setSelectedFoodItem] = useState("");

  // Inline Food Item creation state
  const [isInlineCreation, setIsInlineCreation] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("Snacks");
  const [itemFoodType, setItemFoodType] = useState("veg");
  const [itemImageFile, setItemImageFile] = useState(null);
  const [itemImagePreview, setItemImagePreview] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [myReels, setMyReels] = useState([]);
  const [loadingReels, setLoadingReels] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (!userData) {
      navigate("/signin");
      return;
    }
    if (userData.role !== "owner") {
      navigate("/");
      return;
    }
    fetchMyReels();
    fetchMyShop();
  }, [userData]);

  const fetchMyShop = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/shop/get-my`, { withCredentials: true });
      if (res.data) {
        dispatch(setMyShopData(res.data));
      }
    } catch (err) {
      console.error("Failed to fetch shop data:", err);
    }
  };

  const fetchMyReels = async () => {
    try {
      setLoadingReels(true);
      const res = await axios.get(`${serverUrl}/api/reels/owner/${userData._id}`);
      setMyReels(res.data || []);
    } catch (err) {
      console.error("Failed to fetch my reels:", err);
    } finally {
      setLoadingReels(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("video/")) {
      setMessage({ type: "error", text: "Please select a valid video file (MP4, MOV, WEBM)" });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setMessage({ type: "error", text: "Video file size must be less than 100MB" });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setMessage({ type: "", text: "" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setItemImageFile(file);
      setItemImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setMessage({ type: "error", text: "Please select a video file to upload" });
      return;
    }

    if (!isInlineCreation && !selectedFoodItem) {
      setMessage({ type: "error", text: "Please link an existing dish or select 'Create New Dish Inline'" });
      return;
    }

    if (isInlineCreation && (!itemName || !itemPrice)) {
      setMessage({ type: "error", text: "Item Name and Price are required to create a new dish" });
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("caption", caption);

    if (isInlineCreation) {
      formData.append("createInlineItem", "true");
      formData.append("itemName", itemName);
      formData.append("itemPrice", itemPrice);
      formData.append("itemCategory", itemCategory);
      formData.append("itemFoodType", itemFoodType);
      if (itemImageFile) {
        formData.append("image", itemImageFile);
      }
    } else {
      formData.append("foodItem", selectedFoodItem);
    }

    try {
      setUploading(true);
      setUploadProgress(15);

      await axios.post(`${serverUrl}/api/reels`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setMessage({ type: "success", text: "Food Reel published successfully! 🚀" });
      setVideoFile(null);
      setVideoPreview(null);
      setCaption("");
      setSelectedFoodItem("");
      setItemName("");
      setItemPrice("");
      setItemImageFile(null);
      setItemImagePreview(null);
      setIsInlineCreation(false);
      fetchMyReels();
      fetchMyShop();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to upload video reel",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (reelId) => {
    if (!window.confirm("Are you sure you want to delete this reel? (Note: The dish will remain in your menu)")) return;
    try {
      await axios.delete(`${serverUrl}/api/reels/${reelId}`, {
        withCredentials: true,
      });
      setMyReels(myReels.filter((r) => r._id !== reelId));
      setMessage({ type: "success", text: "Reel deleted (dish preserved in menu)" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete reel" });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans pb-16">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 pt-24 space-y-8">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <FaFilm className="text-[#ff5200]" />
              <span>Owner Reels Dashboard</span>
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Publish food reels linked to real orderable menu dishes.
            </p>
          </div>
          <button
            onClick={() => navigate("/reels")}
            className="flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-[#ff5200] px-4 py-2 rounded-xl text-xs font-bold border border-[#ff5200]/20 transition"
          >
            <span>View Feed</span>
            <FaArrowLeft className="rotate-180" />
          </button>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
              message.type === "error"
                ? "bg-red-900/40 border border-red-500/40 text-red-200"
                : "bg-emerald-900/40 border border-emerald-500/40 text-emerald-200"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })} className="text-base font-black">
              &times;
            </button>
          </div>
        )}

        {/* Form & Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Form */}
          <div className="lg:col-span-5 bg-stone-900 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <FaUpload className="text-[#ff5200]" />
              <span>Publish Food Reel</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Video File Picker */}
              <div>
                <label className="block text-[11px] font-black text-stone-300 uppercase tracking-wider mb-2">
                  Select Video File (MP4/MOV, Max 100MB)
                </label>
                <div className="relative border-2 border-dashed border-stone-700 hover:border-[#ff5200] rounded-2xl p-4 text-center cursor-pointer transition bg-stone-950/50">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {videoPreview ? (
                    <video
                      src={videoPreview}
                      className="max-h-44 w-full object-cover rounded-xl mx-auto"
                      controls
                    />
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2 text-stone-400">
                      <FaFilm className="text-3xl text-[#ff5200]" />
                      <span className="text-xs font-bold text-stone-200">
                        Click or drag video file here
                      </span>
                      <span className="text-[10px] text-stone-500">
                        Vertical videos (9:16 aspect ratio)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[11px] font-black text-stone-300 uppercase tracking-wider mb-1">
                  Caption / Story
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe this dish or story..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 focus:outline-none focus:border-[#ff5200] resize-none h-16"
                />
              </div>

              {/* Linked Food Dish Selection Mode */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <label className="block text-[11px] font-black text-stone-300 uppercase tracking-wider">
                  Linked Food Item *
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setIsInlineCreation(false)}
                    className={`py-2 px-3 rounded-xl border transition ${
                      !isInlineCreation
                        ? "bg-[#ff5200] text-white border-[#ff5200]"
                        : "bg-stone-950 text-stone-400 border-stone-800"
                    }`}
                  >
                    Link Existing Dish
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInlineCreation(true)}
                    className={`py-2 px-3 rounded-xl border transition ${
                      isInlineCreation
                        ? "bg-[#ff5200] text-white border-[#ff5200]"
                        : "bg-stone-950 text-stone-400 border-stone-800"
                    }`}
                  >
                    + Add New Dish Inline
                  </button>
                </div>

                {!isInlineCreation ? (
                  <div>
                    <select
                      value={selectedFoodItem}
                      onChange={(e) => setSelectedFoodItem(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-100 focus:outline-none focus:border-[#ff5200]"
                    >
                      <option value="">-- Select dish from your menu --</option>
                      {myShopItems?.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name} — ₹{item.price} ({item.category})
                        </option>
                      ))}
                    </select>
                    {myShopItems.length === 0 && (
                      <p className="text-[11px] text-amber-400 mt-1.5 font-semibold">
                        No food items found in your shop menu. Select "+ Add New Dish Inline" or upload items from your dashboard.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-stone-950 border border-stone-800 rounded-2xl">
                    <h4 className="text-xs font-black text-[#ff5200] flex items-center gap-1.5">
                      <FaUtensils />
                      <span>Create New Menu Dish</span>
                    </h4>

                    <div>
                      <input
                        type="text"
                        placeholder="Dish Name *"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ff5200]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Price (₹) *"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ff5200]"
                      />
                      <select
                        value={itemFoodType}
                        onChange={(e) => setItemFoodType(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ff5200]"
                      >
                        <option value="veg">Veg 🌱</option>
                        <option value="non veg">Non-Veg 🍗</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#ff5200]"
                      >
                        <option value="Snacks">Snacks</option>
                        <option value="Main Course">Main Course</option>
                        <option value="Pizza">Pizza</option>
                        <option value="Burgers">Burgers</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Fast Food">Fast Food</option>
                      </select>
                    </div>

                    {/* Dish Image File Upload Option */}
                    <div>
                      <label className="block text-[11px] font-black text-stone-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <FaImage className="text-[#ff5200]" />
                        <span>Upload Dish Image</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2 text-xs text-stone-300 focus:outline-none focus:border-[#ff5200] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#ff5200] file:text-white hover:file:bg-[#c2410c]"
                      />
                      {itemImagePreview && (
                        <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-stone-700">
                          <img
                            src={itemImagePreview}
                            alt="Dish Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1">
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#ff5200] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-amber-400 font-bold">
                    Uploading: {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading || !videoFile}
                className="w-full bg-gradient-to-r from-[#ff5200] to-red-600 hover:from-red-600 hover:to-[#ff5200] text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <span>Publishing Reel...</span>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Publish Reel</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Manage My Reels */}
          <div className="lg:col-span-7 bg-stone-900 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center justify-between">
              <span>My Published Reels</span>
              <span className="text-xs bg-stone-950 text-[#ff5200] px-3 py-1 rounded-full font-bold border border-stone-800">
                {myReels.length} Reels
              </span>
            </h2>

            {loadingReels ? (
              <div className="py-12 text-center text-stone-500 text-xs font-semibold">
                Loading your reels...
              </div>
            ) : myReels.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-xs font-semibold">
                No reels uploaded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
                {myReels.map((reel) => {
                  const videoSource = reel.videoUrl.startsWith("http")
                    ? reel.videoUrl
                    : `${serverUrl}${reel.videoUrl}`;

                  return (
                    <div
                      key={reel._id}
                      className="bg-stone-950 border border-stone-800 rounded-2xl overflow-hidden shadow flex flex-col"
                    >
                      <div className="relative h-44 bg-black">
                        <video
                          src={videoSource}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <button
                          onClick={() => handleDelete(reel._id)}
                          className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md transition shadow"
                          title="Delete Reel (Keeps item on menu)"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                        {reel.caption && (
                          <p className="text-xs text-stone-300 font-medium line-clamp-2">
                            {reel.caption}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800">
                          <span>❤️ {reel.likes?.length || 0} Likes</span>
                          {reel.foodItem && (
                            <span className="text-amber-400 font-bold truncate max-w-[120px]">
                              🏷️ {reel.foodItem.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerReels;
