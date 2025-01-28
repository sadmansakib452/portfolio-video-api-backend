const app = require("./app");
const config = require("./config/config");
const connectDB = require("./utils/db");
const { validateSuperAdminConfig } = require("./config/superadmin.config");
const { initializeSuperAdmin } = require("./utils/superadmin.utils");

const startServer = async () => {
  try {
    // Validate super admin config before starting
    validateSuperAdminConfig();

    // Connect to database
    await connectDB();

    // Initialize super admin
    await initializeSuperAdmin();

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
