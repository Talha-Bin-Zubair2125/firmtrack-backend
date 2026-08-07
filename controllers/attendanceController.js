const Attendance = require("../models/AttendanceModel");
const QR = require("../models/qrModel");
const Employee = require("../models/Employee_Model");
const Deduction = require("../models/deductionModel");

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

// NEW UNIFIED DEDUCTION CALCULATOR
const calculateDeduction = async (
  employeeId,
  status,
  month,
  year,
  settings,
) => {
  let deduction = 0;

  switch (status) {
    case "absent":
      deduction = settings.deductionPerAbsence || 0;
      break;

    case "leave": {
      const allowedTotalLeave = settings.allowedTotalLeave || 0;

      const totalLeavesThisMonth = await Attendance.countDocuments({
        employeeId,
        month,
        year,
        status: "leave",
      });

      const totalLeavesAfterThis = totalLeavesThisMonth + 1;

      if (totalLeavesAfterThis > allowedTotalLeave) {
        deduction =
          settings.exceedsTotalLeaveDeduction ||
          settings.deductionPerAbsence ||
          0;
      } else {
        deduction = 0;
      }
      break;
    }

    case "half-day":
      deduction = settings.deductionPerHalfDay || 0;
      break;

    case "late":
      deduction = settings.deductionPerLate || 0;
      break;

    case "present":
    default:
      deduction = 0;
      break;
  }

  return deduction;
};

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

    if (!settings) {
      return res.status(500).json({
        message:
          "Deduction/attendance settings are not configured. Ask admin to set them up before marking attendance.",
      });
    }

    let status = "present";

    const month = pktTime.getUTCMonth() + 1;
    const year = pktTime.getUTCFullYear();

    if (currentTimeStr > "16:00") {
      status = "absent";
    } else if (currentTimeStr > settings.allowedHalfDayTime) {
      status = "half-day";
    } else if (currentTimeStr > settings.lateArrivalTime) {
      status = "late";
    }

    const deduction = await calculateDeduction(
      employee._id,
      status,
      month,
      year,
      settings,
    );

    const attendance = await Attendance.create({
      employeeId: employee._id,
      date: now,
      checkInTime: now,
      status,
      month,
      year,
      deduction,
    });

    console.log(
      `Attendance marked for ${employee.EmployeeName} as ${status} at ${currentTimeStr}. Deduction: ${deduction}`,
    );

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

const getAttendanceByMonth = async (req, res) => {
  const { month, year, employeeID } = req.query;
  try {
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    const settings = await Deduction.findOne();
    const defaultAbsentDeduction = settings?.deductionPerAbsence || 0;
    const { pktTime } = getPakistanDayRange();
    const todayYear = pktTime.getUTCFullYear();
    const todayMonth = pktTime.getUTCMonth() + 1;
    const todayDate = pktTime.getUTCDate();
    const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

    let employees = [];
    if (employeeID) {
      const emp = await Employee.findOne({ employeeID });
      if (!emp) return res.status(200).json({ attendance: [] });
      employees = [emp];
    } else {
      employees = await Employee.find({});
    }

    const allAttendance = await Attendance.find({
      month: parsedMonth,
      year: parsedYear,
    });
    let allResults = [];

    for (const emp of employees) {
      const empAttendance = allAttendance.filter(
        (a) => a.employeeId && a.employeeId.toString() === emp._id.toString(),
      );
      const results = [...empAttendance];
      const joining = new Date(emp.createdAt);
      const joinPkt = new Date(joining.getTime() + 5 * 60 * 60 * 1000);
      const joinYear = joinPkt.getUTCFullYear();
      const joinMonth = joinPkt.getUTCMonth() + 1;
      const joinDate = joinPkt.getUTCDate();

      for (let i = 1; i <= daysInMonth; i++) {
        if (parsedYear > todayYear) continue;
        if (parsedYear === todayYear && parsedMonth > todayMonth) continue;
        if (
          parsedYear === todayYear &&
          parsedMonth === todayMonth &&
          i >= todayDate
        )
          continue;
        if (parsedYear < joinYear) continue;
        if (parsedYear === joinYear && parsedMonth < joinMonth) continue;
        if (
          parsedYear === joinYear &&
          parsedMonth === joinMonth &&
          i < joinDate
        )
          continue;

        const loopDate = new Date(
          Date.UTC(parsedYear, parsedMonth - 1, i, 12, 0, 0),
        );
        if (loopDate.getUTCDay() === 0) continue; // Skip Sundays

        const exists = results.find((r) => {
          if (!r.date) return false;
          const d = new Date(r.date);
          const dPkt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
          return (
            dPkt.getUTCDate() === i &&
            dPkt.getUTCMonth() + 1 === parsedMonth &&
            dPkt.getUTCFullYear() === parsedYear
          );
        });

        if (!exists) {
          results.push({
            _id: `virtual-${emp._id}-${parsedYear}-${parsedMonth}-${i}`,
            employeeId: emp,
            date: new Date(Date.UTC(parsedYear, parsedMonth - 1, i, 5, 0, 0)),
            checkInTime: null,
            status: "absent",
            deduction: defaultAbsentDeduction,
            month: parsedMonth,
            year: parsedYear,
          });
        }
      }
      allResults.push(...results);
    }

    await Employee.populate(allResults, {
      path: "employeeId",
      select: "EmployeeName employeeID EmployeeRole EmployeeSalary createdAt",
    });

    allResults.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({ attendance: allResults });
  } catch (error) {
    console.error("Error fetching attendance by month:", error);
    res.status(500).json({ message: "Server error fetching attendance" });
  }
};

const getMonthlySummaryReport = async (req, res) => {
  const { month, year } = req.query;
  try {
    const parsedMonth = parseInt(month);
    const parsedYear = parseInt(year);
    const settings = await Deduction.findOne();
    const defaultAbsentDeduction = settings?.deductionPerAbsence || 0;
    const { pktTime } = getPakistanDayRange();
    const todayYear = pktTime.getUTCFullYear();
    const todayMonth = pktTime.getUTCMonth() + 1;
    const todayDate = pktTime.getUTCDate();
    const daysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

    const employees = await Employee.find({});
    const allAttendance = await Attendance.find({
      month: parsedMonth,
      year: parsedYear,
    });
    const summary = [];

    for (const emp of employees) {
      const empAttendance = allAttendance.filter(
        (a) => a.employeeId && a.employeeId.toString() === emp._id.toString(),
      );

      const results = [...empAttendance];
      const joining = new Date(emp.createdAt);
      const joinPkt = new Date(joining.getTime() + 5 * 60 * 60 * 1000);
      const joinYear = joinPkt.getUTCFullYear();
      const joinMonth = joinPkt.getUTCMonth() + 1;
      const joinDate = joinPkt.getUTCDate();

      for (let i = 1; i <= daysInMonth; i++) {
        if (parsedYear > todayYear) continue;
        if (parsedYear === todayYear && parsedMonth > todayMonth) continue;
        if (
          parsedYear === todayYear &&
          parsedMonth === todayMonth &&
          i >= todayDate
        )
          continue;
        if (parsedYear < joinYear) continue;
        if (parsedYear === joinYear && parsedMonth < joinMonth) continue;
        if (
          parsedYear === joinYear &&
          parsedMonth === joinMonth &&
          i < joinDate
        )
          continue;

        const loopDate = new Date(
          Date.UTC(parsedYear, parsedMonth - 1, i, 12, 0, 0),
        );
        if (loopDate.getUTCDay() === 0) continue;

        const exists = results.find((r) => {
          if (!r.date) return false;
          const d = new Date(r.date);
          const dPkt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
          return (
            dPkt.getUTCDate() === i &&
            dPkt.getUTCMonth() + 1 === parsedMonth &&
            dPkt.getUTCFullYear() === parsedYear
          );
        });

        if (!exists) {
          results.push({
            status: "absent",
            deduction: defaultAbsentDeduction,
          });
        }
      }

      let present = 0,
        late = 0,
        halfDay = 0,
        absent = 0,
        leave = 0,
        totalDeduction = 0;

      for (const r of results) {
        const st = r.status?.toLowerCase().trim() || "";
        if (st === "present") present++;
        else if (st === "late") late++;
        else if (st === "half-day" || st === "halfday") halfDay++;
        else if (st === "absent") absent++;
        else if (st === "leave") leave++;

        totalDeduction += r.deduction || 0;
      }

      summary.push({
        employeeID: emp.employeeID,
        name: emp.EmployeeName,
        role: emp.EmployeeRole,
        salary: emp.EmployeeSalary || 0,
        present,
        late,
        halfDay,
        absent,
        leave,
        totalDeduction,
      });
    }

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Error fetching monthly summary report:", error);
    res.status(500).json({ message: "Server error fetching report" });
  }
};

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

const backfillAbsentForDate = async (dateStr) => {
  const [year, month, day] = dateStr.split("-").map(Number);

  const targetDateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (targetDateObj.getUTCDay() === 0) {
    return 0;
  }

  const { start, end } = getDayRangeForDate(dateStr);
  const employees = await Employee.find({});
  const settings = await Deduction.findOne();

  if (!settings) {
    throw new Error("Deduction settings are not configured in database.");
  }

  let createdCount = 0;

  for (const employee of employees) {
    if (employee.createdAt) {
      const joining = new Date(employee.createdAt);
      const joinPkt = new Date(joining.getTime() + 5 * 60 * 60 * 1000);
      const joinYear = joinPkt.getUTCFullYear();
      const joinMonth = joinPkt.getUTCMonth() + 1;
      const joinDate = joinPkt.getUTCDate();

      if (
        year < joinYear ||
        (year === joinYear && month < joinMonth) ||
        (year === joinYear && month === joinMonth && day < joinDate)
      ) {
        continue;
      }
    }

    const existing = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: start, $lte: end },
    });

    if (!existing) {
      const deduction = await calculateDeduction(
        employee._id,
        "absent",
        month,
        year,
        settings,
      );

      await Attendance.create({
        employeeId: employee._id,
        date: new Date(Date.UTC(year, month - 1, day, 5, 0, 0)),
        checkInTime: null,
        status: "absent",
        month,
        year,
        deduction,
      });

      createdCount++;
    }
  }

  return createdCount;
};

// Employee self-marks today as Leave (FIXED: variables defined)
const markLeave = async (req, res) => {
  const { employeeID } = req.body;

  try {
    const employee = await Employee.findOne({ employeeID });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const { start, end, pktTime, now } = getPakistanDayRange();

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
    if (!settings) {
      return res.status(500).json({
        message:
          "Deduction/attendance settings are not configured. Ask admin to set them up.",
      });
    }

    const month = pktTime.getUTCMonth() + 1;
    const year = pktTime.getUTCFullYear();
    const allowedTotalLeave = settings.allowedTotalLeave || 0;

    const usedLeavesBefore = await Attendance.countDocuments({
      employeeId: employee._id,
      month,
      year,
      status: "leave",
    });

    const deduction = await calculateDeduction(
      employee._id,
      "leave",
      month,
      year,
      settings,
    );

    await Attendance.create({
      employeeId: employee._id,
      date: now,
      checkInTime: null,
      status: "leave",
      month,
      year,
      deduction,
    });

    const usedLeaves = usedLeavesBefore + 1;
    const remaining = Math.max(allowedTotalLeave - usedLeaves, 0);

    console.log(
      `Leave marked for ${employee.EmployeeName}. Used: ${usedLeaves}/${allowedTotalLeave}. Deduction: ${deduction}`,
    );

    res.status(201).json({
      message: "Leave marked successfully",
      deduction,
      allowedTotalLeave,
      usedLeaves,
      remaining,
    });
  } catch (error) {
    console.error("Error marking leave:", error);
    res.status(500).json({ message: "Server error marking leave" });
  }
};

// Get how many leaves used / remaining this month
const getLeaveBalance = async (req, res) => {
  const { employeeID } = req.params;

  try {
    const employee = await Employee.findOne({ employeeID });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const settings = await Deduction.findOne();
    const allowedTotalLeave = settings?.allowedTotalLeave || 0;

    const { pktTime } = getPakistanDayRange();
    const month = pktTime.getUTCMonth() + 1;
    const year = pktTime.getUTCFullYear();

    const usedLeaves = await Attendance.countDocuments({
      employeeId: employee._id,
      month,
      year,
      status: "leave",
    });

    const remaining = Math.max(allowedTotalLeave - usedLeaves, 0);

    const { start, end } = getPakistanDayRange();
    const todayRecord = await Attendance.findOne({
      employeeId: employee._id,
      date: { $gte: start, $lte: end },
    });

    res.status(200).json({
      allowedTotalLeave,
      usedLeaves,
      remaining,
      alreadyMarkedToday: !!todayRecord,
      todayStatus: todayRecord ? todayRecord.status : null,
    });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    res.status(500).json({ message: "Server error fetching leave balance" });
  }
};

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByMonth,
  getMonthlySummaryReport,
  getTodayAttendanceStatus,
  backfillAbsentForDate,
  markLeave,
  getLeaveBalance,
};
