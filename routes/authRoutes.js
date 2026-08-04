const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const AdminController = require("../controllers/AdminController");

// Admin Authentication
router.post("/admin/login", AdminController.adminLogin);
router.get("/getprofile", protect, AdminController.getAdminProfile);
router.put("/admin/updateprofile", protect, AdminController.UpdateAdminProfile);
router.post("/admin/logout", AdminController.LogoutProfile);

module.exports = router;
