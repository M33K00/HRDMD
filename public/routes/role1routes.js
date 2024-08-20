const express = require("express");
const router = express.Router();
const multer = require("multer");
const LogInCollection = require("../models/logincollections");
const Attendance = require("../models/attendance");
const SubmittedFiles = require("../models/submitted_files");
const ArchivedFiles = require("../models/archivedfiles");

// Edit Account
router.get("/editacc/:name", async (req, res) => {
  try {
    const name = req.params.name;
    // Use findOne with a query object to find the user by name
    const logincollections = await LogInCollection.findOne({ name: name });

    const attendance = await Attendance.findOne({ email: logincollections.email });

    if (!attendance) {
      // Handle the case where the user's _id is not found
      res.status(404).send("User not found.");
      return; // Exit the function early
    }

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    // Render the edit_users template with the retrieved user data
    res.render("role1_editacc", {
      title: "Edit Account",
      logincollections: logincollections,
      attendance: attendance,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error editing user account:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/role1");
  }
});

// View a user
router.get("/view-user/:id", async (req, res) => {
  try {
    let id = req.params.id;

    // Fetch user's login information
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    let email = logincollections.email;
    
    // Fetch rejected documents associated with the user's name
    let submittedfiles = await SubmittedFiles.find({ email: email });
    let archivedfiles = await ArchivedFiles.find({ email: email });

    // Combine submittedfiles and archivedfiles
    let allFiles = [...submittedfiles, ...archivedfiles];

    // Filter the combined array for PENDING and APPROVED files
    let pendingFiles = allFiles.filter((file) => file.status === "PENDING");
    let approvedFiles = allFiles.filter((file) => file.status === "APPROVED");

    // Render the view_account template with the retrieved data
    res.render("role/view_user", {
      title: "View Account",
      logincollections: logincollections,
      pendingFiles: pendingFiles,
      approvedFiles: approvedFiles,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error fetching user data:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/role1");
  }
});

module.exports = router;
