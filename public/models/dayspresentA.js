const mongoose = require("mongoose");

const daysPresentASchema = new mongoose.Schema({
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
  dateArchived: {
    type: Date,
    default: null,
  },
});

const daysPresentA = mongoose.model("daysPresentA", daysPresentASchema);

module.exports = daysPresentA;
