const express = require("express");
const LogInCollection = require("../models/logincollections");
const router = express.Router();
const multer = require("multer");
const logincollections = require("../models/logincollections");
const fs = require("fs");

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
      message: " User added successfully",
    };

    // Redirect to manage_accounts page
    res.redirect("manage_accounts");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "DANGER",
      message: error.message,
    };
  }
  res.redirect("/manage_accounts");
});

router.get("/", (req, res) => {
  res.render("login");
});
router.get("/login", (req, res) => {
  //localhost:3000/signup
  http: res.render("login");
});

router.post("/signup", upload, async (req, res) => {
  try {
    // Check if required fields are present in the request body
    if (!req.body.password || !req.body.hrrole) {
      throw new Error("Password and HR role are required.");
    }

    const data = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      hrrole: req.body.hrrole,
      image: req.file ? req.file.filename : null, // Check if file uploaded, set to null if not
    };

    // Insert data into the LogInCollection
    await LogInCollection.insertMany([data]);

    // Set success message in session
    req.session.message = {
      type: "SUCCESS",
      message: "User added successfully",
    };

    // Redirect to login page
    res.redirect("login");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "DANGER",
      message: error.message,
    };
    res.redirect("/login");
  }
});

// Login User
router.post("/login", async (req, res) => {
  try {
    const check = await LogInCollection.findOne({ name: req.body.email });

    if (check && check.password === req.body.password) {
      if (check.hrrole === "ROLE 1") {
        res.render("role/role1");
      } else if (check.hrrole === "ROLE 2") {
        res.render("role/role2");
      } else if (check.hrrole === "ADMIN") {
        res.render("startpage");
      }
    } else {
      console.log("Incorrect username or password.");
    }
  } catch (error) {
    console.error(error);
    res.render("login", {
      message: { message: "Incorrect username or password.", type: "DANGER" },
    });
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

// Route pages
router.get("/home", (request, response) => {
  response.render("home");
});

router.get("/startpage", (request, response) => {
  response.render("startpage");
});

router.get("/login", (request, response) => {
  response.render("login");
});

router.get("/role/role1", (request, response) => {
  response.render("role1");
});

router.get("/addacc", (req, res) => {
  res.render("addacc");
});

// Edit a user
router.get("/edit/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      return res.redirect("/manage_accounts");
    }

    res.render("edit_users", {
      title: "Edit Account",
      logincollections: logincollections,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/manage_accounts");
  }
});

// Update a user
router.post("/update/:id", upload, async (req, res) => {
  try {
    let id = req.params.id;
    let new_image = "";

    if (req.file) {
      new_image = req.file.filename;
      try {
        // Delete old image if a new image is uploaded
        fs.unlinkSync("./files/" + req.body.old_image);
      } catch (err) {
        console.error(err);
      }
    } else {
      new_image = req.body.old_image;
    }

    // Update user information in the database
    const result = await LogInCollection.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        hrrole: req.body.hrrole,
        image: new_image,
      },
      { new: true } // Return the modified document after update
    );

    if (!result) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    req.session.message = {
      type: "SUCCESS",
      message: "User updated successfully",
    };
    res.redirect("/manage_accounts");
  } catch (err) {
    console.error(err);
    res.json({ message: err.message, type: "DANGER" });
  }
  res.redirect("/manage_accounts");
});

// Delete a user
router.get("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await LogInCollection.findByIdAndDelete(id);

    if (result && result.image !== "") {
      try {
        fs.unlinkSync("./files/" + result.image);
      } catch (err) {
        console.error(err);
      }
    }

    req.session.message = {
      type: "info",
      message: " User deleted successfully",
    };

    res.redirect("/manage_accounts");
  } catch (err) {
    console.error(err);
    res.json({ message: err.message, type: "danger" });
  }
});

module.exports = router;
