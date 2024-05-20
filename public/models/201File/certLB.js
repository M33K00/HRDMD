const mongoose = require("mongoose");

const certLiveBSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  dependent: {
    type: String,
    required: false,
    default: "",
  },
});

const certLiveB = mongoose.model("certLiveB", certLiveBSchema);

module.exports = certLiveB;
