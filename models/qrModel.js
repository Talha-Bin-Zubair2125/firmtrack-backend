const mongoose = require("mongoose");

const qrSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const QR = mongoose.model("QR", qrSchema);
module.exports = QR;
