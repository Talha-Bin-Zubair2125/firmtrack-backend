const Attendance = require("../models/AttendanceModel");
const QR = require("../models/qrModel");
const Employee = require("../models/Employee_Model");
const Deduction = require("../models/deductionModel");

//  Pakistan Time Helpers
const getPakistanDayRange = () => {
  const now = new Date();
  const pktTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);

  const yyyy = pktTime.getUTCFullYear();
  const mm = pktTime.getUTCMonth();
  const dd = pktTime.getUTCDate();

  const start = new Date(Date.UTC(yyyy, mm, dd, -5, 0, 0, 0));
  const end = new Date(Date.UTC(yyyy, mm, dd, 18, 59, 59, 999));

  return { start, end, pktTime, now };
};

const getDayRangeForDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -5, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 18, 59, 59, 999));
  return { start, end };
};

//  Mark Attendance via QR
const markAttendance = async (req, res) => {
  const { token, employeeID } = req.body;

  try {
    const activeQR = await QR.findOne({ token, isActive: true });
    if (!activeQR) {
      return res.status(400).json({ message: "Invalid QR code" });
    }

    if (new Date() > activeQR.expiresAt) {
      return res
        .status(400)
        .json({ message: "QR code expired. Ask admin to refresh." });
    }

    const employee = await Employee.findOne({ employeeID });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { start, end, pktTime, now } = getPakistanDayRange();

    const hours = pktTime.getUTCHours();
    const minutes = pktTime.getUTCMinutes();
    const currentTimeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    const alreadyMarked = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: start, $lte: end },
    });

    if (alreadyMarked) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for today" });
    }

    const settings = await Deduction.findOne();

    let status = "present";
    let deduction = 0;

    if (currentTimeStr > "12:00") {
      status = "half-day";
      deduction = settings?.deductionPerHalfDay || 0;
    } else if (currentTimeStr > "11:00") {
      status = "late";
      deduction = settings?.deductionPerLate || 0;
    }

    const attendance = await Attendance.create({
      employeeId: employee._id,
      date: now,
      checkInTime: now,
      status,
      month: pktTime.getUTCMonth() + 1,
      year: pktTime.getUTCFullYear(),
      deduction,
    });

    res.status(201).json({
      message: `Attendance marked as ${status}`,
      attendance: {
        employeeName: employee.EmployeeName,
        status,
        checkInTime: attendance.checkInTime,
        deduction,
      },
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Server error marking attendance" });
  }
};

//  Get All Attendance (admin)
const getAllAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate(
        "employeeId",
        "EmployeeName employeeID EmployeeRole EmployeeSalary createdAt",
      )
      .sort({ date: -1 });

    res.status(200).json({ attendance });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error fetching attendance" });
  }
};

//  Get Attendance By Month (reports)
const getAttendanceByMonth = async (req, res) => {
  const { month, year, employeeID } = req.query;
  try {
    let filter = {
      month: parseInt(month),
      year: parseInt(year),
    };

    let employeeObj = null;
    if (employeeID) {
      employeeObj = await Employee.findOne({ employeeID });
      if (employeeObj) {
        filter.employeeId = employeeObj._id;
      } else {
        return res
          .status(200)
          .json({
            attendance: [],
            employeeCreatedAt: null,
            defaultAbsentDeduction: 0,
          });
      }
    }

    const attendance = await Attendance.find(filter)
      .populate(
        "employeeId",
        "EmployeeName employeeID EmployeeRole EmployeeSalary",
      )
      .sort({ date: -1 });

    const settings = await Deduction.findOne();
    const defaultAbsentDeduction = settings?.deductionPerAbsence || 0;

    const results = [...attendance];

    const { pktTime } = getPakistanDayRange();

    const todayYear = pktTime.getUTCFullYear();
    const todayMonth = pktTime.getUTCMonth() + 1;
    const todayDate = pktTime.getUTCDate();

    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    if (employeeID && employeeObj) {
      const joining = new Date(employeeObj.createdAt);
      const joinPkt = new Date(joining.getTime() + 5 * 60 * 60 * 1000);
      const joinYear = joinPkt.getUTCFullYear();
      const joinMonth = joinPkt.getUTCMonth() + 1;
      const joinDate = joinPkt.getUTCDate();

      for (let i = 1; i <= daysInMonth; i++) {
        const py = parseInt(year);
        const pm = parseInt(month);

        if (py > todayYear) continue;
        if (py === todayYear && pm > todayMonth) continue;
        if (py === todayYear && pm === todayMonth && i > todayDate) continue;

        if (py < joinYear) continue;
        if (py === joinYear && pm < joinMonth) continue;
        if (py === joinYear && pm === joinMonth && i < joinDate) continue;

        const dummyDate = new Date(Date.UTC(py, pm - 1, i, 12, 0, 0));
        if (dummyDate.getUTCDay() === 0) continue;

        const exists = results.find((a) => {
          const aDate = new Date(a.date);
          const aPkt = new Date(aDate.getTime() + 5 * 60 * 60 * 1000);
          return (
            aPkt.getUTCDate() === i &&
            aPkt.getUTCMonth() + 1 === pm &&
            aPkt.getUTCFullYear() === py
          );
        });

        if (!exists) {
          const virtualDate = new Date(Date.UTC(py, pm - 1, i, 7, 0, 0));
          results.push({
            date: virtualDate,
            checkInTime: null,
            status: "absent",
            deduction: defaultAbsentDeduction,
            employeeId: {
              EmployeeName: employeeObj.EmployeeName,
              employeeID: employeeID,
            },
          });
        }
      }
    }

    res.status(200).json({
      attendance: results.sort((a, b) => new Date(b.date) - new Date(a.date)),
      employeeCreatedAt: employeeObj?.createdAt,
      defaultAbsentDeduction,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  Get Today Attendance Status (mobile)
const getTodayAttendanceStatus = async (req, res) => {
  const { employeeID } = req.params;

  try {
    const employee = await Employee.findOne({ employeeID });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { start, end } = getPakistanDayRange();

    const attendance = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: start, $lte: end },
    });

    if (attendance) {
      return res.status(200).json({ marked: true, status: attendance.status });
    } else {
      return res.status(200).json({ marked: false, status: "Not Marked" });
    }
  } catch (error) {
    console.error("Error checking today status:", error);
    res.status(500).json({ message: "Server error checking status" });
  }
};

//  Backfill Absent for Specific Date
const backfillAbsentForDate = async (dateStr) => {
  const { start, end } = getDayRangeForDate(dateStr);
  const [year, month, day] = dateStr.split("-").map(Number);

  const targetDateISO = new Date(Date.UTC(year, month - 1, day, 7, 0, 0));

  const allEmployees = await Employee.find();
  const settings = await Deduction.findOne();
  const deductionPerAbsence = settings?.deductionPerAbsence || 0;

  let absentCount = 0;

  for (const employee of allEmployees) {
    const marked = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: start, $lte: end },
    });

    if (!marked) {
      await Attendance.create({
        employeeId: employee._id,
        date: targetDateISO,
        checkInTime: targetDateISO,
        status: "absent",
        deduction: deductionPerAbsence,
        month: month,
        year: year,
      });
      absentCount++;
      console.log(
        `❌ Absent backfilled for: ${employee.EmployeeName} on ${dateStr}`,
      );
    }
  }

  return absentCount;
};

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByMonth,
  getTodayAttendanceStatus,
  backfillAbsentForDate,
};
