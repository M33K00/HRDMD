const mongoose = require("mongoose");

const clearanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  NBI: {
    type: String,
    required: false,
    default: "",
  },
  CSForm7: {
    type: String,
    required: false,
    default: "",
  },
});

const clearances = mongoose.model("clearances", clearanceSchema);

module.exports = clearances;
