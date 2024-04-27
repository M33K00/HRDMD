const mongoose = require("mongoose");

const employeeFileSchema = new mongoose.Schema({
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
    fileType : {
        type: String,
        required: false,
        default: "",
    }
});

const employeeFiles = mongoose.model('employeeFiles', employeeFileSchema);

module.exports = employeeFiles;