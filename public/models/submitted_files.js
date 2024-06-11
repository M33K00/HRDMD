const mongoose = require("mongoose");

const submittedFilesSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  fileCode: {
    type: String,
    unique: true,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
    default: "",
  },
  assignTo: {
    type: String,
    required: false,
    default: "",
  },
  email: {
    type: String,
    required: false,
    default: "",
  },
  fileInstruction: {
    type: String,
    required: false,
    default: "",
  },
  dateSubmitted: {
    type: Date,
    default: null,
  },
  dueDate: {
    type: Date,
    required: true,
    default: null,
  },
  status: {
    type: String,
    required: true,
    default: "PENDING",
  },
  fileUpload: {
    type: String,
    required: false,
    default: "",
  },
});

const submittedFiles = mongoose.model("submittedFiles", submittedFilesSchema);

module.exports = submittedFiles;
