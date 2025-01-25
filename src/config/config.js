require("dotenv").config();

const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  uploadLimits: {
    videos: 50 * 1024 * 1024, // 50MB
    thumbnails: 5 * 1024 * 1024, // 5MB
  },
};

module.exports = config;
