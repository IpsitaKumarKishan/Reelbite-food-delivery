import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import Nav from "../components/Nav";
import { FaTrash, FaUpload, FaFilm, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

const OwnerReels = () => {
  const { userData, myShopData } = useSelector((state) => state.user);
  const { myShopItems } = useSelector((state) => state.owner || {});
  const navigate = useNavigate();

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [selectedFoodItem, setSelectedFoodItem] = useState("");
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
  }, [userData]);

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

    // Validate type
    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("video/")) {
      setMessage({ type: "error", text: "Please select a valid video file (MP4, MOV, WEBM)" });
      return;
    }

    // Validate size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setMessage({ type: "error", text: "Video file size must be less than 100MB" });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setMessage({ type: "error", text: "Please select a video file to upload" });
      return;
    }

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("caption", caption);
    if (selectedFoodItem) {
      formData.append("foodItem", selectedFoodItem);
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      const res = await axios.post(`${serverUrl}/api/reels`, formData, {
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
      fetchMyReels();
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
    if (!window.confirm("Are you sure you want to delete this reel?")) return;
    try {
      await axios.delete(`${serverUrl}/api/reels/${reelId}`, {
        withCredentials: true,
      });
      setMyReels(myReels.filter((r) => r._id !== reelId));
      setMessage({ type: "success", text: "Reel deleted successfully" });
    } catch (err) {
      setMessage({ type: "error", text: "Failed to delete reel" });
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 font-sans pb-12">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 pt-24">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-800">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <FaFilm className="text-[#ea580c]" />
              <span>Owner Reels Dashboard</span>
            </h1>
            <p className="text-sm text-stone-400 mt-1">
              Upload engaging short food videos to highlight your dishes and boost orders.
            </p>
          </div>
          <button
            onClick={() => navigate("/reels")}
            className="flex items-center gap-2 bg-stone-800 hover:bg-stone-700 text-amber-400 px-4 py-2 rounded-xl text-sm font-semibold border border-amber-500/20 transition"
          >
            <span>View Public Feed</span>
            <FaArrowLeft className="rotate-180" />
          </button>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center justify-between ${
              message.type === "error"
                ? "bg-red-900/40 border border-red-500/40 text-red-200"
                : "bg-emerald-900/40 border border-emerald-500/40 text-emerald-200"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })} className="text-lg">
              &times;
            </button>
          </div>
        )}

        {/* Form & Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Form (Left Column) */}
          <div className="lg:col-span-5 bg-stone-950 p-6 rounded-2xl border border-stone-800 shadow-xl space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FaUpload className="text-[#ea580c]" />
              <span>Upload New Reel</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Video Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Select Video File (MP4/MOV, Max 100MB)
                </label>
                <div className="relative border-2 border-dashed border-stone-700 hover:border-[#ea580c] rounded-xl p-4 text-center cursor-pointer transition bg-stone-900/50">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {videoPreview ? (
                    <video
                      src={videoPreview}
                      className="max-h-48 w-full object-cover rounded-lg mx-auto"
                      controls
                    />
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2 text-stone-400">
                      <FaFilm className="text-4xl text-[#ea580c]" />
                      <span className="text-sm font-semibold text-stone-200">
                        Click or drag video file here
                      </span>
                      <span className="text-xs text-stone-500">
                        Vertical videos (9:16 aspect ratio) work best!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Caption / Description
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe this delicious dish or story..."
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-sm text-stone-100 focus:outline-none focus:border-[#ea580c] resize-none h-20"
                />
              </div>

              {/* Tag Food Item Dropdown */}
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                  Tag Menu Item (Optional)
                </label>
                <select
                  value={selectedFoodItem}
                  onChange={(e) => setSelectedFoodItem(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl p-3 text-sm text-stone-100 focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="">-- Select item from menu --</option>
                  {myShopItems?.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} — ₹{item.price}
                    </option>
                  ))}
                </select>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1">
                  <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#ea580c] to-amber-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-right text-amber-400 font-semibold">
                    Uploading: {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={uploading || !videoFile}
                className="w-full bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white py-3 rounded-xl font-bold text-sm shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing Reel...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Publish Reel</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Manage My Reels (Right Column) */}
          <div className="lg:col-span-7 bg-stone-950 p-6 rounded-2xl border border-stone-800 shadow-xl space-y-5">
            <h2 className="text-xl font-bold text-white flex items-center justify-between">
              <span>My Published Reels</span>
              <span className="text-xs bg-stone-800 text-amber-400 px-3 py-1 rounded-full font-semibold">
                {myReels.length} Total
              </span>
            </h2>

            {loadingReels ? (
              <div className="py-12 text-center text-stone-500 text-sm">
                Loading your reels...
              </div>
            ) : myReels.length === 0 ? (
              <div className="py-12 text-center text-stone-500 text-sm">
                You haven't uploaded any reels yet. Use the form to publish your first food reel!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {myReels.map((reel) => {
                  const videoSource = reel.videoUrl.startsWith("http")
                    ? reel.videoUrl
                    : `${serverUrl}${reel.videoUrl}`;

                  return (
                    <div
                      key={reel._id}
                      className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow group relative flex flex-col"
                    >
                      <div className="relative h-48 bg-black">
                        <video
                          src={videoSource}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <button
                          onClick={() => handleDelete(reel._id)}
                          className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-md transition shadow"
                          title="Delete Reel"
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
                            <span className="text-amber-400 font-semibold truncate max-w-[120px]">
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
