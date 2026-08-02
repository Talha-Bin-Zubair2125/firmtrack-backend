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


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://firm-track.vercel.app"
    ],
    credentials:true
  })
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



app.get("/",(req,res)=>{
    res.json({
        message:"FirmTrack Backend Running"
    });
});


app.get("/api/test",(req,res)=>{
    res.json({
        message:"API working"
    });
});


module.exports = app;