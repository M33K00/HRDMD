const mongooose = require("mongoose");
const { validate } = require("./logincollections");

const hrSettingsSchema = new mongooose.Schema({
  startDate: {
    type: String,
    required: false,
    default: "15",
  },
  endDate: {
    type: String,
    required: false,
    default: "30",
  },
  hoursPerDay: {
    type: String,
    required: false,
    default: "8",
  },
  startTime: {
    type: String,
    required: false,
    default: "09:00",
  },
  endTime: {
    type: String,
    required: false,
    default: "17:00",
  }
});

const hrSettings = mongooose.model("hrSettings", hrSettingsSchema);

module.exports = hrSettings;
