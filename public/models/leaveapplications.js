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
    unique: true,
    lowercase: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  Title: {
    type: String,
    required: true,
    index: false,
  },
  Type: {
    type: String,
    required: true,
  },
  AppliedDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  Period: {
    type: Number,
    required: true,
  },
  Status: {
    type: String,
    required: true,
  }
});

const LeaveApplication = mongoose.model(
  "leaveApplication",
  LeaveApplicationsSchema
);

module.exports = LeaveApplication;
