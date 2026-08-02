const brypt = require("bcryptjs");
const joi = require("joi");
const Employee = require("../models/Employee_Model");

// Joi schema for adding employee — no EmployeeJoiningDate
const employeeSchema = joi.object({
  employeeID: joi.string().required(),
  EmployeeName: joi.string().required(),
  EmployeeEmail: joi.string().email().required(),
  EmployeePhone: joi
    .string()
    .pattern(/^(03)[0-9]{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be a valid Pakistani number e.g. 03001234567",
    }),
  EmployeeSalary: joi.number().positive().required(),
  EmployeeRole: joi.string().required(),
  EmployeePassword: joi.string().min(8).required(),
});

// Joi schema for updating employee — no EmployeeJoiningDate
const employeeUpdateSchema = joi.object({
  employeeID: joi.string().required(),
  EmployeeName: joi.string().required(),
  EmployeeEmail: joi.string().email().required(),
  EmployeePhone: joi
    .string()
    .pattern(/^(03)[0-9]{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone must be a valid Pakistani number e.g. 03001234567",
    }),
  EmployeeSalary: joi.number().positive().required(),
  EmployeeRole: joi.string().required(),
});

const employeeLoginSchema = joi.object({
  employeeID: joi.string().required(),
  password: joi.string().required(),
});

// Add employee
const addEmployee = async (req, res) => {
  const { error } = employeeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const {
    employeeID,
    EmployeeName,
    EmployeeEmail,
    EmployeePhone,
    EmployeeSalary,
    EmployeeRole,
    EmployeePassword,
  } = req.body;

  try {
    const newEmployee = new Employee({
      employeeID,
      EmployeeName,
      EmployeeEmail,
      EmployeePhone,
      EmployeeSalary,
      EmployeeRole,
      EmployeePassword: await brypt.hash(EmployeePassword, 10),
      //  no EmployeeJoiningDate — createdAt set automatically by timestamps
    });
    await newEmployee.save();
    res
      .status(201)
      .json({ message: "Employee added successfully", employee: newEmployee });
  } catch (error) {
    console.error("Error adding employee:", error);
    res.status(500).json({ message: "Server error while adding employee" });
  }
};

// Get all employees
const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();
    res.status(200).json({ employees });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Server error while fetching employees" });
  }
};

// Get employee by ID
const getEmployeeById = async (req, res) => {
  const { id } = req.params;
  try {
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ message: "Server error while fetching employee" });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  const { id } = req.params;

  const { error } = employeeUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res
      .status(200)
      .json({
        message: "Employee updated successfully",
        employee: updatedEmployee,
      });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ message: "Server error while updating employee" });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(id);
    if (!deletedEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ message: "Server error while deleting employee" });
  }
};

// Search employees
const searchEmployees = async (req, res) => {
  const { query } = req.query;
  try {
    const employees = await Employee.find({
      $or: [
        { EmployeeName: { $regex: query, $options: "i" } },
        { employeeID: { $regex: query, $options: "i" } },
        { EmployeeRole: { $regex: query, $options: "i" } },
      ],
    });
    res.status(200).json({ employees });
  } catch (error) {
    console.error("Error searching employees:", error);
    res.status(500).json({ message: "Server error while searching employees" });
  }
};

// Employee login (mobile)
const employeeLogin = async (req, res) => {
  const { error } = employeeLoginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { employeeID, password } = req.body;

  try {
    const employee = await Employee.findOne({ employeeID });
    if (!employee) {
      return res
        .status(401)
        .json({ message: "Invalid Employee ID or Password" });
    }

    const passwordMatch = await brypt.compare(
      password,
      employee.EmployeePassword,
    );
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Invalid Employee ID or Password" });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: employee._id,
        employeeID: employee.employeeID,
        name: employee.EmployeeName,
        role: employee.EmployeeRole,
      },
    });
  } catch (error) {
    console.error("Error during employee login:", error);
    res.status(500).json({ message: "Server error during employee login" });
  }
};

// Change password (mobile)
const changePassword = async (req, res) => {
  const { employeeID, oldPassword, newPassword } = req.body;

  try {
    const employee = await Employee.findOne({ employeeID });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const isMatch = await brypt.compare(oldPassword, employee.EmployeePassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    employee.EmployeePassword = await brypt.hash(newPassword, 10);
    await employee.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Server error changing password." });
  }
};

module.exports = {
  addEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
  employeeLogin,
  changePassword,
};
