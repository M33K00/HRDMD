require("dotenv").config();
const LogInCollection = require("../models/logincollections");
const userdocuments = require("../models/userdocuments");
const Attendance = require("../models/attendance");
const jwt = require("jsonwebtoken");

// Handle errors
const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { email: " ", password: " " };

  // incorrect email
  if (err.message === "Email doesn't exist") {
    errors.email = "That email is not registered";
  }
  // incorrect password
  if (err.message === "Incorrect password") {
    errors.password = "That password is incorrect";
  }

  // incorrect password
  if (err.message === "Your account has no assigned roles yet") {
    errors.password = "No roles assigned to this account";
  }

  // Duplicate email error
  if (err.code === 11000) {
    errors.email = "That email is already registered";
    return errors;
  }

  // Validation errors
  if (err.message.includes("LogInCollection validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

// Create Token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: maxAge,
  });
};

module.exports.login_get = (req, res) => {
  res.render("login");
};

module.exports.signup_get = (req, res) => {
  res.render("signup");
};

module.exports.login_post = async (req, res) => {
  const { email, password, hrrole } = req.body;

  try {
    const logincollection = await LogInCollection.login(
      email,
      password,
      hrrole
    );
    const token = createToken(logincollection._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });

    // Check user role and send redirect URL if needed
    let redirectUrl = "/startpage"; // Default redirect URL

    res.status(200).json({ redirect: redirectUrl }); // Send redirect URL in response
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.signup_post = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const logincollection = await LogInCollection.create({
      name,
      email,
      password,
    });
    // Insert data into "userdocuments" collection
    const userData = {
      userId: logincollection._id,
      name,
      email,
      // Add other data as needed
    };
    const adata = {
      name,
      email,
    }
    await userdocuments.insertOne(userData);
    await Attendance.insertOne(adata);

    const token = createToken(logincollection._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json({ logincollection: logincollection._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/login");
};
