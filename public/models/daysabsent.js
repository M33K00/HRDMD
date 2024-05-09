const mongoose = require("mongoose");

const daysAbsentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

const daysAbsent = mongoose.model("daysAbsent", daysAbsentSchema);

module.exports = daysAbsent;
