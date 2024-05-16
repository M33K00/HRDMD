const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    required: false,
    default: "OUT",
  },
  daysPresent: {
    type: Number,
    required: false,
    default: 0,
  },
  daysAbsent: {
    type: Number,
    required: false,
    default: 0,
  },
  daysOnLeave: {
    type: Number,
    required: false,
    default: 0,
  },
  timeIn: {
    type: Date,
    required: false,
    default: null,
  },
  timeOut: {
    type: Date,
    required: false,
    default: null,
  },
  totalTime: {
    type: Number,
    required: false,
    default: 0,
  },
  hoursWorked: {
    type: Number,
    required: false,
    default: 0,
  },
  paySched: {
    type: Array,
    required: false,
    default: [],
  },
  dayOff: {
    type: Array,
    required: false,
    default: [],
  },
  cutoffDate: {
    type: Date,
    required: false,
    default: null,
  },
  nextCutoffDate: {
    type: Date,
    required: false,
    default: null,
  },
  availableSL: {
    type: Number,
    required: false,
    default: 15,
  },
  availableVL: {
    type: Number,
    required: false,
    default: 10,
  },
  availableSPL: {
    type: Number,
    required: false,
    default: 3,
  },
  creditPoints: {
    type: Number,
    required: false,
    default: 1.25,
  },
});

const attendance = mongoose.model("attendance", attendanceSchema);

module.exports = attendance;
