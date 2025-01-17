const { closeDelimiter } = require("ejs");
const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
    deptName: {
        type: String,
        required: true,
    },
    deptAbbrev: {
        type: String,
        required: true,
    },
    employees: {
        type: Array,
        required: false,
        default: []
    },
    closed: {
        type: Boolean,
        required: false,
        default: false
    },
    closedReason: {
        type: String,
        required: false,
        default: ""
    },
    closedDate: {
        type: Date,
        required: false,
        default: null
    }
});

const department = mongoose.model("department", departmentSchema);

module.exports = department;