const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const attendanceController = require("../controllers/attendanceController");
const employeeController = require("../controllers/EmployeeController");
const cronAuth = require("../middlewares/cronAuth");

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

router.get("/absent/markabsent", cronAuth, async (req, res) => {
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
    }).format(new Date());

    const date = req.query.date || today;

    const count = await backfillAbsentForDate(date);

    res.status(200).json({
      message: `${count} absent records created for ${date}`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;
