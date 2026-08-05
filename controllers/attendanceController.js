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

const calculateAbsentDeduction = async (employeeId, month, year, settings) => {
  const allowedTotalLeave = settings.allowedTotalLeave || 0;

  const totalLeavesThisMonth = await Attendance.countDocuments({
    employeeId,
    month,
    year,
    status: "absent",
  });

  const totalLeavesAfterThis = totalLeavesThisMonth + 1;

  let deduction = 0;

  if (totalLeavesAfterThis > allowedTotalLeave) {
    deduction =
      settings.exceedsTotalLeaveDeduction || settings.deductionPerAbsence || 0;
  } else if (totalLeavesAfterThis <= allowedTotalLeave) {
    deduction = 0;
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
    let deduction = 0;

    const month = pktTime.getUTCMonth() + 1;
    const year = pktTime.getUTCFullYear();

    if (currentTimeStr > "16:00") {
      status = "absent";
      deduction = await calculateAbsentDeduction(
        employee._id,
        month,
        year,
        settings,
      );
    } else if (currentTimeStr > settings.allowedHalfDayTime) {
      status = "half-day";
      deduction = settings.deductionPerHalfDay || 0;
    } else if (currentTimeStr > settings.lateArrivalTime) {
      status = "late";
      deduction = settings.deductionPerLate || 0;
    }

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
        return res.status(200).json({
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

        if (py === todayYear && pm === todayMonth && i >= todayDate) continue;

        if (py < joinYear) continue;
        if (py === joinYear && pm < joinMonth) continue;
        if (py === joinYear && pm === joinMonth && i < joinDate) continue;

        const loopDate = new Date(Date.UTC(py, pm - 1, i, 12, 0, 0));
        if (loopDate.getUTCDay() === 0) continue;

        const exists = results.find((r) => {
          if (!r.date) return false;
          const d = new Date(r.date);
          const dPkt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
          return (
            dPkt.getUTCDate() === i &&
            dPkt.getUTCMonth() + 1 === pm &&
            dPkt.getUTCFullYear() === py
          );
        });

        if (!exists) {
          results.push({
            _id: `virtual-${py}-${pm}-${i}`,
            employeeId: employeeObj,
            date: new Date(Date.UTC(py, pm - 1, i, 5, 0, 0)),
            checkInTime: null,
            status: "absent",
            deduction: defaultAbsentDeduction,
            month: pm,
            year: py,
          });
        }
      }
    }

    results.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      attendance: results,
      employeeCreatedAt: employeeObj ? employeeObj.createdAt : null,
      defaultAbsentDeduction,
    });
  } catch (error) {
    console.error("Error fetching detailed attendance:", error);
    res.status(500).json({ message: "Server error fetching attendance" });
  }
};

module.exports = {
  markAttendance,
  getAllAttendance,
  getAttendanceByMonth,
};
