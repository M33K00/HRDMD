const express = require("express");
const router = express.Router();
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const authController = require("../controllers/authController");
const bcrypt = require("bcrypt");
const { checkRoleHR } = require("../middleware/authMiddleware.js");
const { checkHRSettings } = require("../middleware/HRSettingsMiddleware");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");
const Attendance = require("../models/attendance");
const DaysPresent = require("../models/dayspresent");
const DaysAbsent = require("../models/daysabsent");
const daysAbsent = require("../models/daysabsent");
const HRSettings = require("../models/hrsettings");
const DaysPresentA = require("../models/dayspresentA");
const DaysAbsentA = require("../models/daysabsentA");
const SubmittedFiles = require("../models/submitted_files");
const ArchivedFiles = require("../models/archivedfiles");

// 201 File Models
const UserDocuments = require("../models/userdocuments");
const AppPaper = require("../models/201File/appPaper");
const CertERL = require("../models/201File/certERL");
const CertATD = require("../models/201File/certATD");
const CertBL = require("../models/201File/certBL");
const MedCert = require("../models/201File/medCert");
const CertLB = require("../models/201File/certLB");
const MarriageCont = require("../models/201File/marriageCont");
const Clearances = require("../models/201File/clearances");
const Commendations = require("../models/201File/commendations");
const CopyReso = require("../models/201File/copyReso");
const Cos = require("../models/201File/cos");
const OathO = require("../models/201File/oathO");
const OfficeOrder = require("../models/201File/officeOrder");
const PDS = require("../models/201File/pds");
const PosDF = require("../models/201File/posDF");
const Schol = require("../models/201File/schol");
const SwornS = require("../models/201File/swornS");
const CertLeaveB = require("../models/201File/certLeaveB");
const DisAct = require("../models/201File/disAct");
const { default: isEmail } = require("validator/lib/isEmail.js");

// 201 File Model Array
const userDocumentsArray = [  
  AppPaper,
  PDS,
  CertERL,
  OathO,
  CertATD,
  CertBL,
  PosDF,
  MedCert,
  CertLB,
  MarriageCont,
  Clearances,
  Schol,
  CertLeaveB,
  CopyReso,
  Commendations,
  DisAct,
  Cos,
  SwornS,
  OfficeOrder,
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

const vlPointsAdditions = [
  0.042, 0.063, 0.125, 0.167, 0.208, 0.250, 0.292, 0.333, 0.375, 0.417, 
  0.458, 0.500, 0.542, 0.583, 0.625, 0.667, 0.708, 0.750, 0.792, 0.833, 
  0.875, 0.917, 0.958, 1.000, 1.042, 1.083, 1.125, 1.167, 1.208, 1.250
];

async function calculateCurrentVLPoints(email) {

  var presentStreak = 0
  var vlPoints = 1.25
  
  const dates = []
  const attendances = {}
  
  function getDateOnly(date) {
      return (
          date.getYear().toString().padStart(4,0) + '/' +
          date.getMonth().toString().padStart(2,0) + '/' +
          date.getDate().toString().padStart(2,0)
      )
  }
  
  const daysPresent = await DaysPresent.find({ email: email }).sort({ date: -1 })
  daysPresent.forEach((presentRecord) => {
      const dateOnly = getDateOnly(presentRecord.date)
      if (!attendances[dateOnly]) {
          dates.push(dateOnly)
          attendances[dateOnly] = 'present'
      }
  });
  
  const daysAbsent = await DaysAbsent.find({ email: email }).sort({ date: -1 })
  daysAbsent.forEach((presentRecord) => {
      const dateOnly = getDateOnly(presentRecord.date)
      if (!attendances[dateOnly]) {
          dates.push(dateOnly)
          attendances[dateOnly] = 'absent'
      }
  });
  
  dates.sort()
  
  for (const dateOnly of dates) {
      
      if ( attendances[dateOnly] === 'present' ) {
          presentStreak++
          vlPoints += vlPointsAdditions[presentStreak > 30 ? 30 : presentStreak]
      } else if ( attendances[dateOnly] === 'absent' ) {
          presentStreak = 0
          vlPoints -= 1
      }
      
  }

  return vlPoints
}

async function calculateCurrentSLPoints(email) {

  var presentStreak = 0;
  var slPoints = 1.25;

  const dates = [];
  const attendances = {};

  function getDateOnly(date) {
      return (
          date.getYear().toString().padStart(4, 0) + '/' +
          (date.getMonth() + 1).toString().padStart(2, 0) + '/' + // corrected getMonth() to return the month in 1-12 format
          date.getDate().toString().padStart(2, 0)
      );
  }

  const daysPresent = await DaysPresent.find({ email: email }).sort({ date: -1 });
  daysPresent.forEach((presentRecord) => {
      const dateOnly = getDateOnly(presentRecord.date);
      if (!attendances[dateOnly]) {
          dates.push(dateOnly);
          attendances[dateOnly] = 'present';
      }
  });

  const daysAbsent = await DaysAbsent.find({ email: email }).sort({ date: -1 });
  daysAbsent.forEach((absentRecord) => {
      const dateOnly = getDateOnly(absentRecord.date);
      if (!attendances[dateOnly]) {
          dates.push(dateOnly);
          attendances[dateOnly] = 'absent';
      }
  });

  dates.sort();

  for (const dateOnly of dates) {
      if (attendances[dateOnly] === 'present') {
          presentStreak++;
          slPoints += vlPointsAdditions[presentStreak > 30 ? 30 : presentStreak];
      } else if (attendances[dateOnly] === 'absent') {
          presentStreak = 0;
          // No decrement of slPoints
      }
  }

  return slPoints;
}

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

router.post("/add_employee", upload, async (req, res) => {
  try {
    console.log(req.body);

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

    const dayOff = req.body.dayOff; // Array of day off strings like ["Sunday", "Monday"]

    const adata = {
      name: req.body.name,
      email: req.body.email,
      paySched: req.body.paySched,
      dayOff: dayOff,
    };

    // Insert data into the LogInCollection
    await LogInCollection.insertMany([data]);

    // Create a new attendance document
    await Attendance.insertMany([adata]);

    // Set success message in session
    req.session.message = {
      type: "success",
      message: "User added successfully",
    };

    // Redirect to manage_accounts page
    return res.redirect("/view_employees");
  } catch (error) {
    console.error(error);

    // Set error message in session
    req.session.message = {
      type: "error",
      message: error.message,
    };

    // Redirect to the previous page or an error page
    return res.redirect("/view_employees");
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mikuosuzuya@gmail.com',
    pass: 'uojo zrtz pjyy kohf',
  },
});

// Verify account
router.get("/verify/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const logincollection = await LogInCollection.findById(id);

    if (!logincollection) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    const result = await LogInCollection.findByIdAndUpdate(
      id,
      { verified: true },
      { new: true } // Return the modified document after update
    );
    if (!result) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    const userName = logincollection.name;
    const today = new Date();
    const formattedDate = today.toLocaleDateString();

    const mailOptions = {
      from: 'mikuosuzuya@gmail.com',               // Sender address
      to: logincollection.email,                   // Receiver address (user's email)
      subject: 'Account Verified',                 // Subject line
      text: `Hello ${userName},\n\nThe account you created in the HRDMD Application has been successfully verified and you can now login.\n\nAccount verification date: ${formattedDate}`,
      html: `<p>Hello ${userName},</p>
             <p>The account you created in the HRDMD Application has been successfully verified and you can now login.</p>
             <p>Account verification date: ${formattedDate}</p>`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    req.session.message = {
      type: "success",
      message: " User verified successfully",
    };
    res.redirect("/view_emp_data/" + logincollection.email);
  } catch (err) {
    console.error(err);
    res.json({ message: err.message, type: "danger" });
  }
})

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
    res.render("view_account", {
      title: "View Account",
      logincollections: logincollections,
      pendingFiles: pendingFiles,
      approvedFiles: approvedFiles,
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

    let email = logincollections.email;

    const attendance = await Attendance.findOne({ email: email });

    if (!attendance) {
      // Handle the case where the user's _id is not found
      req.session.message = {
        type: "danger",
        message: "User not found. Please try again.",
      };
      res.redirect("/view/" + id);
      return; // Exit the function early
    }

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    // Render the edit_users template with the retrieved user data
    res.render("edit_users", {
      title: "Edit Account",
      logincollections: logincollections,
      attendance: attendance,
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

    const userLogin = await LogInCollection.findById(id);
    if (!userLogin) {
      // Handle the case where the user's _id is not found
      res.status(404).send("User not found.");
      return; // Exit the function early
    }

    const dayOffArray = Array.isArray(req.body.dayOff)
      ? req.body.dayOff
      : [req.body.dayOff];

    if (req.file) {
      new_image = req.file.filename;
      try {
        // Delete old image if a new image is uploaded
        if (req.body.old_image != "") {
          fs.unlinkSync("./files/images/" + req.body.old_image);
        }
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
    if (req.body.birthday) {
      const datePartOnly = req.body.birthday.split("T")[0];
      parsedBirthday = new Date(datePartOnly); // Assign a value if req.body.birthday exists
    } else {
      parsedBirthday = userLogin.birthday;
    }

    const result = await LogInCollection.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        lastname: req.body.lastname,
        birthday: parsedBirthday,
        contact: req.body.contact,
        email: req.body.email,
        password: hashedPassword, // Use the hashed password here
        department: req.body.department,
        position: req.body.position,
        hrrole: req.body.hrrole,
        empStatus: req.body.empStatus,
        image: new_image,
      },
      { new: true } // Return the modified document after update
    );

    if (!result) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    const adata = await Attendance.findOneAndUpdate(
      { email: userLogin.email },
      {
        dayOff: dayOffArray,
        email: req.body.email,
      },
      { new: true } // Return the modified document after update
    );

    if (!adata) {
      return res.json({ message: "Attendance Data not found", type: "DANGER" });
    }

    req.session.message = {
      type: "success",
      message: "User updated successfully",
    };
    // Redirect after successful update
    if (req.body.userInput) {
      if (req.body.email) {
        return res.redirect("/view_profile/" + req.body.email);
      } else {
        return res.redirect("/view_profile/" + userLogin.email);
      }
    } else {
      return res.redirect("/view_emp_data/" + userLogin.email);
    }
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

// Close a user account
router.get("/close-account/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const logincollection = await LogInCollection.findById(id);

    if (!logincollection) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    const result = await LogInCollection.findByIdAndUpdate(
      id,
      { accountClosed: true },
      { new: true } // Return the modified document after update
    );
    if (!result) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    req.session.message = {
      type: "danger",
      message: " User closed successfully",
    };
    res.redirect("/view_emp_data/" + logincollection.email);
  } catch (err) {
    console.error(err);
    res.json({ message: err.message, type: "danger" });
  }
});

// Reopem a user account
router.get("/reopen-account/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const logincollection = await LogInCollection.findById(id);

    if (!logincollection) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    const result = await LogInCollection.findByIdAndUpdate(
      id,
      { accountClosed: false },
      { new: true } // Return the modified document after update
    );
    if (!result) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    req.session.message = {
      type: "success",
      message: " User reopened successfully",
    };
    res.redirect("/view_emp_data/" + logincollection.email);
  } catch (err) {
    console.error(err);
    res.json({ message: err.message, type: "danger" });
  }
});

// Delete a user
router.get("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const logincollection = await LogInCollection.findById(id);

    await Attendance.findOneAndDelete({ email: logincollection.email });
    await DaysPresent.deleteMany({ email: logincollection.email });
    await DaysAbsent.deleteMany({ email: logincollection.email });

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

    res.redirect("/view_employees");
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

router.get("/startpage", (req, res) => {
  res.render("startpage");
});

router.get("/document_tracker/:hrrole", async (req, res) => {
  try {
    const hrrole = req.params.hrrole;

    // Based on the hrrole, render the appropriate template
    if (hrrole === "ADMIN") {
      res.redirect("/home");
    } else {
      res.redirect("/role1");
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

    // Based on the hrrole, render the appropriate template
    if (hrrole === "ADMIN") {
      res.redirect("/manage_accounts");
    } else {
      res.redirect(`/editacc/${encodeURIComponent(name)}`);
    }
  } catch (err) {
    console.log("Error loading pages: ", err);
    res.status(500).send("Internal Server Error");
  }
});

const ITEMS_PER_PAGE = 10; // Number of items per page

router.get("/manage_accounts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Current page number, default to 1
    const totalItems = await LogInCollection.countDocuments(); // Total number of items

    const logincollections = await LogInCollection.find()
      .skip((page - 1) * ITEMS_PER_PAGE) // Skip items based on current page
      .limit(ITEMS_PER_PAGE); // Limit the number of items per page

    res.render("manage_accounts", {
      logincollections,
      currentPage: page,
      totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
      itemsPerPage: ITEMS_PER_PAGE,
      totalItems,
    });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Manage Permission Routes

router.get("/manage_permission/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      return res.status(404).send("Not Found");
    }

    res.render("manage_permission", { logincollections });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.post("/update_permissions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const update = {
      mEmp: req.body.mEmp === 'on',
      mLeave: req.body.mLeave === 'on',
      mDTR: req.body.mDTR === 'on',
      mPrint: req.body.mPrint === 'on',
    };
    await LogInCollection.findByIdAndUpdate(id, update);

    req.session.message = {
      type: "success",
      message: "Permissions updated successfully",
    };

    res.redirect(`/manage_permission/${id}`);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// HRIS Routes

router.get("/hris", async (req, res) => {
  try {
    const employeecount = await LogInCollection.find();
    const pendingleave = await LeaveApplications.countDocuments({
      Status: "Pending",
    });
    const inAttendance = await Attendance.countDocuments({ status: "IN" });
    res.render("hris", { employeecount, pendingleave, inAttendance });
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
    logincollections.sort((a, b) => a.verified - b.verified);
    res.render("HRIS/view_employees", { logincollections });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/leave_applications", async (req, res) => {
  try {
    const leaveapplications = await LeaveApplications.find();
    const activeLeaveApplications = leaveapplications.filter(application => application.Status !== 'Done/Expired');
    res.render("HRIS/leave_applications", { leaveapplications, activeLeaveApplications });
  } catch (err) {
    console.log("Error loading pages: ", err);
    res.status(500).send("Internal Server Error");
  }
});

// Get active leave applications
router.get("/leave_applicationsJSON", async (req, res) => {
  try {
    const leaveApplications = await LeaveApplications.find();
    const activeLeaveApplications = leaveApplications.filter(application => application.Status !== 'Done/Expired');
    res.json(activeLeaveApplications); // Send JSON response
  } catch (err) {
    console.log("Error loading data: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/manage-leave/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const leaveapplications = await LeaveApplications.findById(id);

    if (!leaveapplications) {
      req.session.message = {
        type: "warning",
        message: "Leave application not found",
      };
      return res.redirect("HRIS/view_employees");
    }

    const leaveuser = await LogInCollection.findOne({
      email: leaveapplications.email,
    });
    if (!leaveuser) {
      req.session.message = {
        type: "warning",
        message: "User not found",
      };
    }

    const userAttendance = await Attendance.findOne({
      email: leaveapplications.email,
    });

    if (!userAttendance) {
      req.session.message = {
        type: "warning",
        message: "User not found",
      };
    }

    res.render("HRIS/approve-leave", {
      leaveapplications,
      leaveuser,
      userAttendance,
    });
  } catch (err) {
    console.log("Error viewing leave: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/view-leave/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const leaveapplications = await LeaveApplications.findById(id);

    if (!leaveapplications) {
      req.session.message = {
        type: "warning",
        message: "Leave application not found",
      };
      return res.redirect("HRIS/view_employees");
    }

    const leaveuser = await LogInCollection.findOne({
      email: leaveapplications.email,
    });
    if (!leaveuser) {
      req.session.message = {
        type: "warning",
        message: "User not found",
      };
    }

    const userAttendance = await Attendance.findOne({
      email: leaveapplications.email,
    });

    if (!userAttendance) {
      req.session.message = {
        type: "warning",
        message: "User not found",
      };
    }

    res.render("HRIS/view-leave", {
      leaveapplications,
      leaveuser,
      userAttendance,
    });
  } catch (err) {
    console.log("Error viewing leave: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/manage-leave/:id", async (req, res) => {
  console.log(req.body);

  try {
    const id = req.params.id;
    const leaveapplications = await LeaveApplications.findById(id);

    if (!leaveapplications) {
      req.session.message = {
        type: "warning",
        message: "Leave application not found",
      };
      return res.redirect("/leave_applications");
    }

    const attendance = await Attendance.findOne({
      email: leaveapplications.email,
    });

    if (!attendance) {
      req.session.message = {
        type: "warning",
        message: "User not found",
      };
      return res.redirect("/leave_applications");
    }

    let recommendation = req.body.recommendation;
    let status;

    if (recommendation === "Approved") {
      status = "Approved";
    } else if (recommendation === "Disapproved") {
      status = "Declined";
    }

    const data = {
      Status: status,
      recommendation: recommendation,
      daysWithPay: req.body.daysWithPay,
      daysWithoutPay: req.body.daysWithoutPay,
      daysOthers: req.body.daysOthers,
      dissaprovedReason: req.body.dissaprovedReason,
      AppliedDate: new Date(),
    };

    let VLBalance = attendance.availableVL;
    let SLBalance = attendance.availableSL;
    let VLLess = parseInt(req.body.VLLess, 10) || 0;
    let SLLess = parseInt(req.body.SLLess, 10) || 0;
    let newVLBalance;
    let newSLBalance;

    if (recommendation === "Approved") {
      newVLBalance = VLBalance - VLLess;
      newSLBalance = SLBalance - SLLess;

      const data2 = {
        availableVL: newVLBalance,
        availableSL: newSLBalance,
      };

      console.log(data2);

      try {
        await Attendance.findByIdAndUpdate(attendance._id, data2);

        console.log("Attendance updated successfully");
      } catch (err) {
        console.log("Error updating attendance: ", err);
        req.session.message = {
          type: "warning",
          message: "Error updating attendance",
        };
        return res.redirect("/leave_applications");
      }
    }

    await LeaveApplications.findByIdAndUpdate(id, data);

    req.session.message = {
      type: "success",
      message: "Leave application " + status,
    };
    res.redirect("/leave_applications");
  } catch (err) {
    console.log("Error declining leave: ", err);
    req.session.message = {
      type: "warning",
      message: "Error declining leave application",
    };
    res.redirect("/leave_applications");
  }
});

router.get("/view_emp_data/:email", checkHRSettings, async (req, res) => {
  try {
    let email = req.params.email;
    let hrSettings = await req.models.HRSettings.findOne();
    let logincollections = await LogInCollection.findOne({ email: email });
    let attendance = await Attendance.findOne({ email: email });

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/hris");
    }

    const results = await findDocumentsByEmail(logincollections.email);

    const VLPoints = await calculateCurrentVLPoints(logincollections.email);
    const SLPoints = await calculateCurrentSLPoints(logincollections.email);

    // Render the edit_users template with the retrieved user data
    res.render("HRIS/view_emp_data", {
      title: "View Account",
      logincollections: logincollections,
      hrSettings: hrSettings,
      attendance: attendance,
      results: results,
      VLPoints: VLPoints,
      SLPoints: SLPoints,
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
          lastname: 1, // Include the 'lastname' field from logincollections
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

router.get("/view-dtr/:id", checkHRSettings, async (req, res) => {
  let hrSettings = await req.models.HRSettings.findOne();
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
    const dateA = new Date(new Date().setHours(0, 0, 0, 0));

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

    let dayspresentA = await DaysPresentA.find({
      email: email,
    });

    let daysabsentA = await DaysAbsentA.find({
      email: email,
    });

    let leaveA = await LeaveApplications.find({
      email: email,
      Status: "CLOSED",
    });

    let absentStatus = await DaysAbsent.findOne({
      email: email,
      date: dateA,
    });

    let leaveapplications = await LeaveApplications.find({
      email: email,
      Status: "Approved",
    });

    let status;

    if (absentStatus) {
      status = "Absent";
    } else {
      status = "Present";
    }

    const VLPoints = await calculateCurrentVLPoints(logincollections.email);
    const SLPoints = await calculateCurrentSLPoints(logincollections.email);

    res.render("HRIS/view-dtr", {
      title: "View Account",
      logincollections: logincollections,
      hrSettings: hrSettings,
      attendance: attendance,
      dayspresent: dayspresent,
      daysabsent: daysabsent,
      dayspresentA: dayspresentA,
      daysabsentA: daysabsentA,
      leaveA: leaveA,
      leaveapplications: leaveapplications,
      status: status,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      VLPoints: VLPoints,
      SLPoints: SLPoints,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});



router.get("/m-absent/:id", async (req, res) => {
  try {
    let id = req.params.id;

    let logincollections = await LogInCollection.findById(id);

    let email = logincollections.email;

    let attendance = await Attendance.findOne({
      email: email,
    });

    if (!attendance) {
      req.session.message = {
        type: "warning",
        message: "No attendance found for this user",
      };
      res.redirect("/view-dtr/" + logincollections._id);
    } else {
      attendance.daysAbsent += 1;
      await attendance.save();
    }

    const dateA = new Date(new Date().setHours(0, 0, 0, 0));

    mAbsent = {
      name: logincollections.name,
      email: logincollections.email,
      date: dateA,
    };

    await daysAbsent.create(mAbsent);

  
    req.session.message = {
      type: "warning",
      message: "Marked as absent successfully",
    };

    res.redirect("/view-dtr/" + logincollections._id);
  } catch (err) {
    console.log("Error marking as absent: ", err);
    res.status(500).send("aw bollucks!");
  }
});

router.get("/hrSettings", checkHRSettings, async (req, res) => {
  try {
    let hrSettings = await req.models.HRSettings.findOne();

    if (!hrSettings) {
      hrSettings = await req.models.HRSettings.create({
        startDate: "",
        endDate: "",
        hoursPerDay: "",
        startTime: "7:00",
        endTime: "19:00",
      });
    }

    res.render("HRIS/hrSettings", { hrSettings });
  } catch (err) {
    console.error("Error fetching HR settings:", err);
    res.status(500).send("Error fetching HR settings.");
  }
});

router.get("/DTRSettings", checkHRSettings, async (req, res) => {
  try {
    let hrSettings = await req.models.HRSettings.findOne();

    if (!hrSettings) {
      hrSettings = await req.models.HRSettings.create({
        startDate: "",
        endDate: "",
        hoursPerDay: "",
        startTime: "7:00",
        endTime: "19:00",
      });
    }

    res.render("HRIS/DTRSettings", { hrSettings });
  } catch (err) {
    console.error("Error fetching HR settings:", err);
    res.status(500).send("Error fetching HR settings.");
  }
});

router.post("/hrSettings", checkHRSettings, async (req, res) => {
  try {
    // Find the existing HR settings (assuming only one document exists)
    let existingSettings = await req.models.HRSettings.findOne();

    if (!existingSettings) {
      // If no existing settings found, create a new instance
      existingSettings = new req.models.HRSettings(req.body);
    } else {
      // Update the existing settings with the new values from req.body
      existingSettings.startDate = req.body.startDate;
      existingSettings.endDate = req.body.endDate;
      existingSettings.hoursPerDay = (
        new Date(`1970-01-01T${req.body.endTime}:00`) - 
        new Date(`1970-01-01T${req.body.startTime}:00`)
      ) / (1000 * 60 * 60); // Convert milliseconds to hours      
      existingSettings.startTime = req.body.startTime;
      existingSettings.endTime = req.body.endTime;
    }

    console.log(existingSettings);

    // Save the settings (either new or updated)
    await existingSettings.save();

    req.session.message = {
      type: "success",
      message: "HR settings updated successfully",
    };

    res.redirect("/DTRSettings"); // Redirect to the settings page or another page as needed
  } catch (err) {
    req.session.message = {
      type: "danger",
      message: "Failed to update DTR settings",
    };
    console.error("Error updating HR settings:", err);
    res.redirect("/DTRSettings");
  }
});

router.get("/print-hr-dtr/:department", async (req, res) => {
  try {
    const reqdep = req.params.department;

    let department;

    switch (reqdep) {
      case "HR":
        department = "HR Department";
        break;
      case "DP1":
        department = "Department 1";
        break;
      case "DP2":
        department = "Department 2";
        break;
      case "DP3":
        department = "Department 3";
        break;
      case "DP4":
        department = "Department 4";
        break;
      case "DP5":
        department = "Department 5";
        break;
      case "DP6":
        department = "Department 6";
        break;
      default:
        res.status(404).send("Department not found");
    }

    const employees = await LogInCollection.find({
      department: department,
    });

    const employeeNames = employees.map((employee) => employee.name);

    const attendance = await Attendance.find({
      name: { $in: employeeNames },
    });
    if (attendance.length === 0) {
      req.session.message = {
        type: "danger",
        message: "There are no employees in this department",
      };
      res.redirect("/hrSettings");
      return;
    }



    res.render("HRIS/PRINT/hrprint", { attendance, department });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/closeDTR/:department", async (req, res) => {
  try {
    const department = req.params.department;

    const employeeDetails = await LogInCollection.find({
      department: department,
    });

    console.log("Found employees: ", employeeDetails);

    const employeeEmails = employeeDetails.map(employee => employee.email);

    const employees = await DaysPresent.find({
      email: { $in: employeeEmails }
    });

    console.log("Found Employee Records: ", employees);

    const moveDaysPresent = employees.map((employee) => {
      const docObject = employee.toObject();
      docObject.dateArchived = new Date();
      return docObject;
    });

    const moveDaysAbsent = employees.map((employee) => {
      const docObject = employee.toObject();
      docObject.dateArchived = new Date();
      return docObject;
    });

    const leaveapplications = await LeaveApplications.find({
      email: { $in: employeeEmails }
    });

    for (let leaveapplication of leaveapplications) {
      leaveapplication.dateArchived = new Date();
      leaveapplication.Status = "CLOSED";
      await leaveapplication.save();
    }

    await DaysPresentA.insertMany(moveDaysPresent);
    await DaysAbsentA.insertMany(moveDaysAbsent);
    await DaysPresent.deleteMany({ email: { $in: employeeDetails.map((employee) => employee.email) } });
    await DaysAbsent.deleteMany({ email: { $in: employeeDetails.map((employee) => employee.email) } });

    // Update Attendance record of employees
    const attendances = await Attendance.find({ email: { $in: employeeEmails } });

    for (let attendance of attendances) {
      attendance.allTimeRecord += attendance.hoursWorked;
      attendance.hoursWorked = 0;
      await attendance.save();
    }

    req.session.message = {
      type: "success",
      message: "DTR closed successfully",
    };

    res.redirect("/hrSettings");

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
})


router.get("/addacc", (req, res) => {
  res.render("addacc");
});

module.exports = router;
