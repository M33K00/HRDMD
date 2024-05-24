const mongoose = require("mongoose");

const appPaperSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  orig: {
    type: String,
    required: false,
    default: "",
  },
  origFile: {
    type: String,
    required: false,
    default: "",
  },
  reappoint: {
    type: String,
    required: false,
    default: "",
  },
  reappointFile: {
    type: String,
    required: false,
    default: "",
  },
  reemploy: {
    type: String,
    required: false,
    default: "",
  },
  reemployFile: {
    type: String,
    required: false,
    default: "",
  },
  prom: {
    type: String,
    required: false,
    default: "",
  },
  promFile: {
    type: String,
    required: false,
    default: "",
  },
  transfer: {
    type: String,
    required: false,
    default: "",
  },
  transferFile: {
    type: String,
    required: false,
    default: "",
  },
  transProm: {
    type: String,
    required: false,
    default: "",
  },
  transPromFile: {
    type: String,
    required: false,
    default: "",
  },
});

const appPaper = mongoose.model("appPaper", appPaperSchema);

module.exports = appPaper;
