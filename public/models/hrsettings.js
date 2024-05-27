const mongooose = require("mongoose");

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
  }
});

const hrSettings = mongooose.model("hrSettings", hrSettingsSchema);

module.exports = hrSettings;
