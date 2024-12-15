const mongoose = require("mongoose");

const lastUpdateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Unique ID for the update record
  year: { type: Number, required: true }, // Year the update was applied
  updatedAt: { type: Date, required: true }, // Timestamp of the update
});

module.exports = mongoose.model("LastUpdate", lastUpdateSchema);
