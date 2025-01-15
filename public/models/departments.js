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
    }
});

const department = mongoose.model("department", departmentSchema);

module.exports = department;