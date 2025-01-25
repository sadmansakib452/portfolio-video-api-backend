const path = require("path");

/**
 * Generates a clean filename from title and extension
 * Example: "My Test Video" -> "my-test-video-2024.03.22-14.30.22.mp4"
 */
const generateFileName = (title, originalFileName) => {
  // Get file extension from original file
  const ext = path.extname(originalFileName);

  // Get current date and time
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join(".");

  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join(".");

  // Format: slug-YYYY.MM.DD-HH.MM.SS.ext
  return `${title}-${date}-${time}${ext}`;
};

/**
 * Creates file paths for video and thumbnail
 */
const createFilePaths = (title, videoFile, thumbnailFile) => {
  const videoFileName = generateFileName(title, videoFile.originalname);
  const thumbnailFileName = generateFileName(title, thumbnailFile.originalname);

  return {
    videoPath: path.join("uploads", "videos", videoFileName),
    thumbnailPath: path.join("uploads", "thumbnails", thumbnailFileName),
    videoFileName,
    thumbnailFileName,
  };
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim(); // Remove whitespace from ends
};

module.exports = {
  generateFileName,
  createFilePaths,
  generateSlug,
};
