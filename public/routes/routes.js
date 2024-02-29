const express = require("express");
const LogInCollection = require("../models/logincollections");
const router = express.Router();
const multer = require("multer");
const logincollections = require("../models/logincollections");
const fs = require("fs");
const path = require("path");

// Multer configuration

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/documents");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original filename without any modifications
  },
});

const documentUpload = multer({ storage: documentStorage });

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
    return res.redirect("/manage_accounts");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "DANGER",
      message: error.message,
    };
    // Redirect to the previous page or an error page
    return res.redirect("back");
  }
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
  const files = fs.readdirSync("./files/documents");
  response.render("home", { files });
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
        fs.unlinkSync("./files/" + req.body.old_image);
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
      message: "User updated successfully",
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

// Document Tracker routes

router.post("/upload", documentUpload.single("file"), (req, res) => {
  // Redirect to "/home" route after successful upload
  res.redirect("home");
});

router.use(
  "/files/documents",
  express.static(path.join(__dirname, "../../files/documents"))
);

// Route to download files
router.get("/download/:fileName", (request, response) => {
  const fileName = request.params.fileName;
  const filePath = path.join(__dirname, "../../files/documents", fileName);
  response.download(filePath);
});

router.get("/delete", (req, res) => {
  const filename = req.query.file;

  if (filename) {
    const filePath = path.join(__dirname, "../../files/documents/", filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filename}: ${err}`);
        // Handle the error appropriately, e.g., send an error response to the client
        res.status(500).send("Error deleting file");
        return;
      }
      console.log(`File ${filename} deleted successfully`);
    });
  }
  res.redirect("home");
});

module.exports = router;
