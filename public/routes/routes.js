const express = require("express");
const router = express.Router();
const multer = require("multer");
const logincollections = require("../models/logincollections");
const fs = require("fs");
const path = require("path");
const authController = require("../controllers/authController");

// Models
const LogInCollection = require("../models/logincollections");

// Multer configuration
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files/images");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: storage,
}).single("image");

// Login Page Routes
router.get("/login", authController.login_get);

router.get("/signup", authController.signup_get);

router.post("/login", authController.login_post);

router.post("/signup", authController.signup_post);

router.get("/logout", authController.logout_get);

// Insert an account into the database route
router.post("/addacc", upload, async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      hrrole: req.body.hrrole || "NOROLE",
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
    return res.redirect("/manage_accounts");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "DANGER",
      message: error.message,
    };
    // Redirect to the previous page or an error page
    return res.redirect("/manage_accounts");
  }
});

// Edit a user
router.get("/edit/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    // Render the edit_users template with the retrieved user data
    res.render("edit_users", {
      title: "Edit Account",
      logincollections: logincollections,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error editing user account:", err);
    // Redirect to manage_accounts page in case of an error
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
        fs.unlinkSync("./files/images" + req.body.old_image);
      } catch (err) {
        console.error(err);
        // If an error occurs during file deletion, it shouldn't affect the update process
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
      message: " User updated successfully",
    };
    // Redirect after successful update
    return res.redirect("/manage_accounts");
  } catch (err) {
    console.error(err);
    // Handle errors and provide a response
    return res.json({ message: err.message, type: "DANGER" });
  }
});

// Delete a user
router.get("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await LogInCollection.findByIdAndDelete(id);

    if (result && result.image !== "") {
      try {
        fs.unlinkSync("./files/images/" + result.image);
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

// Middleware function to check for JWT cookie
const checkJWT = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    // JWT cookie is present, redirect to /startpage
    res.redirect("/startpage");
  } else {
    // JWT cookie not present, proceed to next middleware/route handler
    next();
  }
};

// Get Pages
router.get("/", checkJWT, (req, res) => {
  res.render("login");
});

router.get("/document_tracker/:hrrole", async (req, res) => {
  try {
    const hrrole = req.params.hrrole;

    console.log("hrrole:", hrrole);

    // Check if hrrole is not provided or invalid
    if (!hrrole || !["ADMIN", "ROLE 1", "ROLE 2"].includes(hrrole)) {
      return res.status(400).send("Invalid hrrole");
    }

    // Based on the hrrole, render the appropriate template
    if (hrrole === "ADMIN") {
      res.redirect("/home");
    } else if (hrrole === "ROLE 1") {
      res.redirect("/role1");
    } else if (hrrole === "ROLE 2") {
      res.redirect("/role2");
    }
  } catch (err) {
    console.log("Error loading pages: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/manage_account/:hrrole/:name", async (req, res) => {
  try {
    const hrrole = req.params.hrrole;
    const name = req.params.name;

    console.log("hrrole:", hrrole, "name:", name);

    // Check if hrrole is not provided or invalid
    if (!hrrole || !["ADMIN", "ROLE 1", "ROLE 2"].includes(hrrole)) {
      return res.status(400).send("Invalid hrrole");
    }

    // Based on the hrrole, render the appropriate template
    if (hrrole === "ADMIN") {
      res.redirect("/manage_accounts");
    } else if (hrrole === "ROLE 1") {
      res.redirect(`/editacc/${encodeURIComponent(name)}`);
    } else if (hrrole === "ROLE 2") {
      res.redirect("/role2");
    }
  } catch (err) {
    console.log("Error loading pages: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/manage_accounts", async (req, res) => {
  try {
    const logincollections = await LogInCollection.find();
    res.render("manage_accounts", { logincollections });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/addacc", (req, res) => {
  res.render("addacc");
});

router.get("/hris", (req, res) => {
  res.render("hris");
});

module.exports = router;
