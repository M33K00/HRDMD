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
const { checkHRSettings } = require("../middleware/HRSettingsMiddleware");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");
const Attendance = require("../models/attendance");
const DaysPresent = require("../models/dayspresent");
const DaysAbsent = require("../models/daysabsent");
const daysAbsent = require("../models/daysabsent");
const HRSettings = require("../models/hrsettings");

// 201 File Models
const UserDocuments = require("../models/userdocuments");
const AppPaper = require("../models/201File/appPaper");
const CertERL = require("../models/201File/certERL");
const CertATD = require("../models/201File/certATD");
const CertBL = require("../models/201File/certBL");
const MedCert = require("../models/201File/medCert");
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
const oathO = require("../models/201File/oathO");

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
  Clearances,
  Commendations,
  CopyReso,
  Cos,
  OfficeOrder,
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

    const isDayOff = (date) => {
      const day = date.toLocaleString("en-US", { weekday: "long" });
      return dayOff.includes(day);
    };

    // Calculate the next cutoff date based on pay schedule
    const calculateNextCutoffDate = (initialDate, workingDaysRequired) => {
      let date = new Date(initialDate);
      let workingDaysCount = 0;

      while (workingDaysCount < workingDaysRequired) {
        date.setDate(date.getDate() + 1); // Move to the next day
        if (!isDayOff(date)) {
          workingDaysCount++; // Increment the working days count only if it's not a day off
        }
      }
      return date;
    };

    let nextCutoffDate;
    const cutoffDate = new Date(req.body.cutoffDate); // Assuming cutoffDate comes from req.body
    if (req.body.paySched === "Bi-Weekly") {
      nextCutoffDate = calculateNextCutoffDate(cutoffDate, 15);
    } else if (req.body.paySched === "Monthly") {
      nextCutoffDate = calculateNextCutoffDate(cutoffDate, 31);
    } else if (req.body.paySched === "Weekly") {
      nextCutoffDate = calculateNextCutoffDate(cutoffDate, 7);
    }

    const adata = {
      name: req.body.name,
      paySched: req.body.paySched,
      dayOff: dayOff,
      cutoffDate: cutoffDate,
      nextCutoffDate: nextCutoffDate,
    };

    // Insert data into the LogInCollection
    await LogInCollection.insertMany([data]);

    // Update the user's document with the new data from adata
    await Attendance.updateOne(
      { email: req.body.email }, // Find the document to update
      { $set: adata }, // Set the new data
      { new: true, upsert: true } // Ensure document is created if it doesn't exist
    );

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

    let name = logincollections.name;

    const attendance = await Attendance.findOne({ name: name });

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

    // Calculate Next Cutoff Date// Parse inputs from request body
    let nextCutoffDate;

    if (req.body.paySched) {
      // Parse inputs from request body
      const cutoffDate = new Date(req.body.cutoffDate);
      const dayOff = req.body.dayOff; // Array of day off strings like ["Sunday", "Monday"]

      // Function to check if a date is a day off
      const isDayOff = (date) => {
        const day = date.toLocaleString("en-US", { weekday: "long" });
        return dayOff.includes(day);
      };

      // Calculate the next cutoff date based on pay schedule
      const calculateNextCutoffDate = (initialDate, workingDaysRequired) => {
        let date = new Date(initialDate);
        let workingDaysCount = 0;

        while (workingDaysCount < workingDaysRequired) {
          date.setDate(date.getDate() + 1); // Move to the next day
          if (!isDayOff(date)) {
            workingDaysCount++; // Increment the working days count only if it's not a day off
          }
        }
        return date;
      };

      if (req.body.paySched === "Bi-Weekly") {
        nextCutoffDate = calculateNextCutoffDate(cutoffDate, 15);
      } else if (req.body.paySched === "Monthly") {
        nextCutoffDate = calculateNextCutoffDate(cutoffDate, 31);
      } else if (req.body.paySched === "Weekly") {
        nextCutoffDate = calculateNextCutoffDate(cutoffDate, 7);
      }
      // Create the adata object
      const adata = {
        paySched: req.body.paySched,
        dayOff: dayOffArray,
        cutoffDate: req.body.cutoffDate,
        nextCutoffDate: nextCutoffDate,
      };

      // Update the user's document with the new data from adata
      const updateAttendance = await Attendance.findOneAndUpdate(
        { email: userLogin.email }, // Find the document to update
        { $set: adata }, // Set the new data
        { new: true } // Return the updated document
      );

      if (!updateAttendance) {
        throw new Error("Attendance document not found");
      }

      console.log("adata object:", adata); // Log the adata object
    } else {
      console.log("No pay schedule provided in request.");
    }

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
        birthday: parsedBirthday,
        contact: req.body.contact,
        email: req.body.email,
        password: hashedPassword, // Use the hashed password here
        department: req.body.department,
        position: req.body.position,
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
    if (userLogin.hrrole === "ROLE 1") {
      return res.redirect("/view/" + userLogin._id);
    } else {
      return res.redirect("/manage_accounts");
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

router.get("/startpage", (req, res) => {
  res.render("startpage");
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

// HRIS Routes

router.get("/hris", checkRoleHR, async (req, res) => {
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

router.get("/view_emp_data/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/hris");
    }

    const results = await findDocumentsByEmail(logincollections.email);

    // Render the edit_users template with the retrieved user data
    res.render("HRIS/view_emp_data", {
      title: "View Account",
      logincollections: logincollections,
      results: results,
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

    res.render("HRIS/view-dtr", {
      title: "View Account",
      logincollections: logincollections,
      attendance: attendance,
      dayspresent: dayspresent,
      daysabsent: daysabsent,
      leaveapplications: leaveapplications,
      status: status,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
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
    const hrSettings = await req.models.HRSettings.findOne();
    if (!hrSettings) {
      console.log("No HR settings found.");
      // Handle the case where no settings are found, such as setting default values.
      // Example:
      // const defaultSettings = { startDate: 1, endDate: 31 };
      // res.render("HRIS/hrSettings", { hrSettings: defaultSettings });
      res.status(404).send("HR settings not found.");
      return;
    }
    res.render("HRIS/hrSettings", { hrSettings });
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
    }

    // Save the settings (either new or updated)
    await existingSettings.save();

    req.session.message = {
      type: "success",
      message: "HR settings updated successfully",
    };

    res.redirect("/hrSettings"); // Redirect to the settings page or another page as needed
  } catch (err) {
    console.error("Error updating/creating HR settings:", err);
    res.status(500).send("Internal Server Error");
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


router.get("/addacc", (req, res) => {
  res.render("addacc");
});

module.exports = router;
