const mongoose = require("mongoose");

const taskTimelineSchema = new mongoose.Schema({
    fileCode: {
        type: String,
        required: true,
    },
    fileStatus: {
        type: String,
        required: true,
    },
    remarks: {
        type: String,
        required: false,
        default: "",
    },
    date: {
        type: Date,
        required: true,
    },
});

const taskTimeline = mongoose.model("taskTimeline", taskTimelineSchema);

module.exports = taskTimeline