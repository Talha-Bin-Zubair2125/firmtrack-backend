const express = require("express");
const router = express.Router();
const {
  addDeductionSettings,
  getDeductionSettings,
  updateDeductionSettings,
} = require("../controllers/DeductionController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/add/deduction", protect, addDeductionSettings);
router.get("/settings/deduction", getDeductionSettings);
router.put("/update/deduction", protect, updateDeductionSettings);

module.exports = router;
