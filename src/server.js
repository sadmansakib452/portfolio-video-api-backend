const app = require("./app");
const config = require("./config/config");
const connectDB = require("./utils/db");

const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
