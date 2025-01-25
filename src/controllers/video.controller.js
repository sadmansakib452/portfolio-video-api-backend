const fs = require("fs").promises;
const path = require("path");
const Video = require("../models/video.model");
const { createFilePaths, generateSlug } = require("../utils/file.utils");
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";
const mongoose = require("mongoose");

// Check if title is available
const checkTitle = async (req, res) => {
  try {
    const { title } = req.body;
    const exists = await Video.exists({ title });
    res.json({
      status: "success",
      data: { available: !exists },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Create a new video
const uploadVideo = async (req, res) => {
  try {
    console.log("\n🎬 --- Video Upload Controller ---");
    console.log("📁 Files received:", JSON.stringify(req.files, null, 2));
    console.log("📝 Body received:", req.body);

    const { title, description } = req.body;

    // Generate slug from title
    const slug = generateSlug(title);

    // Check if files were uploaded
    if (!req.files?.video?.[0] || !req.files?.thumbnail?.[0]) {
      console.log("❌ Missing required files");
      return res.status(400).json({
        status: "error",
        message: "Please upload both video and thumbnail",
      });
    }

    // Check if title exists
    const titleExists = await Video.exists({ $or: [{ title }, { slug }] });
    if (titleExists) {
      // Clean up uploaded files
      await Promise.all([
        fs.unlink(req.files.video[0].path),
        fs.unlink(req.files.thumbnail[0].path),
      ]);

      return res.status(400).json({
        status: "error",
        message: "A video with this title or slug already exists",
      });
    }

    // Create video entry
    const video = await Video.create({
      title,
      slug,
      description,
      videoFile: {
        filename: req.files.video[0].filename,
        size: req.files.video[0].size,
        mimetype: req.files.video[0].mimetype,
      },
      thumbnailFile: {
        filename: req.files.thumbnail[0].filename,
        size: req.files.thumbnail[0].size,
        mimetype: req.files.thumbnail[0].mimetype,
      },
      user: req.user._id,
    });

    // Convert to plain object and remove unnecessary fields
    const videoData = video.toObject();
    delete videoData.__v;
    delete videoData.createdAt;
    delete videoData.updatedAt;

    const videoWithUrls = generateFileUrls(videoData);

    console.log("✨ Video entry created successfully");
    res.status(201).json({
      status: "success",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);

    // Clean up uploaded files in case of error
    if (req.files) {
      try {
        if (req.files.video?.[0]) {
          await fs.unlink(req.files.video[0].path);
        }
        if (req.files.thumbnail?.[0]) {
          await fs.unlink(req.files.thumbnail[0].path);
        }
      } catch (cleanupError) {
        console.error("❌ Error cleaning up files:", cleanupError);
      }
    }

    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// This function transforms database object to response object
const generateFileUrls = (video) => {
  if (!video) return null;

  // Pick only the fields we want to return
  const { _id, title, slug, description, videoFile, thumbnailFile, version } =
    video;

  return {
    _id,
    title,
    slug,
    description,
    version,
    videoFile,
    thumbnailFile,
    // Dynamically generate URLs using SERVER_URL
    videoUrl: `${SERVER_URL}/uploads/videos/${videoFile.filename}`,
    thumbnailUrl: `${SERVER_URL}/uploads/thumbnails/${thumbnailFile.filename}`,
  };
};

// Get all videos with file URLs
const getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .populate("user", "username")
      .select("-__v -createdAt -updatedAt")
      .lean({ virtuals: true });

    const videosWithUrls = videos.map(generateFileUrls);

    res.json({
      status: "success",
      data: { videos: videosWithUrls },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Delete video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    // Find video without user check
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    console.log("🗑️ Deleting video:", {
      videoId: id,
      title: video.title,
      requestedBy: req.user._id,
    });

    // Delete associated files
    try {
      await fs.unlink(path.join("uploads", "videos", video.videoFile.filename));
      await fs.unlink(
        path.join("uploads", "thumbnails", video.thumbnailFile.filename)
      );
    } catch (error) {
      console.error("❌ Error deleting files:", error);
      // Continue with video deletion even if files can't be deleted
    }

    // Delete video document without user check
    await Video.findByIdAndDelete(id);

    res.json({
      status: "success",
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update video metadata
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    // Find video and check ownership
    const video = await Video.findOne({ _id: id, user: req.user._id });
    if (!video) {
      return res.status(404).json({
        status: "error",
        message: "Video not found or unauthorized",
      });
    }

    // If title is being updated, check for duplicates
    if (title && title !== video.title) {
      const newSlug = generateSlug(title);
      const exists = await Video.exists({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (exists) {
        return res.status(400).json({
          status: "error",
          message: "A video with this title already exists",
        });
      }

      video.title = title;
      video.slug = newSlug;
    }

    if (description) {
      video.description = description;
    }

    video.version += 1;
    await video.save();

    const videoWithUrls = generateFileUrls(video.toObject());

    res.json({
      status: "success",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update video file
const updateVideoFile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No video file provided",
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    // Delete old file
    try {
      await fs.unlink(path.join("uploads", "videos", video.videoFile.filename));
    } catch (error) {
      console.error("❌ Error deleting old file:", error);
    }

    // Update video file info
    video.videoFile = {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };
    video.version += 1;

    await video.save();
    const videoWithUrls = generateFileUrls(video.toObject());

    res.json({
      status: "success",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Update file error:", error);
    // Clean up uploaded file in case of error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("❌ Error cleaning up file:", cleanupError);
      }
    }
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update thumbnail
const updateThumbnail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No thumbnail file provided",
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    // Delete old thumbnail
    try {
      await fs.unlink(
        path.join("uploads", "thumbnails", video.thumbnailFile.filename)
      );
    } catch (error) {
      console.error("❌ Error deleting old thumbnail:", error);
    }

    // Update thumbnail info
    video.thumbnailFile = {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    await video.save();
    const videoWithUrls = generateFileUrls(video.toObject());

    res.json({
      status: "success",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Update thumbnail error:", error);
    // Clean up uploaded file in case of error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("❌ Error cleaning up file:", cleanupError);
      }
    }
    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Add this new method for bulk delete
const bulkDeleteVideos = async (req, res) => {
  try {
    const { ids } = req.body;

    // Input validation
    if (!ids) {
      return res.status(400).json({
        status: "error",
        message: "No IDs provided",
      });
    }

    // Ensure ids is an array and has valid format
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Please provide an array of video IDs",
      });
    }

    // Validate each ID format
    const validIds = ids.every((id) => /^[0-9a-fA-F]{24}$/.test(id));
    if (!validIds) {
      return res.status(400).json({
        status: "error",
        message: "One or more invalid video IDs provided",
      });
    }

    // Find all videos without user check
    const videos = await Video.find({ _id: { $in: ids } });

    if (videos.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No videos found",
      });
    }

    // Collect all file paths to delete
    const filesToDelete = videos.reduce((acc, video) => {
      acc.push(
        path.join("uploads", "videos", video.videoFile.filename),
        path.join("uploads", "thumbnails", video.thumbnailFile.filename)
      );
      return acc;
    }, []);

    // Delete all files
    await Promise.all(
      filesToDelete.map((filePath) =>
        fs.unlink(filePath).catch((err) => {
          console.error(`Failed to delete file ${filePath}:`, err);
        })
      )
    );

    // Delete all videos from database without user check
    const result = await Video.deleteMany({ _id: { $in: ids } });

    res.json({
      status: "success",
      data: {
        deletedCount: result.deletedCount,
        successfulDeletes: videos.map((v) => v._id),
      },
    });
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Add this helper function
const verifyVideoExists = async (videoId) => {
  // First verify if ID is valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    console.log("❌ Invalid video ID format:", videoId);
    return null;
  }

  // Check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    console.log("❌ Video not found with ID:", videoId);
    return null;
  }

  console.log("✅ Video found:", {
    id: video._id,
    title: video.title,
    userId: video.user,
  });

  return video;
};

// Update the updateAllVideoData function
const updateAllVideoData = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const hasFiles = req.files && (req.files.video || req.files.thumbnail);

    // Check if any data is provided for update
    if (!title && !description && !hasFiles) {
      console.log("❌ No update data provided");
      return res.status(400).json({
        status: "error",
        message:
          "Please provide at least one field to update (title, description, video, or thumbnail)",
      });
    }

    // First verify video exists without user check
    const video = await Video.findById(id);
    if (!video) {
      // Clean up any uploaded files
      if (req.files) {
        if (req.files.video?.[0]) await fs.unlink(req.files.video[0].path);
        if (req.files.thumbnail?.[0])
          await fs.unlink(req.files.thumbnail[0].path);
      }
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    console.log("🔍 Starting update request:", {
      videoId: id,
      userId: req.user._id,
      currentTitle: video.title,
      newTitle: title || "No change",
      description: description || "No change",
      files: req.files ? Object.keys(req.files) : [],
      hasUpdates: {
        title: Boolean(title),
        description: Boolean(description),
        video: Boolean(req.files?.video),
        thumbnail: Boolean(req.files?.thumbnail),
      },
    });

    // If title is being updated, check for duplicates
    if (title && title !== video.title) {
      const newSlug = generateSlug(title);
      const exists = await Video.exists({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (exists) {
        // Clean up any uploaded files
        if (req.files) {
          if (req.files.video?.[0]) await fs.unlink(req.files.video[0].path);
          if (req.files.thumbnail?.[0])
            await fs.unlink(req.files.thumbnail[0].path);
        }
        return res.status(400).json({
          status: "error",
          message: "A video with this title already exists",
        });
      }

      video.title = title;
      video.slug = newSlug;
    }

    // Update description if provided
    if (description) {
      video.description = description;
    }

    // Update video file if provided
    if (req.files?.video?.[0]) {
      try {
        // Delete old video file
        await fs.unlink(
          path.join("uploads", "videos", video.videoFile.filename)
        );
      } catch (error) {
        console.error("❌ Error deleting old video file:", error);
      }

      // Update video file info
      video.videoFile = {
        filename: req.files.video[0].filename,
        size: req.files.video[0].size,
        mimetype: req.files.video[0].mimetype,
      };
    }

    // Update thumbnail if provided
    if (req.files?.thumbnail?.[0]) {
      try {
        // Delete old thumbnail file
        await fs.unlink(
          path.join("uploads", "thumbnails", video.thumbnailFile.filename)
        );
      } catch (error) {
        console.error("❌ Error deleting old thumbnail file:", error);
      }

      // Update thumbnail info
      video.thumbnailFile = {
        filename: req.files.thumbnail[0].filename,
        size: req.files.thumbnail[0].size,
        mimetype: req.files.thumbnail[0].mimetype,
      };
    }

    // Increment version
    video.version += 1;
    await video.save();

    const videoWithUrls = generateFileUrls(video.toObject());

    res.json({
      status: "success",
      data: { video: videoWithUrls },
    });
  } catch (error) {
    console.error("❌ Update all error:", error);
    // Clean up any uploaded files in case of error
    if (req.files) {
      try {
        if (req.files.video?.[0]) await fs.unlink(req.files.video[0].path);
        if (req.files.thumbnail?.[0])
          await fs.unlink(req.files.thumbnail[0].path);
      } catch (cleanupError) {
        console.error("❌ Error cleaning up files:", cleanupError);
      }
    }
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

module.exports = {
  checkTitle,
  uploadVideo,
  getAllVideos,
  deleteVideo,
  updateVideo,
  updateVideoFile,
  updateThumbnail,
  bulkDeleteVideos,
  updateAllVideoData,
};
