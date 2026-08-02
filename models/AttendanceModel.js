const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  checkInTime: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["present", "late", "absent", "half-day"],
    default: "present",
  },
  deduction: {
    type: Number,
    default: 0, // fixed amount from DeductionSettings
  },
  month: {
    type: Number,
    default: new Date().getMonth() + 1,
  },
  year: {
    type: Number,
    default: new Date().getFullYear(),
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
module.exports = Attendance;
