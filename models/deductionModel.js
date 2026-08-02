const mongoose = require("mongoose");

const deductionSchema = new mongoose.Schema({
  lateArrivalTime: {
    type: String,
    default: "09:00", // after this time = late (HH:MM format)
  },
  allowedTotalLeave: {
    type: Number,
    default: 2, // allowed leaves per month
  },
  allowedHalfDayTime: {
    type: String,
    default: "13:00", // after this time = half day (HH:MM format)
  },
  deductionPerLate: {
    type: Number,
    default: 0, // amount deducted per late arrival
  },
  deductionPerHalfDay: {
    type: Number,
    default: 0, // amount deducted per half day
  },
  deductionPerAbsence: {
    type: Number,
    default: 0, // amount deducted per absence
  },
  exceedsTotalLeaveDeduction: {
    type: Number,
    default: 0, // extra deduction when leaves exceed allowedTotalLeave
  },
  exceedsHalfDayDeduction: {
    type: Number,
    default: 0, // extra deduction when half days exceed limit
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Deduction = mongoose.model("Deduction", deductionSchema);
module.exports = Deduction;
