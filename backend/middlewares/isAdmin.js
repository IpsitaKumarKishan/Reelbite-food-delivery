import User from "../models/user.model.js";

const isAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Super Admin role required." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: `isAdmin middleware error: ${error.message || error}` });
  }
};

export default isAdmin;
