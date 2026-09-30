import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const isAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Authentication required. Token not found." });
        }

        let decodeToken;
        try {
            decodeToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtErr) {
            return res.status(401).json({ message: "Session expired or invalid token. Please sign in again." });
        }

        if (!decodeToken || !decodeToken.userId) {
            return res.status(401).json({ message: "Invalid authentication token." });
        }

        const user = await User.findById(decodeToken.userId).select("status role").lean();
        if (!user) {
            return res.status(401).json({ message: "User account not found." });
        }

        if (user.status === "suspended") {
            return res.status(403).json({ message: "Your account has been suspended by the platform administrator." });
        }

        req.userId = decodeToken.userId;
        req.userRole = user.role;
        next();
    } catch (error) {
        return res.status(500).json({ message: "Authentication verification failed", error: error.message });
    }
};

export default isAuth;