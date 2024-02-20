const express = require("express");
const LogInCollection = require("../models/logincollections");
const router = express.Router();
const multer = require("multer");
const logincollections = require("../models/logincollections");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: storage,
}).single("image");

// Insert an account into the database route

router.post("/addacc", upload, async (req, res) => {
  try {
    // Check if required fields are present in the request body
    if (!req.body.name || !req.body.password || !req.body.hrrole) {
      throw new Error("Name, password, and HR role are required.");
    }

    // Check if file upload was successful
    if (!req.file) {
      throw new Error("Image file is required.");
    }

    const data = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      hrrole: req.body.hrrole,
      image: req.file.filename,
    };

    // Insert data into the LogInCollection
    await LogInCollection.insertMany([data]);

    // Set success message in session
    req.session.message = {
      type: "SUCCESS",
      message: "User added successfully",
    };

    // Redirect to manage_accounts page
    res.redirect("/manage_accounts");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "DANGER",
      message: error.message,
    };

    // Redirect to manage_accounts page
    res.redirect("/manage_accounts");
  }
});

router.get("/", (req, res) => {
  res.render("login.hbs");
});
router.get("/login", (req, res) => {
  //localhost:3000/signup
  http: res.render("login.hbs");
});

router.post("/signup", async (req, res) => {
  const data = {
    name: req.body.name,
    password: req.body.password,
    hrrole: req.body.hrrole,
  };

  await LogInCollection.insertMany([data]);

  res.render("login.hbs");
});

router.post("/login", async (req, res) => {
  try {
    const check = await LogInCollection.findOne({ name: req.body.name });

    if (check.password === req.body.password && check.hrrole === "ROLE 1") {
      res.render("role/role1.hbs");
    } else if (
      check.password === req.body.password &&
      check.hrrole === "ROLE 2"
    ) {
      res.render("role/role2.hbs");
    } else if (
      check.password === req.body.password &&
      check.hrrole === "ADMIN"
    ) {
      res.render("home.hbs");
    } else {
      res.render("login.hbs");
      console.log("ERROOOOOR BOBO AYAW GUMANA FUCK SHIT ASS BITCH CUNT");
    }
  } catch {
    res.render("login.hbs");
  }
});

// Get all users route
router.get("/manage_accounts", async (req, res) => {
  try {
    const logincollections = await LogInCollection.find();
    res.render("manage_accounts", { logincollections });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/home", (request, response) => {
  response.render("home.hbs");
});

router.get("/login", (request, response) => {
  response.render("login.hbs");
});

router.get("/role/role1", (request, response) => {
  response.render("role1.hbs");
});

router.get("/addacc", (req, res) => {
  res.render("addacc");
});

module.exports = router;
