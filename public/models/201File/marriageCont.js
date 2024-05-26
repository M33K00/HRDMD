const mongoose = require("mongoose");

const marriageContractSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      files: {
        type: String,
        required: false,
        default: "",
      },
      fileYear: {
        type: String,
        required: false,
        default: "",
      },
      dateSubmitted: {
        type: Date,
        default: null,
      },
});

const marriageContract = mongoose.model("marriageContract", marriageContractSchema);

module.exports = marriageContract