const express = require("express");
const {
  createAdmin,
  getAllAdmins,
  deleteAdmin,
  updateAdmin,
} = require("../controllers/admin.controller");
const auth = require("../middleware/auth.middleware");
const { isSuperAdmin } = require("../middleware/superadmin.middleware");
const {
  validateAdminCreation,
  validateAdminOperation,
  validateAdminUpdate,
} = require("../middleware/admin.validation");

const router = express.Router();

// All routes require authentication and super admin access
router.use(auth);
router.use(isSuperAdmin);

// Admin management routes with validation
router.post("/", validateAdminCreation, createAdmin);
router.get("/", getAllAdmins);
router.delete("/:id", validateAdminOperation, deleteAdmin);

// Add new update routes
router.put("/:id", validateAdminOperation, validateAdminUpdate, updateAdmin);
router.patch("/:id", validateAdminOperation, validateAdminUpdate, updateAdmin);

module.exports = router;
