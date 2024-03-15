const mongoose = require("mongoose");

const logInSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    default: "../images/migu.jpg",
  },
  hrrole: {
    type: String,
    default: "NOROLE", // Set default value to "NOROLE"
    validate: {
      validator: function (value) {
        // Custom validation function to allow null or non-empty values
        return value !== "";
      },
      message: "hrrole cannot be empty",
    },
  },
  created: {
    type: Date,
    required: true,
    default: Date.now,
  },
  verified: {
    type: Boolean,
  },
});
module.exports = mongoose.model("LogInCollection", logInSchema);
