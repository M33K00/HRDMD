const mongoose = require("mongoose");

const daysPresentSchema = new mongoose.Schema({
  email: {
    type: String,
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
  totalTime: {
    type: String,
    required: false,
    default: null,
  },
});

const daysPresent = mongoose.model("daysPresent", daysPresentSchema);

module.exports = daysPresent;
