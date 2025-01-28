const express = require("express");
const {
  login,
  register,
  requestPasswordReset,
  resetPassword
} = require("../controllers/auth.controller");
const {
  validatePasswordReset,
  validateResetRequest
} = require("../middleware/auth.validation");

const router = express.Router();

// Remove rate limiters, keep only validation
router.post("/login", login);
router.post("/register", register);

router.post(
  "/reset-password/request",
  validateResetRequest,  // Keep validation
  requestPasswordReset
);

router.post(
  "/reset-password/:token",
  validatePasswordReset,  // Keep validation
  resetPassword
);

module.exports = router;
