const mongoose = require("mongoose");

const daysAbsentASchema = new mongoose.Schema({
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

const daysAbsentA = mongoose.model("daysAbsentA", daysAbsentASchema);

module.exports = daysAbsentA;
