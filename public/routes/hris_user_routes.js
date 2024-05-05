const router = require("./routes");
const multer = require("multer");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");
const Attendance = require("../models/attendance");

router.get("/hris_user/:email", async (req, res) => {
  try {
    const userEmail = req.params.email; // Retrieve email from URL parameter
    const leaveapplications = await LeaveApplications.find({
      email: userEmail,
    });
    res.render("HRISUSER/hris_user", { leaveapplications });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error viewing leave applications:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/startpage");
  }
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
    // Data validation (not shown here, but you should validate input fields)

    const data = {
      name: req.body.name,
      email: req.body.email,
      Type: req.body.Type, // Changed to lowercase for naming convention
      StartDate: new Date(req.body.StartDate), // Convert to Date object
      EndDate: new Date(req.body.EndDate), // Convert to Date object
      reason: req.body.reason,
    };

    // Calculate the number of days between StartDate and EndDate
    const timeDiff = Math.abs(data.EndDate - data.StartDate);
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

    // Get account by name
    const account = await Attendance.findOne({ name: data.name });

    // Check if account exists
    if (!account) {
      throw new Error("Account not found.");
    }

    // Check if there's sufficient leave balance
    if (data.Type === "Sick Leave" && account.availableSL < daysDiff) {
      req.session.message = {
        type: "danger",
        message: "You used up all your sick leave.",
      };
      res.redirect("/apply_leave");
    } else if (data.Type === "Vacation Leave" && account.availableVL < daysDiff) {
      req.session.message = {
        type: "danger",
        message: "You used up all your vacation leave.",
      };
      res.redirect("/apply_leave");
      return;
    }

    // Insert data into the database
    await LeaveApplications.insertMany([data]);

    // Update available leave based on leave type and number of days
    if (data.Type === "Sick Leave") {
      account.availableSL -= daysDiff;
    } else if (data.Type === "Vacation Leave") {
      account.availableVL -= daysDiff;
    }

    // Save the updated account
    await account.save();

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
      message: err.message || "An error occurred while processing your request. Please try again later.",
    };
    res.redirect("/apply_leave");
  }
});



router.get("/HRFiles", async (req, res) => {
  res.render("HRISUSER/HRFiles");
});

router.get("/dtr_user/:id", async (req, res) => {
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

    res.render("HRISUSER/dtr_user", {
      title: "View Account",
      logincollections: logincollections,
      attendance: attendance,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
