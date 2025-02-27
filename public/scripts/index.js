const express = require("express");
const cors = require("cors");
const session = require("express-session");
const app = express();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cron = require("node-cron");
const cookieParser = require("cookie-parser");
const { checkUser } = require("../middleware/authMiddleware.js");
const bodyParser = require("body-parser");

// Models
const LeaveApplications = require("../models/leaveapplications");
const LoginCollections = require("../models/logincollections");
const Departments = require("../models/departments");
const Attendance = require("../models/attendance");
const LastUpdate = require("../models/lastUpdate");
const SubmittedFiles = require("../models/submitted_files");


const PORT =  3939;
const templatePath = path.join(__dirname, "../templates");
const publicPath = path.join("public");

app.use(express.static(publicPath));
app.use(express.static("files"));
app.use(express.static("files/documents"));
app.use(express.static("files/images"));

// Production mode static files
app.use(express.static("resources/app/public"));
app.use(express.static("resources/app/files"));

app.set("view engine", "ejs");
app.set("views", templatePath);

// Middleware
app.use(bodyParser.json({limit: '5mb', extended: true}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// CSRF middleware
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("cookie-parser-secret"));
app.use(
  session({
    secret: "chiharu is a cat",
    resave: false, // Set resave option explicitly to false
    saveUninitialized: true, // Set saveUninitialized to true or false based on your needs
  })
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

// Route prefix
app.get("*", checkUser);
app.use("", require("../routes/routes"));
app.use("", require("../routes/document_routes.js"));
app.use("", require("../routes/upload_routes.js"));
app.use("", require("../routes/role1document_routes.js"));
app.use("", require("../routes/role1routes.js"));
app.use("", require("../routes/hris_user_routes.js"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
  res.contentType("image/png");

  fs.readFile("./public/images/kys.png", (err, data) => {
    if (err) {
      console.error("pati image ayaw mag load bubu", err);
      res.status(404).send("Kasalanan to ni Strike" + err);
    } else {
      res.send(data);
    }
  });
});

mongoose.connect("mongodb://0.0.0.0:27017/HRDMD");

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.once("open", async () => {
  console.log("Connected to MongoDB");

  // Perform backup check on server startup
  await performBackupCheck();

  // Schedule the annual update
  scheduleAnnualUpdate();
});

// Function to check if there is an account available
async function ensureAdminAccount() {
  try{
    const count = await LoginCollections.countDocuments();
    if (count === 0) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash("password", salt);
      const adminAccount = new LoginCollections({
        name: "Admin",
        email: "admin@hrdmd",
        password: hashedPassword,
        hrrole: "ADMIN",
        department: "HRDMD",
        verified: true,
      });

      await adminAccount.save();
      console.log("Admin account created successfully");
    } else {
      console.log("Admin account already exists");
    }
  } catch (error) {
    console.error("Error ensuring admin account:", error);
  }
}

// Function to check if HRDMD department exists
async function ensureHRDMDDepartment() {
  try {
    const count = await Departments.countDocuments({ deptAbbrev: "HRDMD" });
    if (count === 0) {
      const hrdmdDepartment = new Departments({ 
        deptName: "HUMAN RESOURCES DEVELOPMENT AND MANAGEMENT DEPARTMENT",
        deptAbbrev: "HRDMD" 
      });
      await hrdmdDepartment.save();
      console.log("HRDMD department created successfully");
    } else {
      console.log("HRDMD department already exists");
    }
  } catch (error) {
    console.error("Error ensuring HRDMD department:", error);
  }
}

// Function to update the collection
async function updateLeaveApplications() {
  try {
    const currentDate = new Date();
    const leaveApplications = await LeaveApplications.find({
      EndDate: { $lt: currentDate },});

    for (const leaveApplication of leaveApplications) {
      leaveApplication.Status = "Done/Expired";
      await leaveApplication.save();
    }

    console.log("Leave applications updated successfully");
  } catch (error) {
    console.error("Error updating leave applications:", error);
  }
}


// Function to update VL/SL/SPL points
async function updateAttendancePoints() {
  try {
    // Update attendance points for all records
    const result = await Attendance.updateMany(
      {}, // Empty filter means update all records
      { $inc: { availableSL: 15, availableVL: 15, availableSPL: 3 } }
    );

    // Log the update
    console.log(`Updated ${result.modifiedCount} attendance records.`);

    // Update the last update timestamp
    const currentYear = new Date().getFullYear();
    await LastUpdate.updateOne(
      { id: "annualUpdate" }, // Use a constant ID to track this specific update
      { $set: { year: currentYear, updatedAt: new Date() } },
      { upsert: true } // Create the record if it doesn't exist
    );

    console.log("Annual attendance points update completed.");
  } catch (error) {
    console.error("Error updating attendance points:", error);
  }
}

// Function to Reset TaskManager Levels
async function resetTaskManagerLevels() {
  try {
    const users = await LoginCollections.find({ department: "HRDMD" });

    for (const user of users) {
      const currentLevel = user.level;
      const currentExp = user.exp;

      user.prevLevel = currentLevel;
      user.prevExp = currentExp;

      user.level = 1;
      user.exp = 0;

      await user.save();
    }

    console.log("Task Manager Levels Reset for all HRDMD users");
  } catch (error) {
    console.error("Error resetting task manager levels:", error);
  }
}

// Ensure database is populated
async function initializeSetup() {
  try {
    await ensureHRDMDDepartment();
    await ensureAdminAccount();
  } catch (error) {
    console.error("Error initializing setup:", error);
  }
}
// Call the initialization function
initializeSetup();


// Function to perform a backup check on server startup
async function performBackupCheck() {
  const currentYear = new Date().getFullYear();

  try {
    // Check the last update record
    const lastUpdate = await LastUpdate.findOne({ id: "annualUpdate" });

    // If no update for the current year, perform the update
    if (!lastUpdate || lastUpdate.year < currentYear) {
      console.log("Missed annual update. Running update now...");
      await Promise.all([
        updateAttendancePoints(),
        resetTaskManagerLevels()
      ])
    } else {
      console.log("Annual update for this year already applied.");
    }
  } catch (error) {
    console.error("Error performing backup check:", error);
  }
}

// Schedule the task to run on January 1st at midnight
function scheduleAnnualUpdate() {
  cron.schedule("0 0 1 1 *", async () => {
    console.log("Running annual attendance points update...");
    await updateAttendancePoints();
    console.log("Annual attendance points update completed.");
  });

  console.log("Scheduled task for annual attendance points and task manager levels update.");
}

setInterval(updateLeaveApplications, 60 * 60 * 1000);

// New endpoint for polling
app.get("/api/new-tasks", async (req, res) => {
  try {
      const { email } = req.query;
      const lastChecked = new Date(req.query.lastChecked);
      const newTasks = await SubmittedFiles.find({
          dateSubmitted: { $gt: lastChecked },
          email: email // Only return tasks for the specified email
      });
      res.json(newTasks);
  } catch (error) {
      console.error("Error fetching new tasks:", error);
      res.status(500).send("Server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
