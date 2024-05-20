const mongoose = require("mongoose");

const certERLSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  CSC: {
    type: String,
    required: false,
    default: "",
  },
  NPC: {
    type: String,
    required: false,
    default: "",
  },
  CESB: {
    type: String,
    required: false,
    default: "",
  },
  PRC: {
    type: String,
    required: false,
    default: "",
  },
  SC: {
    type: String,
    required: false,
    default: "",
  },
});

const certERL = mongoose.model("certERL", certERLSchema);

module.exports = certERL;
