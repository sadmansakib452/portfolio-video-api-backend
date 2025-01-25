const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { generateFileName, generateSlug } = require("../utils/file.utils");
const Video = require("../models/video.model");

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = ["uploads/videos", "uploads/thumbnails"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      console.log(`📁 Checking directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
};

createUploadDirs();

// Configure video storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📂 Processing file: ${file.fieldname}`);
    console.log(`🔍 Mimetype: ${file.mimetype}`);

    if (file.fieldname === "video") {
      console.log(`🎥 Storing video in uploads/videos`);
      cb(null, "uploads/videos");
    } else if (file.fieldname === "thumbnail") {
      console.log(`🖼️ Storing thumbnail in uploads/thumbnails`);
      cb(null, "uploads/thumbnails");
    } else {
      console.log(`❌ Unknown field: ${file.fieldname}`);
      cb(new Error(`Unknown field: ${file.fieldname}`));
    }
  },
  filename: async (req, file, cb) => {
    try {
      console.log(`📝 Creating filename for: ${file.fieldname}`);

      let baseFileName;

      // For updates, use existing video title if no new title provided
      if (req.params.id) {
        const video = await Video.findById(req.params.id);
        if (video) {
          baseFileName = req.body.title || video.title; // Use existing title if no new title
        } else {
          baseFileName = req.body.title || "untitled";
        }
      } else {
        // For new uploads, require title
        if (!req.body.title) {
          return cb(new Error("Title is required for new uploads"));
        }
        baseFileName = req.body.title;
      }

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const slug = generateSlug(baseFileName);
      const ext = path.extname(file.originalname);
      const filename = `${slug}-${timestamp}${ext}`;

      console.log(`✨ Generated filename: ${filename}`);
      cb(null, filename);
    } catch (error) {
      console.error("❌ Error generating filename:", error);
      cb(error);
    }
  },
});

// File filter with improved mime type checking
const fileFilter = (req, file, cb) => {
  console.log(`🔎 Checking file: ${file.fieldname} (${file.mimetype})`);

  if (file.fieldname === "video") {
    // Allow common video formats
    const allowedVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime", // For .mov files
      "video/x-msvideo", // For .avi files
      "video/x-matroska", // For .mkv files
    ];

    if (allowedVideoTypes.includes(file.mimetype)) {
      console.log(`✅ Valid video file: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.log(`❌ Invalid video type: ${file.mimetype}`);
      cb(
        new Error(
          `Invalid video format. Allowed types: MP4, WebM, OGG, MOV, AVI, MKV`
        )
      );
    }
  } else if (file.fieldname === "thumbnail") {
    // Allow common image formats
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedImageTypes.includes(file.mimetype)) {
      console.log(`✅ Valid image file`);
      cb(null, true);
    } else {
      console.log(`❌ Invalid image type: ${file.mimetype}`);
      cb(
        new Error(`Invalid image format. Allowed types: JPEG, PNG, WebP, GIF`)
      );
    }
  } else {
    console.log(`❌ Unknown field: ${file.fieldname}`);
    cb(new Error(`Unknown field: ${file.fieldname}`));
  }
};

// Create multer instance with increased limits
const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: Infinity, // No file size limit
    files: 2, // Allow max 2 files (video + thumbnail)
    fields: 10, // Allow max 10 fields
  },
});

// Debug middleware
const logMulterFields = (req, res, next) => {
  console.log("\n🔵 --- Starting File Upload Request ---");
  console.log("📋 Headers:", req.headers);
  console.log("📦 Body:", req.body);
  next();
};

// Add file size validation middleware
const validateFileSize = (req, res, next) => {
  if (!req.files) return next();

  const maxVideoSize = 2 * 1024 * 1024 * 1024; // 2GB
  const maxThumbnailSize = 10 * 1024 * 1024; // 10MB

  if (req.files.video && req.files.video[0].size > maxVideoSize) {
    return res.status(400).json({
      status: "error",
      message: `Video file too large. Maximum size is ${formatBytes(
        maxVideoSize
      )}`,
    });
  }

  if (req.files.thumbnail && req.files.thumbnail[0].size > maxThumbnailSize) {
    return res.status(400).json({
      status: "error",
      message: `Thumbnail file too large. Maximum size is ${formatBytes(
        maxThumbnailSize
      )}`,
    });
  }

  next();
};

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const upload = {
  // For multiple fields (video + thumbnail)
  videoAndThumbnail: [
    logMulterFields,
    uploadMiddleware.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    validateFileSize,
  ],

  // For single video file
  video: [logMulterFields, uploadMiddleware.single("video"), validateFileSize],

  // For single thumbnail file
  thumbnail: [
    logMulterFields,
    uploadMiddleware.single("thumbnail"),
    validateFileSize,
  ],
};

module.exports = upload;
