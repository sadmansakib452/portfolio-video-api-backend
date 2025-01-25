const validateVideoData = (video) => {
  const required = [
    "title",
    "slug",
    "videoFile.filename",
    "thumbnailFile.filename",
  ];

  for (const field of required) {
    const value = field.split(".").reduce((obj, key) => obj?.[key], video);
    if (!value) {
      console.error(`Missing required field: ${field}`, video);
      return false;
    }
  }
  return true;
};

const generateVideoUrls = (video, serverUrl) => {
  if (!validateVideoData(video)) {
    throw new Error("Invalid video data");
  }

  return {
    videoUrl: `${serverUrl}/uploads/videos/${video.videoFile.filename}`,
    thumbnailUrl: `${serverUrl}/uploads/thumbnails/${video.thumbnailFile.filename}`,
  };
};

module.exports = { validateVideoData, generateVideoUrls };
