const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const ConnectDB = require("../db");

const authRoutes = require("../routes/authRoutes");
const employeeRoutes = require("../routes/employeeRoutes");
const qrRoutes = require("../routes/qrRoutes");
const deductionRoutes = require("../routes/deductionRoutes");
const attendanceRoutes = require("../routes/attendanceRoutes");

const app = express();

const allowedOrigins = [
  "https://firm-track.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(cookieParser(process.env.CookieSecret));

app.use(express.json());

// Database
ConnectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "FirmTrack Backend Running",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API working",
  });
});

module.exports = app;
