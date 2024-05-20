const mongoose = require("mongoose");

const commendationsSchema = new mongoose.Schema({
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
  commendations: {
    type: [String],
    required: false,
    default: [],
  },
});

const commendations = mongoose.model("commendations", commendationsSchema);

module.exports = commendations;
