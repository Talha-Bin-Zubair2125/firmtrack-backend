const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const attendanceController = require("../controllers/attendanceController");
const employeeController = require("../controllers/employeeController");

const {
  markAttendance,
  getAllAttendance,
  getAttendanceByMonth,
  getTodayAttendanceStatus,
  backfillAbsentForDate,
} = attendanceController;

// Mobile App
router.post("/mark", markAttendance);

// Web Admin
router.get("/attendance/getall", protect, getAllAttendance);
router.get("/report/bymonth", getAttendanceByMonth);
router.get("/attendance/status/:employeeID", getTodayAttendanceStatus);
router.post("/employees/change-password", employeeController.changePassword);

module.exports = router;
