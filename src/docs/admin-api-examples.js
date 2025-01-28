/**
 * Example API requests for admin management
 *
 * 1. Login as Super Admin:
 * POST /api/auth/login
 * {
 *   "email": "superadmin@admin.com",
 *   "password": "superadmin123"
 * }
 *
 * 2. Create New Admin:
 * POST /api/admins
 * Headers: { Authorization: "Bearer <token>" }
 * {
 *   "username": "newadmin",
 *   "email": "newadmin@example.com",
 *   "password": "admin123"
 * }
 *
 * 3. Get All Admins:
 * GET /api/admins
 * Headers: { Authorization: "Bearer <token>" }
 *
 * 4. Delete Admin:
 * DELETE /api/admins/:adminId
 * Headers: { Authorization: "Bearer <token>" }
 */
