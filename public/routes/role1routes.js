const express = require("express");
const router = express.Router();
const multer = require("multer");
const LogInCollection = require("../models/logincollections");

// Edit Account
router.get("/editacc/:name", async (req, res) => {
  try {
    const name = req.params.name;
    // Use findOne with a query object to find the user by name
    const logincollections = await LogInCollection.findOne({ name: name });

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    // Render the edit_users template with the retrieved user data
    res.render("role1_editacc", {
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

module.exports = router;
