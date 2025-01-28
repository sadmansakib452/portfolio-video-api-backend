const { logger } = require("../utils/logger");
const User = require("../models/user.model");

const validateAdminCreation = (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide username, email and password",
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address",
      });
    }

    // Username validation (alphanumeric and underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        status: "error",
        message:
          "Username must be 3-30 characters long and can only contain letters, numbers and underscore",
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long",
      });
    }

    next();
  } catch (error) {
    logger.error("Admin validation error:", error);
    res.status(500).json({
      status: "error",
      message: "Validation failed",
    });
  }
};

const validateAdminOperation = async (req, res, next) => {
  try {
    const adminId = req.params.id;

    // Check if trying to modify super admin
    const targetAdmin = await User.findById(adminId);
    if (!targetAdmin) {
      return res.status(404).json({
        status: "error",
        message: "Admin not found",
      });
    }

    if (targetAdmin.isSuperAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Super admin cannot be modified",
      });
    }

    next();
  } catch (error) {
    logger.error("Admin operation validation error:", error);
    res.status(500).json({
      status: "error",
      message: "Validation failed",
    });
  }
};

const validateAdminUpdate = (req, res, next) => {
  try {
    const updateData = req.body;
    const errors = {};

    // Only validate fields that are being updated
    if (updateData.username) {
      // Username validation (alphanumeric and underscore only)
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(updateData.username)) {
        errors.username =
          "Username must be 3-30 characters long and can only contain letters, numbers and underscore";
      }
    }

    if (updateData.email) {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        errors.email = "Please provide a valid email address";
      }
    }

    if (updateData.password) {
      // Password strength validation
      if (updateData.password.length < 6) {
        errors.password = "Password must be at least 6 characters long";
      }
    }

    // Prevent updating protected fields
    const protectedFields = ["isSuperAdmin", "isAdmin", "_id"];
    const hasProtectedFields = protectedFields.some((field) =>
      updateData.hasOwnProperty(field)
    );

    if (hasProtectedFields) {
      return res.status(400).json({
        status: "error",
        message: "Cannot update protected fields",
      });
    }

    // If there are validation errors
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors,
      });
    }

    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No update data provided",
      });
    }

    next();
  } catch (error) {
    logger.error("Admin update validation error:", error);
    res.status(500).json({
      status: "error",
      message: "Validation failed",
    });
  }
};

module.exports = {
  validateAdminCreation,
  validateAdminOperation,
  validateAdminUpdate,
};
