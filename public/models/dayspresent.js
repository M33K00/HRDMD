const mongoose = require("mongoose");

const daysPresentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  timeIn: {
    type: Date,
    required: true,
  },
  timeOut: {
    type: Date,
    required: false,
    default: null,
  },
  timeLate: {
    type: String,
    required: false,
    default: "",
  },
  totalTime: {
    type: Number,
    required: false,
    default: 0,
  },
  underTime: {
    type: Number,
    required: false,
    default: 0,
  },
  overTime: {
    type: Number,
    required: false,
    default: 0,
  },
  forFile: {
    type: Boolean,
    required: false,
    default: false,
  },
  reasonFF: {
    type: String,
    required: false,
    default: "",
  },
  FFapproved: {
    type: "String",
    required: false,
    default: "N/A",
  },
  FFreason: {
    type: String,
    required: false,
    default: "",
  },
  FFattach1: {
    type: String,
    required: false,
    default: "",
  },
  FFattach2: {
    type: String,
    required: false,
    default: "",
  },
});

const daysPresent = mongoose.model("daysPresent", daysPresentSchema);

module.exports = daysPresent;
