const isSuperAdmin = async (req, res, next) => {
  try {
    // req.user is set by auth middleware
    if (!req.user || !req.user.isSuperAdmin) {
      return res.status(403).json({
        status: "error",
        message: "Super Admin access required",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error verifying super admin access",
    });
  }
};

module.exports = { isSuperAdmin };
