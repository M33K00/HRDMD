const mongoose = require("mongoose");

const resoOrderSchema = new mongoose.Schema({
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

const copyReso = mongoose.model("copyReso", resoOrderSchema);

module.exports = copyReso;
