const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");

// Added employeeLogin in destructuring list
const {
  addEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
  employeeLogin,
} = require("../controllers/employeeController");

router.post("/employees/addemployee", protect, addEmployee);
router.get("/employees/getallemployees", protect, getAllEmployees);
router.get("/employees/getemployee/:id", protect, getEmployeeById);
router.put("/employees/updateemployee/:id", protect, updateEmployee);
router.delete("/employees/deleteemployee/:id", protect, deleteEmployee);
router.get("/employees/search", protect, searchEmployees);

// Employee login endpoint for Mobile App (No protect middleware required for login)
router.post("/employees/login", employeeLogin);

module.exports = router;
