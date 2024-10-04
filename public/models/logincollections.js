const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcrypt = require("bcrypt");

const logInSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please add a name"],
  },
  lastname: {
    type: String,
    required: [true, "Please add a lastname"],
  },
  email: {
    type: String,
    required: [true, "Please add an email"],
    unique: true,
    lowercase: true,
    validate: [isEmail, "Please enter a valid email"],
  },
  contact: {
    type: String,
    required: false,
    default: "",
  },
  birthday: {
    type: Date,
    required: false,
    default: Date.now,
  },
  password: {
    type: String,
    required: [true, "Please add a password"],
    minlength: [8, "Password must be at least 8 characters"],
  },
  passwordReset: {
    type: Boolean,
    default: false,
  },
  employeeID: {
    type: String,
    required: true,
    default: "",
  },
  empStatus: {
    type: String,
    required: false,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  department: {
    type: String,
    default: "NODEP",
    validate: {
      validator: function (value) {
        // Custom validation function to allow null or non-empty values
        return value !== "";
      },
      message: "department cannot be empty",
    },
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
  completeFiles: {
    type: String,
    default: "INCOMPLETE",
  },
  accountClosed: {
    type: Boolean,
    default: false,
  },
  verified: {
    type: Boolean,
    default: false,
  },

  // Permission Fields
  mEmp: {
    type: Boolean,
    default: false,
  },
  mLeave: {
    type: Boolean,
    default: false,
  },
  mDTR: {
    type: Boolean,
    default: false,
  },
  mPrint: {
    type: Boolean,
    default: false,
  },
});

// Fire a function before doc is saved to db
logInSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Static method to login user
logInSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) {
    throw new Error("Email doesn't exist");
  }

  const auth = await bcrypt.compare(password, user.password);
  if (!auth) {
    throw new Error("Incorrect password");
  }

  if (!user.hrrole || user.hrrole === "NOROLE") {
    if (user.hrrole !== "ADMIN") {
      throw new Error("Your account has no assigned roles yet");
    }
  }

  return user;
};

module.exports = mongoose.model("LogInCollection", logInSchema);
