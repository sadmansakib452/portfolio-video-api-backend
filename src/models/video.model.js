const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    basePath: {
      type: String,
    },
    videoFile: {
      filename: String,
      size: Number,
      mimetype: String,
    },
    thumbnailFile: {
      filename: String,
      size: Number,
      mimetype: String,
    },
    brandLogoFile: {
      filename: String,
      size: Number,
      mimetype: String,
    },
    version: {
      type: Number,
      default: 1,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model("Video", videoSchema);
module.exports = Video;
