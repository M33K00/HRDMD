const express = require("express");
const router = express.Router();
const multer = require("multer");
const logincollections = require("../models/logincollections");
const fs = require("fs");
const path = require("path");
const authController = require("../controllers/authController");
const bcrypt = require("bcrypt");
const { checkRoleHR } = require("../middleware/authMiddleware.js");
const RejectedDocument = require("../models/rejecteddocuments");
const Attendance = require("../models/attendance");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");

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
    let hashedPassword = req.body.password;
    if (req.body.password) {
      // Generate a salt and hash the new password
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(req.body.password, salt);
    }

    const parsedBirthday = new Date(req.body.birthday);

    const data = {
      name: req.body.name,
      birthday: parsedBirthday,
      contact: req.body.contact,
      email: req.body.email,
      password: hashedPassword, // Use the hashed password here
      department: req.body.department,
      hrrole: req.body.hrrole,
      image: req.file.filename,
    };

    const adata = {
      name: req.body.name,
      email: req.body.email,
    };

    // Insert data into the LogInCollection
    await LogInCollection.insertMany([data]);

    await Attendance.insertMany([adata]);

    // Set success message in session
    req.session.message = {
      type: "success",
      message: " User added successfully",
    };

    // Redirect to manage_accounts page
    return res.redirect("/manage_accounts");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "danger",
      message: error.message,
    };
    // Redirect to the previous page or an error page
    return res.redirect("/manage_accounts");
  }
});

// View a user
router.get("/view/:id", async (req, res) => {
  try {
    let id = req.params.id;

    // Fetch user's login information
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    let name = logincollections.name;
    // Fetch rejected documents associated with the user's name
    let rejectedDocuments = await RejectedDocument.find({
      name: name,
    });

    // Render the view_account template with the retrieved add
    res.render("view_account", {
      title: "View Account",
      logincollections: logincollections,
      rejectedDocuments: rejectedDocuments,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error fetching user data:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/manage_accounts");
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
        fs.unlinkSync("./files/images/" + req.body.old_image);
      } catch (err) {
        console.error(err);
        // If an error occurs during file deletion, it shouldn't affect the update process
      }
    } else {
      new_image = req.body.old_image;
    }

    // Check if the new password is empty
    let hashedPassword = req.body.old_password;
    if (req.body.password) {
      // Generate a salt and hash the new password
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(req.body.password, salt);
    }

    // Update the user

    const birthday = req.body.birthday;

    const datePartOnly = birthday.split("T")[0];
    const parsedBirthday = new Date(datePartOnly);
    const result = await LogInCollection.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        birthday: parsedBirthday,
        contact: req.body.contact,
        email: req.body.email,
        password: hashedPassword, // Use the hashed password here
        department: req.body.department,
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

// Update account for users
router.post("/update-user/:id", upload, async (req, res) => {
  try {
    let id = req.params.id;
    let new_image = "";

    if (req.file) {
      new_image = req.file.filename;
      try {
        // Delete old image if a new image is uploaded
        fs.unlinkSync("./files/images/" + req.body.old_image);
      } catch (err) {
        console.error(err);
        // If an error occurs during file deletion, it shouldn't affect the update process
      }
    } else {
      new_image = req.body.old_image;
    }

    // Generate a salt
    const salt = await bcrypt.genSalt();

    // Hash the new password using the generated salt
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Update user information in the database, using the hashed password
    const result = await LogInCollection.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword, // Use the hashed password here
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
      type: "danger",
      message: " User deleted successfully",
    };

    const refererUrl = req.headers.referer;

    res.redirect(refererUrl);
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

// HRIS Routes

router.get("/hris", checkRoleHR, async (req, res) => {
  try {
    const employeecount = await LogInCollection.countDocuments();
    const pendingleave = await LeaveApplications.countDocuments({
      Status: "Pending",
    });
    res.render("hris", { employeecount, pendingleave });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/add_employees", (req, res) => {
  res.render("HRIS/add_employees");
});

router.get("/view_employees", async (req, res) => {
  try {
    const logincollections = await LogInCollection.find();
    res.render("HRIS/view_employees", { logincollections });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/leave_applications", async (req, res) => {
  try {
    const leaveapplications = await LeaveApplications.find();
    res.render("HRIS/leave_applications", { leaveapplications });
  } catch (err) {
    console.log("Error loading pages: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/approve-leave/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const leaveapplications = await LeaveApplications.findById(id);
    if (!leaveapplications) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/view_employees");
    }

    leaveapplications.Status = "Approved";
    leaveapplications.AppliedDate = new Date();
    await leaveapplications.save();

    req.session.message = {
      type: "success",
      message: "Leave application approved successfully",
    };

    res.redirect("/leave_applications");
  } catch (err) {
    console.log("Error approving leave: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/decline-leave/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const leaveapplications = await LeaveApplications.findById(id);
    if (!leaveapplications) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/view_employees");
    }

    leaveapplications.Status = "Declined";
    leaveapplications.AppliedDate = new Date();
    await leaveapplications.save();

    req.session.message = {
      type: "warning",
      message: "Leave application declined successfully",
    };

    res.redirect("/leave_applications");
  } catch (err) {
    console.log("Error declining leave: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/view_emp_data/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/hris");
    }

    // Render the edit_users template with the retrieved user data
    res.render("HRIS/view_emp_data", {
      title: "View Account",
      logincollections: logincollections,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/hris");
  }
});

router.get("/dtr", async (req, res) => {
  try {
    const mergedData = await LogInCollection.aggregate([
      {
        $lookup: {
          from: "attendances",
          localField: "email", // Common field in logincollections
          foreignField: "email", // Common field in attendance
          as: "attendanceData",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1, // Include the 'name' field from logincollections
          email: 1, // Include the 'email' field from logincollections
          department: 1, // Include the 'department' field from logincollections
          image: 1, // Include the 'image' field from logincollections
          attendanceData: 1, // Include all fields from the 'attendanceData' array
        },
      },
    ]);

    res.render("HRIS/dtr", { mergedData });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/view-dtr/:id", async (req, res) => {
  try {
    let id = req.params.id;

    // Fetch user's login information
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/dtr");
    }

    let email = logincollections.email;
    // Fetch rejected documents associated with the user's name
    let attendance = await Attendance.findOne({
      email: email,
    });

    res.render("HRIS/view-dtr", {
      title: "View Account",
      logincollections: logincollections,
      attendance: attendance,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/addacc", (req, res) => {
  res.render("addacc");
});

module.exports = router;
