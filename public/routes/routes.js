const express = require("express");
const router = express.Router();
const multer = require("multer");
const formidable = require("formidable");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const authController = require("../controllers/authController");
const bcrypt = require("bcrypt");
const { checkRoleHR } = require("../middleware/authMiddleware.js");
const { checkHRSettings, 
        calculateMonthlyVLPoints, 
        calculateMonthlySLPoints 
      } = require("../middleware/HRSettingsMiddleware");

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
const Departments = require("../models/departments");

// 201 File Models
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
const { log } = require("console");

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


// Login Page Routes
router.get("/login", authController.login_get);

router.get("/signup", authController.signup_get);

router.post("/login", authController.login_post);

router.post("/signup", authController.signup_post);

router.get("/logout", authController.logout_get);

// StartPage Updates
router.post("/pendingDTRCount", async (req, res) => {
  try {
    const pendingDTR = await DaysPresent.countDocuments({
      FFapproved: "PENDING"
    });

    const pendingLeave = await LeaveApplications.countDocuments({
      Status: "Pending"
    });

    const activeEmp = await Attendance.countDocuments({
      status: "IN"
    });

    const activeTasks = await SubmittedFiles.countDocuments({
      status: {
        $in: ["ASSIGNED", "REASSIGNED"]
      }
    });

    res.json({ pendingDTR, pendingLeave, activeEmp, activeTasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'mikuosuzuya@gmail.com',
    pass: 'uojo zrtz pjyy kohf',
  },
});

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

// Function to generate a random password
function generatePassword(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
}

// Reset Password
router.get("/reset-password/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const newPassword = generatePassword(8);
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log("New password:", newPassword);

    const account = await LogInCollection.findById(id);
    if (!account) {
      // Handle the case where the user's _id is not found
      res.status(404).send("User not found.");
      return; // Exit the function early
    }

    try {
      await LogInCollection.updateOne(
        { _id: id },
        { $set: { 
          password: hashedPassword,
          passwordReset: true  } }
      );
      console.log("Password updated successfully.");
    } catch (error) {
      console.error(error);

      req.session.message = {
        type: "danger",
        message: error.message,
      };
      return res.redirect("/view_emp_data/" + account.email);
    }

    const mailOptions = {
      from: 'mikuosuzuya@gmail.com',
      to: account.email,
      subject: 'HRDMD ACCOUNT PASSWORD RESET',
      html: `Your account password for the HRDMD App has been successfully reset.<br><br>
        Your new password is:<br>
        <strong>${newPassword}</strong><br><br>
        <strong style="color: red;">PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGGING IN.</strong>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        req.session.message = {
          type: "danger",
          message: "Password reset, but email failed to send.",
        };
        res.redirect("/view_emp_data/" + account.email);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    req.session.message = {
      type: "success",
      message: "Password reset successfully",
    };
    res.redirect("/view_emp_data/" + account.email);

  } catch (error) {
    console.error(error);
  }
})

router.post("/add_employee", upload, async (req, res) => {
  try {
    console.log(req.body);
    const newPassword = generatePassword(8);
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    console.log("Password:", newPassword);

    const data = {
      name: req.body.name,
      lastname: req.body.lastname,
      employeeID: req.body.employeeID,
      contact: req.body.contact,
      email: req.body.email,
      password: hashedPassword, // Use the hashed password here
      department: req.body.department,
      hrrole: req.body.hrrole,
      verified: true,
    };

    const mailOptions = {
      from: 'mikuosuzuya@gmail.com',
      to: data.email,
      subject: 'HRDMD ACCOUNT CREATED',
      html: `The HR Department Management System (HRDMD) has created an account for you.<br><br>
        Your password is:<br>
        <strong>${newPassword}</strong><br><br>
        <strong style="color: red;">PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGGING IN.</strong><br><br>
        Additional details will be asked after you log in.<br><br>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        req.session.message = {
          type: "danger",
          message: "User added, but email failed to send.",
        };
        res.redirect("/view_emp_data/" + account.email);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    const dayOff = req.body.dayOff; // Array of day off strings like ["Sunday", "Monday"]

    const adata = {
      name: req.body.name,
      email: req.body.email,
      dayOff: dayOff,
      VLPoints: req.body.vlPoints,
      SLPoints: req.body.slPoints,
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

    // Calculate Ratio
    let pendingCount = pendingFiles.length;
    let approvedCount = approvedFiles.length;
    let ratio = pendingCount > 0 ? (approvedCount / pendingCount).toFixed(2) : 0;

    // Calculate Exp
    const { exp, level } = logincollections;
    const requiredExp = 100 * level;
    const nextLevelExp = 100 * (level + 1);

    // Render the view_account template with the retrieved data
    res.render("view_account", {
      title: "View Account",
      logincollections: logincollections,
      ratio: ratio,
      exp: exp,
      level: level,
      requiredExp: requiredExp,
      nextLevelExp: nextLevelExp,
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

    const departments = await Departments.find({});

    // Render the edit_users template with the retrieved user data
    res.render("edit_users", {
      title: "Edit Account",
      logincollections: logincollections,
      attendance: attendance,
      departments: departments,
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

    // Update the user
    if (req.body.birthday) {
      const datePartOnly = req.body.birthday.split("T")[0];
      parsedBirthday = new Date(datePartOnly); // Assign a value if req.body.birthday exists
    } else {
      parsedBirthday = userLogin.birthday;
    }

    console.log(req.body);

    const addEmpToDept = await Departments.findOneAndUpdate(
      { deptAbbrev: req.body.department },
      { $push: { employees: userLogin.employeeID } },
      { new: true } // Return the modified document after update
    );

    if (!addEmpToDept) {
      return res.json({ message: "Department not found", type: "DANGER" });
    }
    
    const result = await LogInCollection.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        lastname: req.body.lastname,
        middleName: req.body.middleName,
        suffix: req.body.suffix,
        birthday: parsedBirthday,
        contact: req.body.contact,
        email: req.body.email,
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
router.post("/update-user/:id", async (req, res) => {
  const form = new formidable.IncomingForm({
    uploadDir: path.join(__dirname, './files/images'),
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5 MB file size limit
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.json({ message: err.message, type: "DANGER" });
    }

    let id = req.params.id;
    let new_image = "";

    if (files.image) {
      // Get the uploaded file name
      const file = files.image;
      new_image = `image_${Date.now()}_${file.originalFilename || file.newFilename}`;
      const newPath = path.join(form.uploadDir, new_image);

      // Move the file to the desired path
      fs.renameSync(file.filepath, newPath);

      // Delete old image if a new one is uploaded
      if (fields.old_image) {
        const oldImagePath = path.join(form.uploadDir, fields.old_image);
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }
    } else {
      // No new file uploaded, keep the old image
      new_image = fields.old_image;
    }

    try {
      // Generate a salt and hash the password
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(fields.password, salt);

      // Update user information in the database
      const result = await LogInCollection.findByIdAndUpdate(
        id,
        {
          name: fields.name,
          email: fields.email,
          password: hashedPassword,
          hrrole: fields.hrrole,
          image: new_image,
        },
        { new: true }
      );

      if (!result) {
        return res.json({ message: "User not found", type: "DANGER" });
      }

      req.session.message = {
        type: "SUCCESS",
        message: "User updated successfully",
      };
      res.json({ message: "User updated successfully", type: "SUCCESS" });
    } catch (err) {
      console.error(err);
      return res.json({ message: err.message, type: "DANGER" });
    }
  });
});

// Close a user account
router.post("/close-account/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const closedReason = req.body.closedReason;
    const logincollection = await LogInCollection.findById(id);

    if (!logincollection) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    const result = await LogInCollection.findByIdAndUpdate(
      id,
      { accountClosed: true,
        closedReason: closedReason,
        closeDate: Date.now(),
        reopenDate: null,
        reopenReason: "",
       },
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

// Reopen a user account
router.post("/reopen-account/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const reopenReason = req.body.reopenReason;
    const logincollection = await LogInCollection.findById(id);

    if (!logincollection) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    const result = await LogInCollection.findByIdAndUpdate(
      id,
      { accountClosed: false, 
        reopenReason: reopenReason,
        reopenDate: Date.now(),
      },
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

router.get("/startpage", async (req, res) => {
  const dateToday = new Date().toLocaleDateString().split("T")[0];

  // Count the number of active tasks
  const activeTasks = await SubmittedFiles.countDocuments();

  // Count currently clocked in employees
  const activeEmp = await Attendance.countDocuments({
    status: "IN"
  });

  // Count Pending DTR records
  const pendingDTR = await DaysPresent.countDocuments({
    FFapproved: "PENDING"
  });

  // Count Pending Leave Applications
  const pendingLeave = await LeaveApplications.countDocuments({
    status: "PENDING"
  });
  res.render("startpage", { dateToday, activeTasks, activeEmp, pendingDTR, pendingLeave });
});

router.get("/document_tracker/:hrrole", async (req, res) => {
  try {
    const hrrole = req.params.hrrole;

    // Based on the hrrole, render the appropriate template
    if (hrrole === "ADMIN" || hrrole === "ADMIN2") {
      res.redirect("/home");
    } else {
      res.redirect("/role1");
    }
  } catch (err) {
    console.log("Error loading pages: ", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/manage_account/:hrrole/:empID", async (req, res) => {
  try {
    const hrrole = req.params.hrrole;
    const empID = req.params.empID;

    // Based on the hrrole, render the appropriate template
    if (hrrole === "ADMIN") {
      res.redirect("/manage_accounts");
    } else {
      res.redirect(`/editacc/${encodeURIComponent(empID)}`);
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

    const logincollections = await LogInCollection.find({
      accountClosed: { $ne: true },})
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
    const perPage = 10; // Number of departments per page
    const page = parseInt(req.query.page) || 1; // Current page, default to 1

    const totalDepartments = await Departments.countDocuments(); // Total number of departments
    const allDepartments = await Departments.find()

    const paginatedDepartments = await Departments.find()
      .sort({ deptAbbrev: 1 }) // Sort A-Z
      .skip((page - 1) * perPage) // Skip records for previous pages
      .limit(perPage); // Limit results to `perPage`

    res.render("HRIS/view_employees", {
      totalDepartments,
      allDepartments,
      paginatedDepartments,
      currentPage: page,
      totalPages: Math.ceil(totalDepartments / perPage),
      perPage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/closed_accounts", async (req, res) => {
  try {
    const logincollections = await LogInCollection.find({
      accountClosed: true,
    });
    const departments = {
      allD: "active",
      HR: "inactive",
      DP1: "inactive",
      DP2: "inactive",
      DP3: "inactive",
      DP4: "inactive",
      DP5: "inactive",
      DP6: "inactive",
    };
    logincollections.sort((a, b) => a.verified - b.verified);
    res.render("HRIS/closed_accounts", { logincollections, departments });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
})

// Department Buttons Routes
router.get("/view_department/:department", async (req, res) => {
  const department = req.params.department;
  const logincollections = await LogInCollection.find();
  logincollections.sort((a, b) => a.verified - b.verified);

  try {
    const departments = {
      allD: "inactive",
      HR: "inactive",
      DP1: "inactive",
      DP2: "inactive",
      DP3: "inactive",
      DP4: "inactive",
      DP5: "inactive",
      DP6: "inactive",
    };

    // Set the active department
    if (departments.hasOwnProperty(department)) {
      departments[department] = "active";
    }

    res.render("HRIS/view_employees", { logincollections, departments });

  } catch (error) {
    req.session.message = {
      type: "warning",
      message: error.message,
    };
    res.redirect("/view_employees");
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

router.get("/download_leaveAttach/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../../files/leaveAttach/", filename);

  res.download(filePath, (err) => {
    if (err) {
      console.log(err);
    }
  });
});

router.get("/download_FFattach/:filename", async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../../files/employeedocument/fileDTR/", filename);

  res.download(filePath, (err) => {
    if (err) {
      console.log(err);
    }
  });
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
    const fromPage = req.params.fromPage;

    let email = req.params.email;
    let hrSettings = await req.models.HRSettings.findOne();
    let logincollections = await LogInCollection.findOne({ email: email });
    let attendance = await Attendance.findOne({ email: email });

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/hris");
    }

    const results = await findDocumentsByEmail(logincollections.email);

    const VLPoints = await calculateMonthlyVLPoints(logincollections.email, attendance.VLPoints);
    const SLPoints = await calculateMonthlySLPoints(logincollections.email, attendance.SLPoints);

    // Render the edit_users template with the retrieved user data
    res.render("HRIS/view_emp_data", {
      title: "View Account",
      logincollections: logincollections,
      hrSettings: hrSettings,
      attendance: attendance,
      results: results,
      VLPoints: VLPoints,
      SLPoints: SLPoints,
      fromPage: fromPage,
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
      // filter out closed accounts
      { $match: { accountClosed: false } },
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
          name: 1,
          lastname: 1,
          email: 1,
          department: 1,
          image: 1,
          attendanceData: 1,
        },
      },
    ]);

    const DTRApproval = await DaysPresent.find({ FFapproved: "PENDING" });

    res.render("HRIS/dtr", { mergedData, DTRApproval });
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

    const VLPoints = await calculateMonthlyVLPoints(logincollections.email, attendance.VLPoints);
    const SLPoints = await calculateMonthlySLPoints(logincollections.email, attendance.SLPoints);

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
      res.redirect("/view-dtr/" + logincollections.id);
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

    res.redirect("/view-dtr/" + logincollections.id);
  } catch (err) {
    console.log("Error marking as absent: ", err);
    res.status(500).send("aw bollucks!");
  }
});

router.get("/markAsAbsent/:id", async (req, res) => {
  try {
    const employeeID = req.params.id;
    const logincollections = await LogInCollection.findOne({ employeeID: employeeID });

    if (!logincollections) {
      req.session.message = {
        type: "danger",
        intro: "Error!",
        message: "User account not found.",
      }
      return res.redirect("/view-dtr/" + logincollections._id);
    }

    const attendance = await Attendance.findOne({ email: logincollections.email });

    if (!attendance) {
      req.session.message = {
        type: "danger",
        intro: "Error!",
        message: `Attendance record for ${logincollections.name} not found.`,
      }
      return res.redirect("/view-dtr/" + logincollections._id);
    }

    res.render("HRIS/markAbsent", { logincollections, attendance });
  } catch (err) {
    console.log("Error marking as absent: ", err);
    res.status(500).send("aw bollucks!");
  }
})

router.post("/markAbsent", async (req, res) => {
  try {
    // Access the data from the body
    const { startDate, endDate, employeeID, category, amount } = req.body;

    // Find login collection by employee ID
    const logincollections = await LogInCollection.findOne({
      employeeID: employeeID,
    });

    if (!logincollections) {
      return res.status(404).json({ message: "Employee not found." });
    }

    // Find attendance record for the employee
    const attendance = await Attendance.findOne({
      email: logincollections.email,
    });

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found." });
    }

    // Update the attendance record
    if (category === "VL") {
      attendance.availableVL -= amount;
      attendance.VLPoints -= amount;
    } else if (category === "SL") {
      attendance.availableSL -= amount;
      attendance.SLPoints -= amount;
    } else if (category === "SPL") {
      attendance.availableSPL -= amount;
    }

    // Parse the start and end dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if the start date is before or equal to the end date
    if (start > end) {
      return res.status(400).json({ message: "Start date must be before or equal to end date." });
    }

    // Create records for each day in the date range
    const daysAbsentRecords = [];
    let daysCount = 0;
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const dayAbsent = {
        name: logincollections.name + " " + logincollections.lastname,
        email: logincollections.email,
        date: new Date(date), // Add the current date to the record
      };
      daysAbsentRecords.push(dayAbsent);
      daysCount++;
    }

    // Save the updated attendance record
    attendance.daysAbsent += daysCount;
    await attendance.save();

    // Insert all the records in bulk
    await DaysAbsent.insertMany(daysAbsentRecords);

    // Send a success response back to the client
    res.status(200).json({ message: "Marked as absent successfully for all days in the range." });

  } catch (error) {
    // Handle error and send response
    console.error("Error marking absent:", error);
    res.status(500).json({ message: "An error occurred while marking absent." });
  }
});

// PRINT DTR PER DEPARTMENT
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

    const departments = await Departments.find({});

    res.render("HRIS/hrSettings", { hrSettings, departments });
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

router.get("/print-hr-dtr/:department/:month", async (req, res) => {
  try {
    const department = req.params.department;
    const month = req.params.month;

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
      return res.redirect("/hrSettings");
    }

    const currentYear = new Date().getFullYear();

    let employeeData = [];

    if (month !== "ALL") {
      employeeData = await Promise.all(
        employees.map(async (employee) => {
          const presentDays = await DaysPresent.find({
            email: employee.email,
            date: {
              $gte: new Date(`${currentYear}-${month}-01`),
              $lte: new Date(`${currentYear}-${month}-31`),
            },
          });

          const presentDaysA = await DaysPresentA.find({
            email: employee.email,
            date: {
              $gte: new Date(`${currentYear}-${month}-01`),
              $lte: new Date(`${currentYear}-${month}-31`),
            },
          });
  
          const absentDays = await DaysAbsent.find({
            email: employee.email,
            date: {
              $gte: new Date(`${currentYear}-${month}-01`),
              $lte: new Date(`${currentYear}-${month}-31`),
            },
          });

          const absentDaysA = await DaysAbsentA.find({
            email: employee.email,
            date: {
              $gte: new Date(`${currentYear}-${month}-01`),
              $lte: new Date(`${currentYear}-${month}-31`),
            },
          });

          const combinedPresentDays = [...presentDays, ...presentDaysA];
  
          const totalTime = combinedPresentDays.reduce((total, day) => {
            return total + day.totalTime;
          }, 0);

          const combinedAbsentDays = [...absentDays, ...absentDaysA];
  
          return ({
            name: employee.name,
            email: employee.email,
            presentDays: combinedPresentDays.length,
            totalTime: totalTime,
            absentDays: combinedAbsentDays.length,
          });
        })
      );
    } 

    const Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthName = Month[month - 1];

    res.render("HRIS/PRINT/hrprint", { attendance, department, employeeData, monthName, currentYear });
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

    const employeeEmails = employeeDetails.map(employee => employee.email);

    const employees = await DaysPresent.find({
      email: { $in: employeeEmails }
    });

    const moveDaysPresent = employees
      .filter(employee => employee.timeOut !== null)
      .map((employee) => {
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

    await DaysPresentA.bulkWrite(
      moveDaysPresent.map(doc => ({
        updateOne: {
          filter: { _id: doc._id }, // Match based on `_id`
          update: { $set: doc },
          upsert: true, // Insert if not found, update if it exists
        },
      }))
    );
    
    await DaysAbsentA.bulkWrite(
      moveDaysAbsent.map(doc => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc },
          upsert: true,
        },
      }))
    );
    
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

router.get("/DTRApproval", async (req, res) => {
  try {
    const dayspresent = await DaysPresent.find({ FFapproved: "PENDING" });
    const mergedRecords = await Promise.all(
      dayspresent.map(async (record) => {
        const employee = await LogInCollection.findOne({ email: record.email });
        return {
          ...record._doc, // Spread dayspresent record fields
          name: employee?.name, // Add employee's name (if found)
          lastname: employee?.lastname // Add employee's lastname (if found)
        };
      })
    );
    res.render("HRIS/DTRApproval", { dayspresent, mergedRecords });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
})

function calculateDeductionPoints(hoursLate, minutesLate) {
  // Calculate total lateness in minutes
  const totalMinutesLate = hoursLate * 60 + minutesLate;

  // Deduct points based on lateness rules
  let deductionPoints = 0;
  if (totalMinutesLate > 0 && totalMinutesLate <= 1) {
    deductionPoints = 0.002;
  } else if (totalMinutesLate > 1 && totalMinutesLate <= 2) {
    deductionPoints = 0.004;
  } else if (totalMinutesLate > 2 && totalMinutesLate <= 3) {
    deductionPoints = 0.006;
  } else if (totalMinutesLate > 3 && totalMinutesLate <= 4) {
    deductionPoints = 0.008;
  } else if (totalMinutesLate > 4 && totalMinutesLate <= 5) {
    deductionPoints = 0.010;
  } else if (totalMinutesLate > 5 && totalMinutesLate <= 6) {
    deductionPoints = 0.012;
  } else if (totalMinutesLate > 6 && totalMinutesLate <= 7) {
    deductionPoints = 0.015;
  } else if (totalMinutesLate > 7 && totalMinutesLate <= 8) {
    deductionPoints = 0.017;
  } else if (totalMinutesLate > 8 && totalMinutesLate <= 9) {
    deductionPoints = 0.019;
  } else if (totalMinutesLate > 9 && totalMinutesLate <= 10) {
    deductionPoints = 0.021;
  } else if (totalMinutesLate > 10 && totalMinutesLate <= 11) {
    deductionPoints = 0.023;
  } else if (totalMinutesLate > 11 && totalMinutesLate <= 12) {
    deductionPoints = 0.025;
  } else if (totalMinutesLate > 12 && totalMinutesLate <= 13) {
    deductionPoints = 0.027;
  } else if (totalMinutesLate > 13 && totalMinutesLate <= 14) {
    deductionPoints = 0.029;
  } else if (totalMinutesLate > 14 && totalMinutesLate <= 15) {
    deductionPoints = 0.031;
  } else if (totalMinutesLate > 15 && totalMinutesLate <= 16) {
    deductionPoints = 0.033;
  } else if (totalMinutesLate > 16 && totalMinutesLate <= 17) {
    deductionPoints = 0.035;
  } else if (totalMinutesLate > 17 && totalMinutesLate <= 18) {
    deductionPoints = 0.037;
  } else if (totalMinutesLate > 18 && totalMinutesLate <= 19) {
    deductionPoints = 0.040;
  } else if (totalMinutesLate > 19 && totalMinutesLate <= 20) {
    deductionPoints = 0.042;
  } else if (totalMinutesLate > 20 && totalMinutesLate <= 21) {
    deductionPoints = 0.044;
  } else if (totalMinutesLate > 21 && totalMinutesLate <= 22) {
    deductionPoints = 0.046;
  } else if (totalMinutesLate > 22 && totalMinutesLate <= 23) {
    deductionPoints = 0.048;
  } else if (totalMinutesLate > 23 && totalMinutesLate <= 24) {
    deductionPoints = 0.050;
  } else if (totalMinutesLate > 24 && totalMinutesLate <= 25) {
    deductionPoints = 0.052;
  } else if (totalMinutesLate > 25 && totalMinutesLate <= 26) {
    deductionPoints = 0.054;
  } else if (totalMinutesLate > 26 && totalMinutesLate <= 27) {
    deductionPoints = 0.056;
  } else if (totalMinutesLate > 27 && totalMinutesLate <= 28) {
    deductionPoints = 0.058;
  } else if (totalMinutesLate > 28 && totalMinutesLate <= 29) {
    deductionPoints = 0.060;
  } else if (totalMinutesLate > 29 && totalMinutesLate <= 30) {
    deductionPoints = 0.062;
  } else if (totalMinutesLate > 30 && totalMinutesLate <= 31) {
    deductionPoints = 0.065;
  } else if (totalMinutesLate > 31 && totalMinutesLate <= 32) {
    deductionPoints = 0.067;
  } else if (totalMinutesLate > 32 && totalMinutesLate <= 33) {
    deductionPoints = 0.069;
  } else if (totalMinutesLate > 33 && totalMinutesLate <= 34) {
    deductionPoints = 0.071;
  } else if (totalMinutesLate > 34 && totalMinutesLate <= 35) {
    deductionPoints = 0.073;
  } else if (totalMinutesLate > 35 && totalMinutesLate <= 36) {
    deductionPoints = 0.075;
  } else if (totalMinutesLate > 36 && totalMinutesLate <= 37) {
    deductionPoints = 0.077;
  } else if (totalMinutesLate > 37 && totalMinutesLate <= 38) {
    deductionPoints = 0.079;
  } else if (totalMinutesLate > 38 && totalMinutesLate <= 39) {
    deductionPoints = 0.081;
  } else if (totalMinutesLate > 39 && totalMinutesLate <= 40) {
    deductionPoints = 0.083;
  } else if (totalMinutesLate > 40 && totalMinutesLate <= 41) {
    deductionPoints = 0.085;
  } else if (totalMinutesLate > 41 && totalMinutesLate <= 42) {
    deductionPoints = 0.087;
  } else if (totalMinutesLate > 42 && totalMinutesLate <= 43) {
    deductionPoints = 0.090;
  } else if (totalMinutesLate > 43 && totalMinutesLate <= 44) {
    deductionPoints = 0.092;
  } else if (totalMinutesLate > 44 && totalMinutesLate <= 45) {
    deductionPoints = 0.094;
  } else if (totalMinutesLate > 45 && totalMinutesLate <= 46) {
    deductionPoints = 0.096;
  } else if (totalMinutesLate > 46 && totalMinutesLate <= 47) {
    deductionPoints = 0.098;
  } else if (totalMinutesLate > 47 && totalMinutesLate <= 48) {
    deductionPoints = 0.100;
  } else if (totalMinutesLate > 48 && totalMinutesLate <= 49) {
    deductionPoints = 0.102;
  } else if (totalMinutesLate > 49 && totalMinutesLate <= 50) {
    deductionPoints = 0.104;
  } else if (totalMinutesLate > 50 && totalMinutesLate <= 51) {
    deductionPoints = 0.106;
  } else if (totalMinutesLate > 51 && totalMinutesLate <= 52) {
    deductionPoints = 0.108;
  } else if (totalMinutesLate > 52 && totalMinutesLate <= 53) {
    deductionPoints = 0.110;
  } else if (totalMinutesLate > 53 && totalMinutesLate <= 54) {
    deductionPoints = 0.112;
  } else if (totalMinutesLate > 54 && totalMinutesLate <= 55) {
    deductionPoints = 0.115;
  } else if (totalMinutesLate > 55 && totalMinutesLate <= 56) {
    deductionPoints = 0.117;
  } else if (totalMinutesLate > 56 && totalMinutesLate <= 57) {
    deductionPoints = 0.119;
  } else if (totalMinutesLate > 57 && totalMinutesLate <= 58) {
    deductionPoints = 0.121;
  } else if (totalMinutesLate > 58 && totalMinutesLate <= 59) {
    deductionPoints = 0.123;
  } else if (totalMinutesLate > 59 && totalMinutesLate <= 60) {
    deductionPoints = 0.125;
  } else {
    deductionPoints = 0.250;
  }
  return deductionPoints;
}

router.post("/DTRApprove", async (req, res) => {
  const { id, email, approval, reason, overtime } = req.body;

  console.log(id, email, approval, reason, overtime);
  try {
    const overtimeDecimal = parseFloat(overtime);

    // Validate the overtime input
    if (overtimeDecimal === null) {
      overtimeDecimal = 0;
    }
    
    if (isNaN(overtimeDecimal) || overtimeDecimal < 0) {
      // Handle invalid overtime input (optional)
      req.session.message = {
        type: "danger",
        message: "Invalid overtime input.",
      };
      return res.redirect("/DTRApproval");
    }
    
    const attendance = await Attendance.findOne({ email: email });
    const dayspresent = await DaysPresent.findOne({ _id: id });
    if (!dayspresent) {
      return res.status(404).send("Days present record not found");
    }

    if (!attendance) {
      return res.status(404).send("Attendance record not found");
    }  

    if (approval === "approve") {
      dayspresent.FFapproved = "APPROVED";
      dayspresent.forFile = false;
      dayspresent.FFreason = reason;
      dayspresent.overTime = overtimeDecimal;
      await dayspresent.save();

      // Calculate late points deduction
      const hoursLate = dayspresent.timeLate.split(":")[0];
      const minutesLate = dayspresent.timeLate.split(":")[1];
      const deductionPoints = calculateDeductionPoints(hoursLate, minutesLate);

      // Update Attendance record
      attendance.VLPoints -= deductionPoints;
      await attendance.save();
    } else if (approval === "disapprove") {
      dayspresent.FFapproved = "DISAPPROVED";
      dayspresent.FFreason = reason;
      await dayspresent.save();
    }

    req.session.message = {
      type: "light",
      message: "DTR Record Acknowledged",
    };

    res.redirect("/DTRApproval");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/addDepartment", async (req, res) => {
  try {
    const deptAbbrev = req.body.abbreviation;
    const newDepartment = req.body.department;

    // Validate inputs
    if (!newDepartment) {
      return res.json({ error: "Department name is required." });
    }
    if (newDepartment.length > 100) {
      return res.json({ error: "Department name should be less than 100 characters." });
    }
    if (newDepartment.length < 10) {
      return res.json({ error: "Department name should be at least 10 characters." });
    }

    if (!deptAbbrev) {
      return res.json({ error: "Department abbreviation is required." });
    }
    if (deptAbbrev.length > 20) {
      return res.json({ error: "Department abbreviation should be less than 20 characters." });
    }
    if (deptAbbrev.length < 2) {
      return res.json({ error: "Department abbreviation should be at least 2 characters." });
    }

    // Check if the department already exists
    const existingDepartment = await Departments.findOne({
      deptName: newDepartment,
    });

    const existingAbbreviation = await Departments.findOne({
      deptAbbrev: deptAbbrev,
    });

    if (existingAbbreviation) {
      return res.json({ error: "Department abbreviation already exists." });
    }

    if (existingDepartment) {
      return res.json({ error: "Department already exists." });
    }

    // Create and save new department
    const department = new Departments({
      deptName: newDepartment,
      deptAbbrev: deptAbbrev,
    });

    await department.save();

    res.json({ success: true, message: "Department added successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/view-department/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const department = await Departments.findById(id);

    if (!department) {
      return res.status(404).send("Department not found");
    }

    const employees = await LogInCollection.find({
      department: department.deptAbbrev,
    });

    res.render("HRIS/viewDepartment", { department, employees });

  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// View All Employees
router.get("/all_employees", async (req, res) => {
  try {
    const perPage = 15; // Number of departments per page
    const page = parseInt(req.query.page) || 1; // Current page, default to 1

    const totalEmployees = await LogInCollection.countDocuments(); // Total number of employees
    const employees = await LogInCollection.find()

    const paginatedEmployees = await LogInCollection.find()
      .sort({ name: 1 })
      .skip((page - 1) * perPage) // Skip records for previous pages
      .limit(perPage); // Limit results to `perPage`

    res.render("HRIS/allEmployees", { 
      employees,
      currentPage: page,
      paginatedEmployees,
      totalEmployees,
      totalPages: Math.ceil(totalEmployees / perPage),
      perPage
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
})

router.get("/addacc", (req, res) => {
  res.render("addacc");
});

module.exports = router;
