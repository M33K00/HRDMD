const router = require("./routes");
const multer = require("multer");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");

router.get("/hris_user", async (req, res) => {
  res.render("HRISUSER/hris_user");
});

router.get("/apply_leave", async (req, res) => {
  res.render("HRISUSER/apply_leave");
});

router.get("/view_leave/:email", async (req, res) => {
  try {
    const userEmail = req.params.email; // Retrieve email from URL parameter
    const leaveapplications = await LeaveApplications.find({
      email: userEmail,
    });
    res.render("HRISUSER/view_leave", { leaveapplications });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error viewing leave applications:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/hris");
  }
});

router.get("/view_profile/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/hris");
    }

    // Render the edit_users template with the retrieved user data
    res.render("HRISUSER/view_profile", {
      title: "View Account",
      logincollections: logincollections,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error editing user account:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/hris");
  }
});

router.post("/apply_leave", async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      email: req.body.email,
      Type: req.body.Type,
      Title: req.body.Title,
      StartDate: req.body.StartDate,
      Period: req.body.Period,
      reason: req.body.reason,
    };

    await LeaveApplications.insertMany([data]);

    // Set success message in session
    req.session.message = {
      type: "success",
      message: "Leave application submitted successfully!",
    };

    res.redirect("/apply_leave");
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error adding leave application:", err);
    req.session.message = {
      type: "danger",
      message: `Error adding leave application: ${err.message}`,
    };
    res.redirect("/apply_leave");
  }
});

router.get("/HRFiles", async (req, res) => {
  res.render("HRISUSER/HRFiles");
});

router.get("/dtr_user", async (req, res) => {
  res.render("HRISUSER/dtr_user");
});

module.exports = router;
