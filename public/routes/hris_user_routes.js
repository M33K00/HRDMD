const router = require("./routes");
const multer = require("multer");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");
const Attendance = require("../models/attendance");
const DaysPresent = require("../models/dayspresent");
const DaysAbsent = require("../models/daysabsent");

// 201 File Models
const UserDocuments = require("../models/userdocuments");
const AppPaper = require("../models/201File/appPaper");
const CertERL = require("../models/201File/certERL");
const Certifications = require("../models/201File/certifications");
const CertLB = require("../models/201File/certLB");
const Clearances = require("../models/201File/clearances");
const Commendations = require("../models/201File/commendations");
const CopyReso = require("../models/201File/copyReso");
const Cos = require("../models/201File/cos");
const OathO = require("../models/201File/oathO");
const OfficeOrder = require("../models/201File/officeOrder");
const PDS = require("../models/201File/pds");
const PosDF = require("../models/201File/posDF");
const Schol = require("../models/201File/schol");
const SwornStat = require("../models/201File/swornStat");

// 201 File Model Array
const userDocumentsArray = [
  AppPaper,
  CertERL,
  Certifications,
  CertLB,
  Clearances,
  Commendations,
  CopyReso,
  Cos,
  OathO,
  OfficeOrder,
  PDS,
  PosDF,
  Schol,
  SwornStat,
];

const findDocumentsByEmail = async (email, batchSize = 5) => {
  const results = [];

  for (let i = 0; i < userDocumentsArray.length; i += batchSize) {
    const batch = userDocumentsArray
      .slice(i, i + batchSize)
      .map((userDocumentsArray) =>
        userDocumentsArray.findOne({ email }).exec()
      );
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  return results;
};

// Routes
router.get("/view_profile/:email", async (req, res) => {
  try {
    let email = req.params.email;
    let logincollections = await LogInCollection.findOne({
      email: email,
    });

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/hris");
    }

    const results = await findDocumentsByEmail(email);

    res.render("HRISUSER/view_profile", {
      title: "View Account",
      logincollections: logincollections,
      results: results,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error editing user account:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/hris");
  }
});

router.get("/hris_user/:email", async (req, res) => {
  try {
    const userEmail = req.params.email; // Retrieve email from URL parameter
    const leaveapplications = await LeaveApplications.find({
      email: userEmail,
    });

    const attendance = await Attendance.findOne({ email: userEmail });
    res.render("HRISUSER/hris_user", { leaveapplications, attendance });
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
    } else if (
      data.Type === "Vacation Leave" &&
      account.availableVL < daysDiff
    ) {
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
      message:
        err.message ||
        "An error occurred while processing your request. Please try again later.",
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

    const timeIn = new Date(attendance.timeIn);
    const currentTime = new Date();

    let totalHours = 0;
    let totalMinutes = 0;

    if (timeIn !== null) {
      const timeDifference = currentTime - timeIn;
      totalHours = Math.floor(timeDifference / (1000 * 60 * 60));
      totalMinutes = Math.floor(
        (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
      );
    }

    let dayspresent = await DaysPresent.find({
      email: email,
    });

    let daysabsent = await DaysAbsent.find({
      email: email,
    });

    res.render("HRISUSER/dtr_user", {
      title: "View Account",
      logincollections: logincollections,
      attendance: attendance,
      dayspresent: dayspresent,
      daysabsent: daysabsent,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/clockin/:email", async (req, res) => {
  try {
    const email = req.params.email;

    // Find the user's _id from Logincollections using the email
    const userLogin = await LogInCollection.findOne({ email: email });
    if (!userLogin) {
      // Handle the case where the user's _id is not found
      res.status(404).send("User not found.");
      return; // Exit the function early
    }

    // Find the user with the specified email
    const user = await Attendance.findOne({ email: email });

    if (!user) {
      // If the user doesn't exist, create a new entry
      const newData = {
        email: email,
        daysPresent: 0,
        timeIn: new Date(), // Current date and time
        status: "IN",
      };
      await Attendance.create(newData);
    } else {
      // If the user exists, increment daysPresent by 1 and update timeIn
      user.daysPresent += 1;
      user.timeIn = new Date(); // Update timeIn to current date and time
      user.status = "IN";
      await user.save();
    }

    // Create DaysPresent entry for tracking presence
    const dpData = {
      email: email,
      timeIn: new Date(),
      date: new Date(new Date().setHours(0, 0, 0, 0)),
    };
    await DaysPresent.create(dpData);

    // Set a success message in the session
    req.session.message = {
      type: "success",
      message: "Clock-in successful.",
    };

    // Redirect to the user's page
    res.redirect("/dtr_user/" + userLogin._id);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/clockout/:email", async (req, res) => {
  try {
    const email = req.params.email;

    // Find the user's _id from Logincollections using the email
    const userLogin = await LogInCollection.findOne({ email: email });
    if (!userLogin) {
      // Handle the case where the user's _id is not found
      res.status(404).send("User not found.");
      return; // Exit the function early
    }

    // Find the user with the specified email
    const user = await Attendance.findOne({ email: email });

    const timeIn = new Date(user.timeIn);
    const currentTime = new Date();

    const timeDifference = currentTime - timeIn;

    const totalHoursDecimal = timeDifference / 3600000;

    if (!user) {
      console.log("User not found");
      return;
    } else {
      user.timeIn = null; // Update timeIn to current date and time
      user.status = "OUT";
      user.hoursWorked += totalHoursDecimal;
      await user.save();
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find record for today
    const dp = await DaysPresent.findOne({ email: email, date: today });

    if (!dp) {
      console.log("DP not found for today");

      // Get yesterday's date
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // Find record for yesterday
      const dpYesterday = await DaysPresent.findOne({
        email: email,
        date: yesterday,
      });

      if (!dpYesterday) {
        console.log("DP not found for yesterday as well");
        return;
      }
      console.log("Record found for yesterday:", dpYesterday.date);
      dp.timeOut = new Date();
      dp.totalTime = totalHoursDecimal;
      if (totalHoursDecimal > 8) {
        dp.overTime = totalHoursDecimal - 8;
      }
    } else {
      dp.timeOut = new Date();
      dp.totalTime = totalHoursDecimal;
      if (totalHoursDecimal < 8) {
        dp.underTime = 8 - totalHoursDecimal;
      } else {
        dp.underTime = 0;
      }
      if (totalHoursDecimal > 8) {
        dp.overTime = totalHoursDecimal - 8;
      } else {
        dp.overTime = 0;
      }
      await dp.save();
    }
    req.session.message = {
      type: "success",
      message: "Clock-in successful.",
    };
    res.redirect("/dtr_user/" + userLogin._id);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
