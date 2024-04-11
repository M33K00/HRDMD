const mongoose = require("mongoose");

const rejectedDocuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  hrrole: {
    type: String,
    required: true,
    index: false,
  },
  fileName: {
    type: String,
    required: false,
    default: "",
  },
});

const rejectedDocuments = mongoose.model(
  "rejectedDocuments",
  rejectedDocuSchema
);

module.exports = rejectedDocuments;
