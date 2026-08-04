const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const AdminController = require("../controllers/AdminController");

// Admin Authentication
router.post("/login", AdminController.adminLogin);
router.get("/getprofile", protect, AdminController.getAdminProfile);
router.put("/updateprofile", protect, AdminController.UpdateAdminProfile);
router.post("/logout", AdminController.LogoutProfile);

module.exports = router;
