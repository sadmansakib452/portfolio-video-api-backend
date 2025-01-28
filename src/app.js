require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger.config");
const authRoutes = require("./routes/auth.routes");
const videoRoutes = require("./routes/video.routes");
const publicRoutes = require("./routes/public.routes");
const multer = require("multer");
const { streamVideo } = require("./middleware/stream.middleware");
const { morganMiddleware, logger } = require("./utils/logger");
const adminRoutes = require("./routes/admin.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger - Update this section
if (process.env.NODE_ENV === "development") {
  // Add custom token for response time
  morgan.token("response-time", function (req, res) {
    if (!res._header || !req._startAt) return "";
    const diff = process.hrtime(req._startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    return time.toFixed(3);
  });

  // Custom format string
  const logFormat =
    ":method :url :status :response-time ms - :res[content-length]";

  app.use(
    morgan(logFormat, {
      skip: function (req, res) {
        // Skip logging for successful static file requests
        return req.url.startsWith("/uploads/") && res.statusCode === 200;
      },
    })
  );

  // Add request start time
  app.use((req, res, next) => {
    req._startAt = process.hrtime();
    next();
  });
}

// Add logging middleware
app.use(morganMiddleware);

// Add request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - Request received`);
  next();
});

// Add response logging
app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = function (data) {
    logger.info(`${req.method} ${req.url} - Response sent:`, {
      status: res.statusCode,
      data: process.env.NODE_ENV === "development" ? data : "[REDACTED]",
    });
    return oldJson.call(this, data);
  };
  next();
});

// Public access to uploads with streaming support
app.use(
  "/uploads",
  (req, res, next) => {
    // Check if this is a video request
    const isVideo = /^\/videos\/[^\/]+\.(mp4|webm|ogg)$/i.test(req.url);

    if (isVideo) {
      console.log("🎥 Video request detected:", req.url);
      return streamVideo(req, res, next);
    }
    // For non-video files, set cache header
    res.setHeader("Cache-Control", "public, max-age=3600");
    next();
  },
  express.static(path.join(__dirname, "..", "uploads"))
);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes (revert back)
app.use("/api/videos", videoRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Add admin routes
app.use("/api/admins", adminRoutes);

// Basic route for testing
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: "error",
      message: `Upload error: ${err.message}`,
      field: err.field,
    });
  }

  // Handle mongoose errors
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "error",
      message: "Invalid ID format",
    });
  }

  res.status(500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong!",
  });
});

module.exports = app;
