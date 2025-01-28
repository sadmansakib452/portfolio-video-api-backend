const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { logger } = require("../utils/logger");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error("User not found");
    }

    // Add role information to request
    req.user = user;
    req.userRole = user.isSuperAdmin
      ? "super_admin"
      : user.isAdmin
      ? "admin"
      : "user";

    next();
  } catch (error) {
    logger.error("Authentication failed:", error.message);
    res.status(401).json({
      status: "error",
      message: "Please authenticate",
    });
  }
};

module.exports = auth;
