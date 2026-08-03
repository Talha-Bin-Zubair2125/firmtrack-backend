const Admin = require("../models/Admin_Model");

const protect = async (req, res, next) => {
  try {
    const adminId = req.signedCookies?.admin_id || req.cookies?.admin_id;

    if (!adminId) {
      return res.status(401).json({
        message: "Access denied.",
      });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(401).json({
        message: "Invalid admin.",
      });
    }

    req.admin = admin;

    next();
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = { protect };
