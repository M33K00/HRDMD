const mongoose = require("mongoose");

const PersonalDataSheetsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  empID: {
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

const PersonalDataSheets = mongoose.model(
  "PersonalDataSheets",
  PersonalDataSheetsSchema
);

module.exports = PersonalDataSheets;
