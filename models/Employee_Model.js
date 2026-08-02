const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeID: {
      type: String,
      required: true,
      unique: true,
    },
    EmployeeName: {
      type: String,
      required: true,
    },
    EmployeeEmail: {
      type: String,
      required: true,
    },
    EmployeePhone: {
      type: String,
      required: true,
    },
    EmployeeSalary: {
      type: Number,
      required: true,
    },
    EmployeeRole: {
      type: String,
      required: true,
    },
    EmployeePassword: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
); // adds createdAt + updatedAt automatically

const Employee = mongoose.model("Employee", employeeSchema);
module.exports = Employee;
