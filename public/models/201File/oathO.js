const mongoose = require("mongoose");

const oathOSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  fileName: {
    type: String,
    required: false,
    default: "",
  },
});

const oathO = mongoose.model("oathO", oathOSchema);

module.exports = oathO;
