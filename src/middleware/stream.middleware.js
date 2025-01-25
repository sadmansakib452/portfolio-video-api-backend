const fs = require("fs");
const path = require("path");

const streamVideo = (req, res, next) => {
  let stream = null;

  try {
    // Clean the URL path to prevent directory traversal
    const relativePath = req.url
      .replace(/^\/uploads\//, "")
      .replace(/\.\./g, "")
      .replace(/[^a-zA-Z0-9\-\_\/\.]/, "");

    const videoPath = path.join(__dirname, "..", "..", "uploads", relativePath);

    console.log("🎥 Streaming request:", {
      url: req.url,
      path: videoPath,
      mimetype: path.extname(videoPath),
    });

    // Validate file path and existence
    if (!fs.existsSync(videoPath)) {
      console.error("❌ Video file not found:", videoPath);
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    // Validate file type
    const mimeType = path.extname(videoPath).toLowerCase();
    if (![".mp4", ".webm", ".ogg"].includes(mimeType)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid video format",
      });
    }

    // Get video stats
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set common headers
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", `video/${mimeType.slice(1)}`);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=3600");

    if (range) {
      try {
        // Handle range request (partial content)
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        // Validate range
        if (start >= fileSize || end >= fileSize || start > end) {
          res.setHeader("Content-Range", `bytes */${fileSize}`);
          return res.status(416).json({
            status: "error",
            message: "Requested range not satisfiable",
          });
        }

        console.log("📊 Streaming range:", { start, end, chunksize });

        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", chunksize);
        res.status(206);

        stream = fs.createReadStream(videoPath, { start, end });
      } catch (error) {
        console.error("❌ Range parsing error:", error);
        // Fall back to full content if range is invalid
        stream = fs.createReadStream(videoPath);
        res.setHeader("Content-Length", fileSize);
        res.status(200);
      }
    } else {
      // Handle full content request
      console.log("📊 Streaming full content:", { size: fileSize });
      res.setHeader("Content-Length", fileSize);
      res.status(200);
      stream = fs.createReadStream(videoPath);
    }

    // Handle stream errors
    stream.on("error", (error) => {
      console.error("❌ Stream error:", error);
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({
          status: "error",
          message: "Error streaming video",
        });
      }
    });

    // Handle successful completion
    stream.on("end", () => {
      console.log("✅ Stream completed successfully");
      cleanup();
    });

    // Pipe the stream to response
    stream.pipe(res);

    // Handle client disconnect
    req.on("close", () => cleanup());
    req.on("end", () => cleanup());
    res.on("finish", () => cleanup());
  } catch (error) {
    console.error("❌ Streaming error:", error);
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({
        status: "error",
        message: "Error processing video request",
      });
    }
  }

  // Cleanup function
  function cleanup() {
    if (stream) {
      stream.destroy();
      stream = null;
    }
  }
};

module.exports = { streamVideo };
