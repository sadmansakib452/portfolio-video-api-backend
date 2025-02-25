const express = require("express");
const Video = require("../models/video.model");
const { brandLogo } = require("../middleware/upload.middleware");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const router = express.Router();

// Get all videos (public)
router.get("/videos", async (req, res) => {
  try {
    const videos = await Video.find()
      .select(
        "title description videoFile thumbnailFile brandLogoFile slug createdAt updatedAt"
      
      )
      .lean();

    const publicVideos = videos.map((video) => ({
      _id: video._id,
      title: video.title,
      description: video.description,
      slug: video.slug,
      thumbnailUrl: `${SERVER_URL}/uploads/thumbnails/${video.thumbnailFile.filename}`,
      brandLogoUrl: `${SERVER_URL}/uploads/brandlogos/${video.brandLogoFile.filename}`,
      videoUrl: `${SERVER_URL}/uploads/videos/${video.videoFile.filename}`,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    }));

    res.json({
      status: "success",
      data: { videos: publicVideos },
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Get single video (public)
router.get("/videos/:slug", async (req, res) => {
  try {
    const video = await Video.findOne({ slug: req.params.slug })
      .select(
        "title description videoFile thumbnailFile slug createdAt updatedAt"
      )
      .lean();

    if (
      !video ||
      !video.videoFile?.filename ||
      !video.thumbnailFile?.filename
    ) {
      return res.status(404).json({
        status: "error",
        message: "Video not found or invalid video data",
      });
    }

    const publicVideo = {
      _id: video._id,
      title: video.title || "Untitled",
      description: video.description || "",
      slug: video.slug,
      thumbnailUrl: `${SERVER_URL}/uploads/thumbnails/${video.thumbnailFile.filename}`,
      videoUrl: `${SERVER_URL}/uploads/videos/${video.videoFile.filename}`,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
    };

    res.json({
      status: "success",
      data: { video: publicVideo },
    });
  } catch (error) {
    console.error("Error fetching video:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// Add this route for video player testing
router.get("/player/:slug", async (req, res) => {
  try {
    const video = await Video.findOne({ slug: req.params.slug })
      .select("title description videoFile thumbnailFile slug")
      .lean();

    if (
      !video ||
      !video.videoFile?.filename ||
      !video.thumbnailFile?.filename
    ) {
      return res.status(404).send("Video not found");
    }

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${video.title}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial; }
            .container { max-width: 800px; margin: 0 auto; }
            video { width: 100%; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${video.title}</h1>
            <video controls crossorigin="anonymous">
              <source src="${SERVER_URL}/uploads/videos/${
      video.videoFile.filename
    }" type="${video.videoFile.mimetype}">
              Your browser does not support the video tag.
            </video>
            <p>${video.description || ""}</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
