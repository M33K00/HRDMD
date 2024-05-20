const mongoose = require("mongoose");

const contractOfServiceSchema = new mongoose.Schema({
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
  files: {
    type: [String],
    required: false,
    default: [],
  },
});

const cos = mongoose.model("cos", contractOfServiceSchema);

module.exports = cos;
