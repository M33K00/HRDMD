const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: String,
        required: false,
        default: "OUT",
    },
    daysPresent: {
        type: Array,
        required: false,
        default: [],
    },
    daysAbsent: {
        type: Array,
        required: false,
        default: [],
    },
    daysOnLeave: {
        type: Array,
        required: false,
        default: [],
    },
    timeIn: {
        type: Date,
        required: false,
        default: null,
    },
    timeOut: {
        type: Date,
        required: false,
        default: null,
    },
    totalTime : {
        type: String,
        required: false,
        default: "",
    },
    hoursWorked: {
        type: String,
        required: false,
        default: "",
    }
});

const attendance = mongoose.model('attendance', attendanceSchema);

module.exports = attendance;