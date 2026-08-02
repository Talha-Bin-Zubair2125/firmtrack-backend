const QR = require("../models/qrModel");
const qrcode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

// Generate new QR token
const generateQR = async (req, res) => {
  try {
    // deactivate old QR first
    await QR.updateMany({}, { isActive: false });

    // create new token
    const token = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15000); // 15 seconds

    // save to DB
    const newQR = await QR.create({
      token,
      generatedAt: now,
      expiresAt,
      isActive: true,
    });

    // generate QR image as base64
    const qrImage = await qrcode.toDataURL(token);

    res.status(200).json({
      token,
      qrImage, // base64 image → display in frontend
      expiresAt,
    });
  } catch (error) {
    console.error("Error generating QR:", error);
    res.status(500).json({ message: "Error generating QR" });
  }
};

// Get active QR
const getActiveQR = async (req, res) => {
  try {
    const activeQR = await QR.findOne({ isActive: true });

    if (!activeQR) {
      return res.status(404).json({ message: "No active QR found" });
    }

    // check if expired
    if (new Date() > activeQR.expiresAt) {
      return res.status(400).json({ message: "QR expired" });
    }

    // generate QR image from token
    const qrImage = await qrcode.toDataURL(activeQR.token);

    res.status(200).json({
      token: activeQR.token,
      qrImage,
      expiresAt: activeQR.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching QR:", error);
    res.status(500).json({ message: "Error fetching QR" });
  }
};

module.exports = { generateQR, getActiveQR };
