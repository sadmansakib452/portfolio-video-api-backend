const User = require("../models/user.model");
const { logger } = require("../utils/logger");

// Create new admin
const createAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const admin = await User.create({
      username,
      email,
      password,
      isAdmin: true,
      isSuperAdmin: false
    });

    res.status(201).json({
      status: "success",
      data: {
        admin: {
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          isAdmin: admin.isAdmin,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt
        }
      }
    });
  } catch (error) {
    // Enhanced error handling
    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        status: "error",
        message: `An admin with this ${field} already exists`,
        field: field, // Helps frontend identify which field caused the error
      });
    }

    // Log the error for debugging
    logger.error("Admin creation failed:", error);

    // Generic error response
    res.status(400).json({
      status: "error",
      message: "Failed to create admin. Please try again.",
    });
  }
};

// Get all admins
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true, isSuperAdmin: false })
      .select("-password")
      .sort("-createdAt");

    res.json({
      status: "success",
      data: { admins },
    });
  } catch (error) {
    logger.error("Error fetching admins:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findOneAndDelete({
      _id: req.params.id,
      isAdmin: true,
      isSuperAdmin: false,
    });

    if (!admin) {
      return res.status(404).json({
        status: "error",
        message: "Admin not found",
      });
    }

    res.json({
      status: "success",
      message: "Admin deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting admin:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

/**
 * Update admin information
 * Only super admin can update admin info
 */
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find admin and ensure they're not a super admin
    const admin = await User.findOne({
      _id: id,
      isAdmin: true,
      isSuperAdmin: false,
    });

    if (!admin) {
      return res.status(404).json({
        status: "error",
        message: "Admin not found",
      });
    }

    // Check for duplicate email/username if being updated
    if (updateData.email && updateData.email !== admin.email) {
      const emailExists = await User.findOne({
        email: updateData.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        return res.status(409).json({
          status: "error",
          message: "Email already in use",
          field: "email",
        });
      }
    }

    if (updateData.username && updateData.username !== admin.username) {
      const usernameExists = await User.findOne({
        username: updateData.username,
        _id: { $ne: id },
      });

      if (usernameExists) {
        return res.status(409).json({
          status: "error",
          message: "Username already in use",
          field: "username",
        });
      }
    }

    // Update admin data
    // Note: Password will be hashed by pre-save hook
    Object.keys(updateData).forEach((key) => {
      if (key !== "isSuperAdmin") {
        // Prevent updating super admin status
        admin[key] = updateData[key];
      }
    });

    await admin.save();

    // Remove sensitive data from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.json({
      status: "success",
      data: {
        admin: adminResponse,
      },
    });
  } catch (error) {
    logger.error("Admin update failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update admin",
    });
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  updateAdmin,
};
