const express = require("express");
const router = express.Router();
const { generateQR, getActiveQR } = require("../controllers/qrController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/qr/generate", protect, generateQR);
router.get("/qr/active", protect, getActiveQR);

module.exports = router;
