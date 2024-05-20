const mongoose = require("mongoose");

const officeOrderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  files: {
    type: [String],
    required: false,
    default: [],
  },
});

const officeOrders = mongoose.model("officeOrders", officeOrderSchema);

module.exports = officeOrders;
