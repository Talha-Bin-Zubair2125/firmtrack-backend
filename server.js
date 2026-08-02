const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

require("dotenv").config();

const ConnectDB = require("./db");

const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const qrRoutes = require("./routes/qrRoutes");
const deductionRoutes = require("./routes/deductionRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");

const app = express();

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://firm-track.vercel.app",
    ],
    credentials: true,
  }),
);

// Middleware
app.use(cookieParser(process.env.CookieSecret));
app.use(express.json());

// Database Connection
ConnectDB();

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);

// Test Route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Attendance System API",
  });
});

// Test API
app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend running successfully on Vercel",
  });
});

// Absent marking logic
const markAbsentForDate = async (dateStr) => {
  const {
    backfillAbsentForDate,
  } = require("./controllers/attendanceController");

  return await backfillAbsentForDate(dateStr);
};



// Backfill Route
app.get("/api/test/markabsent", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      const pktNow = new Date(new Date().getTime() + 5 * 60 * 60000);

      const todayStr = pktNow.toISOString().split("T")[0];

      const count = await markAbsentForDate(todayStr);

      return res.json({
        message: `${count} absent records created for ${todayStr}`,
      });
    }

    const count = await markAbsentForDate(date);

    res.json({
      message: `${count} absent records created for ${date}`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message,
    });
  }
});



const PORT=process.env.PORT || 5000;


app.listen(PORT,()=>{
    console.log(
        `Server running on ${PORT}`
    );
});

module.exports = app;
