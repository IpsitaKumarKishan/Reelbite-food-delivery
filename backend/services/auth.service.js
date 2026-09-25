import bcrypt from "bcryptjs";
import genToken from "../utils/token.js";

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

export const createAuthToken = async (userId) => {
  return await genToken(userId);
};

export const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.resetOtp;
  delete userObj.otpExpires;
  return userObj;
};
