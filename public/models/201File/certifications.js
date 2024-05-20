const mongoose = require("mongoose");

const certificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  certAD: {
    type: String,
    required: false,
    default: "",
  },
  certBD: {
    type: String,
    required: false,
    default: "",
  },
  medCert: {
    type: String,
    required: false,
    default: "",
  },
  certLeaveB: {
    type: String,
    required: false,
    default: "",
  },
});

const certifications = mongoose.model("certifications", certificationSchema);

module.exports = certifications;
