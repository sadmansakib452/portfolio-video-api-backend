const User = require("../models/user.model");
const { superAdminConfig } = require("../config/superadmin.config");
const { logger } = require("./logger");

const initializeSuperAdmin = async () => {
  try {
    // First, try to find super admin by email
    let superAdmin = await User.findOne({ email: superAdminConfig.email });

    // If no super admin exists by email, try to find by username
    if (!superAdmin) {
      const existingUserWithUsername = await User.findOne({
        username: superAdminConfig.username,
      });

      if (existingUserWithUsername) {
        // If user exists with same username but different email, update it to be super admin
        existingUserWithUsername.email = superAdminConfig.email;
        existingUserWithUsername.password = superAdminConfig.password;
        existingUserWithUsername.isAdmin = true;
        existingUserWithUsername.isSuperAdmin = true;
        await existingUserWithUsername.save();
        logger.info("✅ Existing user converted to super admin");
        return existingUserWithUsername;
      }

      // If no user exists with the username, create new super admin
      superAdmin = await User.create({
        email: superAdminConfig.email,
        password: superAdminConfig.password,
        username: superAdminConfig.username,
        isAdmin: true,
        isSuperAdmin: true,
      });
      logger.info("✅ Super admin created successfully");
    } else {
      // Update existing super admin if credentials changed
      const credentialsChanged =
        superAdmin.username !== superAdminConfig.username ||
        !(await superAdmin.comparePassword(superAdminConfig.password));

      if (credentialsChanged) {
        superAdmin.username = superAdminConfig.username;
        superAdmin.password = superAdminConfig.password;
        await superAdmin.save();
        logger.info("✅ Super admin credentials updated from ENV");
      } else {
        logger.info("✅ Super admin already exists, no updates needed");
      }
    }

    return superAdmin;
  } catch (error) {
    logger.error("❌ Super admin initialization failed:", error);
    throw error;
  }
};

module.exports = { initializeSuperAdmin };
