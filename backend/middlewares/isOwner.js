import User from "../models/user.model.js";

const isOwner = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "owner") {
      return res.status(403).json({ message: "Access denied. Owner role required." });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Role verification failed", error: error.message });
  }
};

export default isOwner;
