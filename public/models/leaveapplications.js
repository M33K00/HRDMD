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

  // Details of Leave

  withinPH: {
    type: String,
    required: false,
    default: "",
  },
  abroad: {
    type: String,
    required: false,
    default: "",
  },
  inHospital: {
    type: String,
    required: false,
    default: "",
  },
  outPatient: {
    type: String,
    required: false,
    default: "",
  },
  studyLReason: {
    type: String,
    required: false,
    default: "",
  },
  otherPurpose: {
    type: String,
    required: false,
    default: "",
  },

  // Details of Action on Application

  recommendation: {
    type: String,
    required: false,
    default: "",
  },
  daysWithPay: {
    type: String,
    required: false,
    default: "",
  },
  daysWithoutPay: {
    type: String,
    required: false,
    default: "",
  },
  daysOthers: {
    type: String,
    required: false,
    default: "",
  },
  dissaprovedReason: {
    type: String,
    required: false,
    default: "",
  },

  Status: {
    type: String,
    required: true,
    default: "Pending",
  },
  dateArchived: {
    type: Date,
    default: null,
  },

  // Attachments
  leaveFileAdd1: {
    type: String,
    required: false,
    default: "",
  },
  leaveFileAdd2: {
    type: String,
    required: false,
    default: "",
  },
});

const LeaveApplication = mongoose.model(
  "leaveApplication",
  LeaveApplicationsSchema
);

module.exports = LeaveApplication;
