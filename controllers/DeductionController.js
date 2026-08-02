const Deduction = require("../models/deductionModel");

// Add new deduction settings
const addDeductionSettings = async (req, res) => {
  try {
    const settings = await Deduction.create(req.body);
    res.status(201).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current deduction settings
const getDeductionSettings = async (req, res) => {
  try {
    let settings = await Deduction.findOne();
    if (!settings) {
      // If no settings exist, create default one
      settings = await Deduction.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update deduction settings
const updateDeductionSettings = async (req, res) => {
  try {
    const {
      lateArrivalTime,
      allowedTotalLeave,
      allowedHalfDayTime,
      deductionPerLate,
      deductionPerHalfDay,
      deductionPerAbsence,
      exceedsTotalLeaveDeduction,
      exceedsHalfDayDeduction,
    } = req.body;
    let settings = await Deduction.findOne();
    if (!settings) {
      settings = await Deduction.create({});
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addDeductionSettings,
  getDeductionSettings,
  updateDeductionSettings,
};
