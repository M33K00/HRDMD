require("dotenv").config();
const LogInCollection = require("../models/logincollections");
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

  // No roles
  if (err.message === "Your account has no assigned roles yet") {
    errors.password = "No roles assigned to this account";
  }

  // Account closed
  if (err.message === "This account is closed.") {
    errors.password = "Your account has been closed";
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
  const { email, password, hrrole, accountClosed } = req.body;

  try {
    const logincollection = await LogInCollection.login(
      email,
      password,
      hrrole,
      accountClosed
    );

    if (logincollection.accountClosed) {
      throw new Error("This account is closed.");
    }

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
  const { name, lastname, email, password, employeeID } = req.body;

  console.log("name:", name, "lastname:", lastname, "email:", email, "password:", password, "employeeID:", employeeID);

  try {
    const logincollection = await LogInCollection.create({
      name,
      lastname,
      email,
      password,
      employeeID,
    });
    const adata = {
      name,
      email,
    }
    await Attendance.create(adata);

    res.status(201).json({ logincollection });

  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/login");
};
