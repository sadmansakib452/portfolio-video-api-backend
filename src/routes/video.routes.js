const express = require("express");
const path = require("path");
const {
  uploadVideo,
  getAllVideos,
  deleteVideo,
  checkTitle,
  updateVideo,
  updateVideoFile,
  updateThumbnail,
  bulkDeleteVideos,
  updateAllVideoData,
  verifyVideoExists,
  getVideos,
} = require("../controllers/video.controller");
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const Video = require("../models/video.model");
const { streamVideo } = require("../utils/stream.utils");
const { SERVER_URL } = process.env;

const router = express.Router();

// All routes require authentication
router.use(auth);

// Move update-all route before other :id routes to prevent conflicts
router.put("/:id/update-all", upload.videoAndThumbnail, updateAllVideoData);

// Other routes
router.post("/bulk-delete", bulkDeleteVideos);
router.post("/check-title", checkTitle);
router.post("/upload", upload.videoAndThumbnail, uploadVideo);
router.get("/", getVideos);

// Single video operations
router.delete("/:id", deleteVideo);
router.patch("/:id", updateVideo);
router.put("/:id/video", upload.video, updateVideoFile);
router.put("/:id/thumbnail", upload.thumbnail, updateThumbnail);

// Stream video
router.get("/stream/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).send("Video not found");
    }

    const videoPath = path.join("uploads", "videos", video.videoFile.filename);
    streamVideo(req, res, videoPath);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Enhanced video player
router.get("/play/:id", async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).send("Video not found");
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${video.title}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif;
              background: #f5f5f5;
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .video-container {
              position: relative;
              width: 100%;
              padding-top: 56.25%; /* 16:9 Aspect Ratio */
            }
            video { 
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-radius: 4px;
            }
            .metadata {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
            }
            .thumbnail {
              max-width: 200px;
              border-radius: 4px;
              margin-top: 20px;
            }
            h1 { margin: 0 0 20px 0; color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${video.title}</h1>
            <div class="video-container">
              <video controls>
                <source src="${SERVER_URL}/api/videos/stream/${
      video._id
    }" type="${video.videoFile.mimetype}">
                Your browser does not support the video tag.
              </video>
            </div>
            <div class="metadata">
              <p>${video.description || "No description available."}</p>
              <h3>Thumbnail:</h3>
              <img class="thumbnail" src="${SERVER_URL}/uploads/thumbnails/${
      video.thumbnailFile.filename
    }" alt="Video thumbnail">
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Add this route before update route
router.get("/:id/check", auth, async (req, res) => {
  try {
    const video = await verifyVideoExists(req.params.id);
    if (!video) {
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    // Check ownership
    if (video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized access to video",
      });
    }

    res.json({
      status: "success",
      data: {
        exists: true,
        owned: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

module.exports = router;
