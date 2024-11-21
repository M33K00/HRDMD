const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const LogInCollection = require("../models/logincollections");
const Attendance = require("../models/attendance");
const SubmittedFiles = require("../models/submitted_files");
const ArchivedFiles = require("../models/archivedfiles");

// Edit Account
router.get("/editacc/:employeeID", async (req, res) => {
  try {
    const employeeID = req.params.employeeID;
    // Use findOne with a query object to find the user by employeeID
    const logincollections = await LogInCollection.findOne({ employeeID: employeeID });

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

// Change Password
router.post("/change-password", async (req, res) => {
  const { currentPassword, oldHashedPassword, newPassword, employeeID } = req.body;
  try {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Validate entered old password against the stored hashed password
    const isMatch = await bcrypt.compare(currentPassword, oldHashedPassword);
    if (!isMatch) {
      return res.json({ success: false, error: "current_password_incorrect" });
    }

    // Update password in the database
    await LogInCollection.updateOne(
      { employeeID: employeeID },
      { $set: { password: hashedPassword } }
    );

    console.log("Password updated successfully.");
    res.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    res.json({ success: false, error: "server_error" });
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
    let pendingFiles = allFiles.filter((file) => file.status === "ASSIGNED");
    let approvedFiles = allFiles.filter((file) => file.status === "APPROVED");

    // Calculate Ratio
    let pendingCount = pendingFiles.length;
    let approvedCount = approvedFiles.length;

    let ratio = pendingCount > 0 ? (approvedCount / pendingCount).toFixed(2) : 0;

    // Level Variables
    const { exp, level } = logincollections;
    const requiredExp = 100 * level;
    const nextLevelExp = 100 * (level + 1);

    // Render the view_account template with the retrieved data
    res.render("role/view_user", {
      title: "View Account",
      logincollections: logincollections,
      pendingFiles: pendingFiles,
      approvedFiles: approvedFiles,
      ratio: ratio,
      exp: exp,
      level: level,
      requiredExp: requiredExp,
      nextLevelExp: nextLevelExp
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error fetching user data:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/role1");
  }
});

module.exports = router;
