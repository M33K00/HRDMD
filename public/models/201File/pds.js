const mongoose = require("mongoose");

const PersonalDataSheetsSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  files: {
    type: String,
    required: false,
    default: "",
  },
});

const PersonalDataSheets = mongoose.model(
  "PersonalDataSheets",
  PersonalDataSheetsSchema
);

module.exports = PersonalDataSheets;
