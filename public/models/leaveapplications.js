const mongoose = require("mongoose");
const { isEmail } = require("validator");

const LeaveApplicationsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    lowercase: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  Type: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  AppliedDate: {
    type: Date,
    default: null,
  },
  StartDate: {
    type: Date,
    required: true,
  },
  EndDate: {
    type: Date,
    required: true,
  },
  Status: {
    type: String,
    required: true,
    default: "Pending",
  },
});

const LeaveApplication = mongoose.model(
  "leaveApplication",
  LeaveApplicationsSchema
);

module.exports = LeaveApplication;
