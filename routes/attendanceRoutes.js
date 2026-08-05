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

//  Cron: Backfill Absent Records
router.get("/absent/markabsent", cronAuth, async (req, res) => {
  try {
    let targetDate;

    if (req.query.date) {
      // Manual override — admin explicitly asked for a specific date
      targetDate = req.query.date;
    } else {
      // Default: yesterday, in Pakistan time
      const now = new Date();
      const pkDate = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })
      );
      
      pkDate.setDate(pkDate.getDate() - 1);
      
      // en-CA gives YYYY-MM-DD format
      targetDate = pkDate.toLocaleDateString("en-CA");
    }

    const count = await backfillAbsentForDate(targetDate);

    res.status(200).json({
      message: `${count} absent records created for ${targetDate}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;