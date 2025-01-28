const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { logger } = require("../utils/logger");
const crypto = require("crypto");
const sendEmail = require("../utils/email.utils");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Format user response based on role
const formatUserResponse = (user) => {
  const baseResponse = {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.isSuperAdmin ? "super_admin" : user.isAdmin ? "admin" : "user",
    createdAt: user.createdAt,
  };

  // Add additional fields for admin/super admin
  if (user.isAdmin || user.isSuperAdmin) {
    baseResponse.isAdmin = user.isAdmin;
    baseResponse.isSuperAdmin = user.isSuperAdmin;
  }

  return baseResponse;
};

// Disable public registration - only super admin can create admins
const register = async (req, res) => {
  res.status(403).json({
    status: "error",
    message: "Public registration is disabled. Please contact administrator.",
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.isSuperAdmin
          ? "super_admin"
          : user.isAdmin
          ? "admin"
          : "user",
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      status: "success",
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    logger.error("Login failed:", error);
    res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
};

// Create admin user if not exists
const createAdminIfNotExists = async () => {
  try {
    const adminExists = await User.findOne({ isAdmin: true });
    if (!adminExists) {
      await User.create({
        username: "admin",
        email: "admin@example.com",
        password: "admin123", // Change this in production
        isAdmin: true,
      });
      console.log("✨ Admin user created successfully");
    }
  } catch (error) {
    console.error("Admin creation error:", error);
  }
};

// Call this when your app starts
createAdminIfNotExists();

// 1. Request Password Reset
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // Find admin by email
    const admin = await User.findOne({
      email,
      isAdmin: true,
      isSuperAdmin: false,
    });

    if (!admin) {
      return res.status(404).json({
        status: "error",
        message: "No admin found with this email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await admin.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send reset email
    await sendEmail({
      email: admin.email,
      subject: "Reset Your Password - Dream Radio",
      templateName: "reset-password",
      templateData: {
        name: admin.username,
        resetLink: resetUrl,
      },
    });

    res.json({
      status: "success",
      message: "Password reset email sent",
    });
  } catch (error) {
    logger.error("Password reset request failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send reset email",
    });
  }
};

// 2. Reset Password
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find admin by token and check expiration
    const admin = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    admin.password = password;
    admin.resetPasswordToken = null;
    admin.resetPasswordExpires = null;

    await admin.save();

    res.json({
      status: "success",
      message: "Password reset successful",
    });
  } catch (error) {
    logger.error("Password reset failed:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to reset password",
    });
  }
};

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
};
