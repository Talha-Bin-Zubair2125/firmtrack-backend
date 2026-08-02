const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin_Model");
require("dotenv").config();

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash("admin@12", 10);

  await Admin.create({
    adminID: "ATT-ADMIN-2026",
    password: hashedPassword,
  });

  console.log("Admin created ✅");
  process.exit();
};

createAdmin();
