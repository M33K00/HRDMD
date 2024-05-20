const mongoose = require("mongoose");

const positionDescriptionSchema = new mongoose.Schema({
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

const positionDescriptions = mongoose.model(
  "positionDescriptions",
  positionDescriptionSchema
);

module.exports = positionDescriptions;
