const express = require("express");
const { register, login } = require("../controllers/auth.controller");

const router = express.Router();

// Simple routes without version
router.post("/register", register);
router.post("/login", login);

module.exports = router;
