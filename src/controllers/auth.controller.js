const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (userExists) {
      return res.status(400).json({
        status: "error",
        message: "User already exists with this email or username",
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      isAdmin: false, // Default to normal user
    });

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    // Handle both login formats
    const { login, username, password } = req.body;

    // Use either login field or username field
    const userIdentifier = login || username;

    if (!userIdentifier || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide username/email and password",
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: userIdentifier }, { username: userIdentifier }],
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
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

module.exports = {
  register,
  login,
};
