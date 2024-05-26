const mongoose = require("mongoose");

const certLiveBSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  files: {
    type: String,
    required: false,
    default: "",
  },
  fileYear: {
    type: String,
    required: false,
    default: "",
  },
  dateSubmitted: {
    type: Date,
    default: null,
  },
});

const certLiveB = mongoose.model("certLiveB", certLiveBSchema);

module.exports = certLiveB;
