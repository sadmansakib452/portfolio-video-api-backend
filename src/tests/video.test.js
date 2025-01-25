const request = require("supertest");
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
const app = require("../app");
const Video = require("../models/video.model");
const User = require("../models/user.model");
const { generateToken } = require("../utils/auth.utils");

describe("Video Management", () => {
  let token;
  let userId;
  let videoId;
  let testVideo;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });
    userId = user._id;
    token = generateToken(user);

    // Create test video
    testVideo = await Video.create({
      title: "Test Video",
      slug: "test-video",
      description: "Test description",
      videoFile: {
        filename: "test-video.mp4",
        size: 1024,
        mimetype: "video/mp4",
      },
      thumbnailFile: {
        filename: "test-thumbnail.jpg",
        size: 1024,
        mimetype: "image/jpeg",
      },
      user: userId,
    });
    videoId = testVideo._id;

    // Create test files
    const uploadsDir = path.join(__dirname, "..", "..", "uploads");
    const videosDir = path.join(uploadsDir, "videos");
    const thumbnailsDir = path.join(uploadsDir, "thumbnails");

    await fs.mkdir(videosDir, { recursive: true });
    await fs.mkdir(thumbnailsDir, { recursive: true });

    await fs.writeFile(
      path.join(videosDir, "test-video.mp4"),
      "test video content"
    );
    await fs.writeFile(
      path.join(thumbnailsDir, "test-thumbnail.jpg"),
      "test thumbnail content"
    );
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.unlink(
        path.join(__dirname, "..", "..", "uploads", "videos", "test-video.mp4")
      );
      await fs.unlink(
        path.join(
          __dirname,
          "..",
          "..",
          "uploads",
          "thumbnails",
          "test-thumbnail.jpg"
        )
      );
    } catch (error) {
      console.error("Cleanup error:", error);
    }

    // Cleanup database
    await User.deleteMany({});
    await Video.deleteMany({});
    await mongoose.connection.close();
  });

  // Delete video tests
  describe("DELETE /api/videos/:id", () => {
    it("should delete video successfully", async () => {
      const response = await request(app)
        .delete(`/api/videos/${videoId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "success",
        message: "Video deleted successfully",
      });

      // Verify video is deleted from database
      const deletedVideo = await Video.findById(videoId);
      expect(deletedVideo).toBeNull();
    });

    it("should return 404 for non-existent video", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/videos/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "Video not found or unauthorized",
      });
    });

    it("should not allow unauthorized deletion", async () => {
      const response = await request(app).delete(`/api/videos/${videoId}`);

      expect(response.status).toBe(401);
    });
  });

  // Update video tests
  describe("PATCH /api/videos/:id", () => {
    it("should update video metadata successfully", async () => {
      const updateData = {
        title: "Updated Test Video",
        description: "Updated description",
      };

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set("Authorization", `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.video).toMatchObject({
        title: updateData.title,
        description: updateData.description,
        slug: "updated-test-video",
      });
    });

    it("should prevent duplicate titles", async () => {
      // Create another video first
      await Video.create({
        title: "Existing Video",
        slug: "existing-video",
        description: "Another video",
        videoFile: {
          filename: "existing.mp4",
          size: 1024,
          mimetype: "video/mp4",
        },
        thumbnailFile: {
          filename: "existing.jpg",
          size: 1024,
          mimetype: "image/jpeg",
        },
        user: userId,
      });

      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Existing Video" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: "error",
        message: "A video with this title already exists",
      });
    });

    it("should not allow unauthorized updates", async () => {
      const response = await request(app)
        .patch(`/api/videos/${videoId}`)
        .send({ title: "Hacked Video" });

      expect(response.status).toBe(401);
    });
  });

  // Add this new test suite inside the "Video Management" describe block
  describe("POST /api/videos/bulk-delete", () => {
    let videosToDelete = [];

    beforeEach(async () => {
      // Create multiple test videos
      const videoPromises = Array.from({ length: 3 }).map((_, index) =>
        Video.create({
          title: `Test Video ${index + 1}`,
          slug: `test-video-${index + 1}`,
          description: "Test description",
          videoFile: {
            filename: `test-video-${index + 1}.mp4`,
            size: 1024,
            mimetype: "video/mp4",
          },
          thumbnailFile: {
            filename: `test-thumbnail-${index + 1}.jpg`,
            size: 1024,
            mimetype: "image/jpeg",
          },
          user: userId,
        })
      );

      const videos = await Promise.all(videoPromises);
      videosToDelete = videos.map((v) => v._id);

      // Create test files
      const uploadsDir = path.join(__dirname, "..", "..", "uploads");
      const videosDir = path.join(uploadsDir, "videos");
      const thumbnailsDir = path.join(uploadsDir, "thumbnails");

      await Promise.all(
        videos.map(async (video) => {
          await fs.writeFile(
            path.join(videosDir, video.videoFile.filename),
            "test video content"
          );
          await fs.writeFile(
            path.join(thumbnailsDir, video.thumbnailFile.filename),
            "test thumbnail content"
          );
        })
      );
    });

    afterEach(async () => {
      // Cleanup test files
      const uploadsDir = path.join(__dirname, "..", "..", "uploads");
      const videosDir = path.join(uploadsDir, "videos");
      const thumbnailsDir = path.join(uploadsDir, "thumbnails");

      for (let i = 1; i <= 3; i++) {
        try {
          await fs.unlink(path.join(videosDir, `test-video-${i}.mp4`));
          await fs.unlink(path.join(thumbnailsDir, `test-thumbnail-${i}.jpg`));
        } catch (error) {
          // Ignore errors if files don't exist
        }
      }
    });

    it("should delete multiple videos successfully", async () => {
      const response = await request(app)
        .post("/api/videos/bulk-delete")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: videosToDelete });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.data.deletedCount).toBe(videosToDelete.length);
      expect(response.body.data.successfulDeletes).toHaveLength(
        videosToDelete.length
      );

      // Verify videos are deleted from database
      const remainingVideos = await Video.find({
        _id: { $in: videosToDelete },
      });
      expect(remainingVideos).toHaveLength(0);
    });

    it("should handle invalid input", async () => {
      const response = await request(app)
        .post("/api/videos/bulk-delete")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: "not-an-array" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: "error",
        message: "Please provide an array of video IDs",
      });
    });

    it("should handle unauthorized access", async () => {
      const response = await request(app)
        .post("/api/videos/bulk-delete")
        .send({ ids: videosToDelete });

      expect(response.status).toBe(401);
    });

    it("should handle non-existent videos", async () => {
      const fakeIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];

      const response = await request(app)
        .post("/api/videos/bulk-delete")
        .set("Authorization", `Bearer ${token}`)
        .send({ ids: fakeIds });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: "error",
        message: "No videos found or unauthorized",
      });
    });
  });
});
