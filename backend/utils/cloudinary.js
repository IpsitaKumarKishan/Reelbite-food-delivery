import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const uploadOnCloudinary = async (file) => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
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
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
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

export default uploadOnCloudinary;