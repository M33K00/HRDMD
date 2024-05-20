const mongoose = require("mongoose");

const scholasticSchema = new mongoose.Schema({
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
  hsDiploma: {
    type: String,
    required: false,
    default: "",
  },
  collegeDiploma: {
    type: String,
    required: false,
    default: "",
  },
  transRecord: {
    type: String,
    required: false,
    default: "",
  },
  noticeOfSalary: {
    type: String,
    required: false,
    default: "",
  },
});

const scholastics = mongoose.model("scholastics", scholasticSchema);

module.exports = scholastics;
