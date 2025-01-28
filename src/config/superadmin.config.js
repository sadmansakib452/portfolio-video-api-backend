const superAdminConfig = {
  email: process.env.SUPER_ADMIN_EMAIL,
  password: process.env.SUPER_ADMIN_PASSWORD,
  username: process.env.SUPER_ADMIN_USERNAME,
};

// Validate super admin configuration
const validateSuperAdminConfig = () => {
  const { email, password, username } = superAdminConfig;

  if (!email || !password || !username) {
    console.error(
      "❌ Super admin configuration missing in environment variables"
    );
    process.exit(1);
  }

  return true;
};

module.exports = { superAdminConfig, validateSuperAdminConfig };
