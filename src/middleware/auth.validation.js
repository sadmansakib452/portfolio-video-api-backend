const validatePasswordReset = (req, res, next) => {
  try {
    const { password } = req.body;

    // Password validation rules
    if (!password || password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Validation failed"
    });
  }
};

const validateResetRequest = (req, res, next) => {
  try {
    const { email } = req.body;

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Please provide a valid email address"
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Validation failed"
    });
  }
};

module.exports = {
  validatePasswordReset,
  validateResetRequest
}; 