const mongoose = require("mongoose");

const userDocuSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
    unique: true,
  },
  isComplete: {
    type: Boolean,
    default: false,
  },
});

// Custom method to insert one document into UserDocuments collection
userDocuSchema.statics.insertOne = async function (userData) {
  try {
    const newUserDocument = new this(userData);
    await newUserDocument.save();
    return newUserDocument;
  } catch (error) {
    throw error;
  }
};

const UserDocuments = mongoose.model("UserDocuments", userDocuSchema);

module.exports = UserDocuments;
