const mongoose = require("mongoose");

const archivedFilesSchema = new mongoose.Schema({
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

const archivedFiles = mongoose.model("archivedFiles", archivedFilesSchema);

module.exports = archivedFiles;
