const mongoose = require("mongoose");

const swornStatSchema = new mongoose.Schema({
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

const swornStat = mongoose.model("swornStat", swornStatSchema);

module.exports = swornStat;
