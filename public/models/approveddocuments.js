const mongoose = require("mongoose");

const approvedDocuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  hrrole: {
    type: String,
    required: true,
    index: false,
  },
  currentDep: {
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

const approvedDocuments = mongoose.model(
  "approvedDocuments",
  approvedDocuSchema
);

module.exports = approvedDocuments;
