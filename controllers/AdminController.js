const express = require("express");
const joi = require("joi");
const bcrypt = require("bcryptjs");
const Admin_Model = require("../models/Admin_Model");

// Validation schema for admin login
const loginSchema = joi.object({
  adminID: joi.string().required(),
  password: joi.string().min(8).required(),
});

// Validation schema for admin profile update
const updateProfileSchema = joi.object({
  adminID: joi.string().required(),
  oldPassword: joi.string().allow("").optional(),
  password: joi.string().min(8).allow("").optional(),
});

// Admin login controller
const adminLogin = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { adminID, password } = req.body;

  try {
    const admin = await Admin_Model.findOne({ adminID });
    if (!admin) {
      return res.status(401).json({ message: "Invalid admin ID or password" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid admin ID or password" });
    }

    res.cookie("admin_id", admin._id.toString(), {
      signed: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: false,
    });

    res.status(200).json({
      message: "Login successful",
      user: admin,
    });
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).json({ message: "Server error during admin login" });
  }
};

// Get admin profile controller
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin_Model.findById(req.admin.admin_id).select(
      "-password",
    );

    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found inside database" });
    }
    res.status(200).json({ user: admin });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Server error fetching admin profile" });
  }
};

// Profile update controller
const UpdateAdminProfile = async (req, res) => {
  const { error } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  try {
    const admin = await Admin_Model.findById(req.admin.admin_id);

    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found inside database" });
    }

    const { adminID, oldPassword, password } = req.body;
    const updateData = { adminID };

    if (password && password.trim() !== "") {
      if (!oldPassword) {
        return res
          .status(400)
          .json({
            message: "Current password is required to set a new password.",
          });
      }

      const passwordMatch = await bcrypt.compare(oldPassword, admin.password);
      if (!passwordMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedAdmin = await Admin_Model.findByIdAndUpdate(
      admin._id,
      updateData,
      { new: true },
    ).select("-password");

    if (!updatedAdmin) {
      return res
        .status(404)
        .json({ message: "Admin not found inside database" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedAdmin,
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({ message: "Server error updating admin profile" });
  }
};

// Admin Logout controller
const LogoutProfile = async (req, res) => {
  try {
    res.clearCookie("admin_id");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
};

module.exports = {
  adminLogin,
  UpdateAdminProfile,
  LogoutProfile,
  getAdminProfile,
};
