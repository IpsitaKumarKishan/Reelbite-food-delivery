import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return result.secure_url;
  } catch (error) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    console.log("Cloudinary image upload error:", error);
    return null;
  }
};

export const uploadVideoOnCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      resource_type: "video",
      folder: "reels"
    });
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return result.secure_url;
  } catch (error) {
    console.log("Cloudinary video upload error:", error.message || error);
    // Return local static path as fallback
    const fileName = path.basename(file);
    return `/reels/${fileName}`;
  }
};

export const deleteVideoFromCloudinary = async (videoUrl) => {
  try {
    if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.includes("cloudinary.com")) return null;
    const parts = videoUrl.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const pathParts = parts.slice(uploadIndex + 1);
    if (pathParts[0] && pathParts[0].startsWith('v') && !isNaN(Number(pathParts[0].slice(1)))) {
      pathParts.shift();
    }
    const fullPath = pathParts.join('/');
    const publicId = fullPath.substring(0, fullPath.lastIndexOf('.'));
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    return result;
  } catch (err) {
    console.error("Cloudinary video deletion error:", err.message || err);
    return null;
  }
};

export default uploadOnCloudinary;