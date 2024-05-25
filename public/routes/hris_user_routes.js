const router = require("./routes");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");
const Attendance = require("../models/attendance");
const DaysPresent = require("../models/dayspresent");
const DaysAbsent = require("../models/daysabsent");

// Multer Config
const EmployeeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/employeedocument");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const employeeUpload = multer({ storage: EmployeeStorage });

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
    // Data validation (ensure robust validation for input fields)

    const data = {
      name: req.body.name,
      email: req.body.email,
      Type: req.body.Type.toLowerCase(), // Changed to lowercase for naming convention
      StartDate: new Date(req.body.StartDate), // Convert to Date object
      EndDate: new Date(req.body.EndDate), // Convert to Date object
      ...req.body,
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

    const availableSL = parseInt(account.availableSL, 10) || 0;
    const availableVL = parseInt(account.availableVL, 10) || 0;

    // Check if there's sufficient leave balance
    if (data.Type === "sick leave" && availableSL < daysDiff) {
      req.session.message = {
        type: "danger",
        message: "You used up all your sick leave.",
      };
      res.redirect("/apply_leave");
    } else if (data.Type === "vacation leave" && availableVL < daysDiff) {
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
    if (data.Type === "sick leave") {
      account.availableSL -= daysDiff;
    } else if (data.Type === "vacation leave") {
      account.availableVL -= daysDiff;
    }

    // Save the updated account
    await account.save();

    // Set success message in session
    req.session.message = {
      type: "success",
      message: "Leave application submitted successfully!",
    };

    res.redirect("/view_leave/" + data.email); // Redirect to a different page after successful submission
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

router.get("/view-201/:type/:email" , async (req, res) => {
  try {
    const type = req.params.type;
    const email = req.params.email;

    switch (type) {
      case "appPaper":
        res.redirect("/appPaper/" + email);
        break;
      case "pds":
        res.redirect("/pds/" + email);
        break;
      case "certERL":
        res.redirect("/certERL/" + email);
        break;
      case "oathOfOffice":
        res.redirect("/oathO/" + email);
        break;
      case "certATD":
        res.redirect("/certATD/" + email);
        break;
      case "certBL":
        res.redirect("/certBL/" + email);
        break;
      case "posDF":
        res.redirect("/posDF/" + email);
        break;
      case "medCert":
        res.redirect("/medCert/" + email);
        break;
      default:
        res.status(400).send("Invalid request parameter");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/appPaper/:email" , async (req, res) => {
  try {
    const email = req.params.email;
    const appPaper = await AppPaper.findOne({email: email});

    if (!appPaper) {
      await AppPaper.create({
        email: email,
      })
    };

    res.render("HRIS/appPaper", {appPaper});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
})

router.post("/submit_paper", employeeUpload.fields([
  { name: 'origFile', maxCount: 1 },
  { name: 'reappointFile', maxCount: 1 },
  { name: 'reemployFile', maxCount: 1 },
  { name: 'promFile', maxCount: 1 },
  { name: 'transferFile', maxCount: 1 },
  { name: 'transPromFile', maxCount: 1 }
]), async (req, res) => {
  console.log(req.body);
  try {
      const email = req.body.email;
      const files = req.files;

      const existingData = await AppPaper.findOne({ email: email });

      const updateData = {};

      if (files.origFile) {
        if (existingData.origFile && existingData.origFile !== files.origFile[0].path) {
            // Delete old file
            fs.unlinkSync(existingData.origFile);
        }
        updateData['origFile'] = files.origFile[0].path;
      }
      if (files.reappointFile) {
          if (existingData.reappointFile && existingData.reappointFile !== files.reappointFile[0].path) {
              // Delete old file
              fs.unlinkSync(existingData.reappointFile);
          }
          updateData['reappointFile'] = files.reappointFile[0].path;
      }
      if (files.reemployFile) {
          if (existingData.reemployFile && existingData.reemployFile !== files.reemployFile[0].path) {
              // Delete old file
              fs.unlinkSync(existingData.reemployFile);
          }
          updateData['reemployFile'] = files.reemployFile[0].path;
      }
      if (files.promFile) {
          if (existingData.promFile && existingData.promFile !== files.promFile[0].path) {
              // Delete old file
              fs.unlinkSync(existingData.promFile);
          }
          updateData['promFile'] = files.promFile[0].path;
      }
      if (files.transferFile) {
          if (existingData.transferFile && existingData.transferFile !== files.transferFile[0].path) {
              // Delete old file
              fs.unlinkSync(existingData.transferFile);
          }
          updateData['transferFile'] = files.transferFile[0].path;
      }
      if (files.transPromFile) {
          if (existingData.transPromFile && existingData.transPromFile !== files.transPromFile[0].path) {
              // Delete old file
              fs.unlinkSync(existingData.transPromFile);
          }
          updateData['transPromFile'] = files.transPromFile[0].path;
      }

      if (req.body.orig && req.body.orig !== existingData.orig) {
        updateData['orig'] = req.body.orig;
      }
      if (req.body.reappoint && req.body.reappoint !== existingData.reappoint) {
        updateData['reappoint'] = req.body.reappoint;
      }
      if (req.body.reemploy && req.body.reemploy !== existingData.reemploy) {
        updateData['reemploy'] = req.body.reemploy;
      }
      if (req.body.prom && req.body.prom !== existingData.prom) {
        updateData['prom'] = req.body.prom;
      }
      if (req.body.transfer && req.body.transfer !== existingData.transfer) {
        updateData['transfer'] = req.body.transfer;
      }
      if (req.body.transProm && req.body.transProm !== existingData.transProm) {
        updateData['transProm'] = req.body.transProm;
      }

      if (!existingData) {
        // No existing record, create a new one
        await AppPaper.create({
          email: email,
          name: req.body.name,
          ...updateData,
        });
      } else {
        // Update existing record
        await AppPaper.findOneAndUpdate(
          { email: email }, // filter
          { $set: updateData }, // update data
          { new: true } // options
        );
      }
      
      req.session.message = {
          type: "success",
          message: "Paper submitted successfully",
      };
      res.redirect("/appPaper/" + email);
  } catch (err) {
      console.error(err);
      req.session.message = {
          type: "danger",
          message: "Error submitting paper",
      };
      res.redirect("/hris");
  }
});

router.get("/pds/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const pds = await PDS.findOne({email: email});
    const pageName = "Personal Data Sheet";
    res.render("HRIS/201S", {pds, pageName});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.post("/pds-submit/:email", employeeUpload.single("files"), async (req, res) => {
  try {
    const email = req.params.email;
    const file = req.file;

    // Validate the email and file
    if (!email || !file) {
      throw new Error('Email or file is missing');
    }

    const filename = path.basename(file.path);

    const existingData = await PDS.findOne({ email: email });
    if (existingData && existingData.files) {
      const oldFilePath = path.join(__dirname, "../../files/employeedocument", existingData.files);
      fs.unlink(oldFilePath, (unlinkErr) => { // Use fs.unlink with a callback
        if (unlinkErr) {
          console.error(`Error deleting old file: ${unlinkErr}`);
          throw new Error('Error deleting old file');
        }
      });
    }

    const updateData = {
      files: filename,
      fileYear: req.body.fileYear,
    };

    await PDS.findOneAndUpdate(
      { email: email }, // filter
      { $set: updateData }, // update data
      { upsert: true, new: true, setDefaultsOnInsert: true } // options
    );

    req.session.message = {
      type: "success",
      message: "Personal Data Sheet submitted successfully",
    };
    res.redirect(`/pds/${email}`);
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error submitting PDS",
    };
    res.redirect("/hris");
  }
});

router.get("/certERL/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const certERL = await CertERL.findOne({email: email});

    if (!certERL) {
      await CertERL.create({
        email: email,
      })
    }; 

    res.render("HRIS/certERL", {certERL});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.post("/certERL-submit", employeeUpload.fields([
  { name: 'CSC', maxCount: 1 },
  { name: 'NPC', maxCount: 1 },
  { name: 'CESB', maxCount: 1 },
  { name: 'PRC', maxCount: 1 },
  { name: 'SC', maxCount: 1 },
]), async (req, res) => {
  console.log(req.body);

  try {
    const email = req.body.email;
    const files = req.files;

    const updateData = {};

    let existingData = await CertERL.findOne({ email: email });

    if (files.CSC) {
      if (existingData && existingData.CSC && existingData.CSC !== files.CSC[0].path) {
        fs.unlinkSync(existingData.CSC);
      }
      updateData['CSC'] = files.CSC[0].path;
    }
    if (files.NPC) {
      if (existingData && existingData.NPC && existingData.NPC !== files.NPC[0].path) {
        fs.unlinkSync(existingData.NPC);
      }
      updateData['NPC'] = files.NPC[0].path;
    }
    if (files.CESB) {
      if (existingData && existingData.CESB && existingData.CESB !== files.CESB[0].path) {
        fs.unlinkSync(existingData.CESB);
      }
      updateData['CESB'] = files.CESB[0].path;
    }
    if (files.PRC) {
      if (existingData && existingData.PRC && existingData.PRC !== files.PRC[0].path) {
        fs.unlinkSync(existingData.PRC);
      }
      updateData['PRC'] = files.PRC[0].path;
    }
    if (files.SC) {
      if (existingData && existingData.SC && existingData.SC !== files.SC[0].path) {
        fs.unlinkSync(existingData.SC);
      }
      updateData['SC'] = files.SC[0].path;
    }

    if (req.body.CSCYear && req.body.CSCYear !== existingData.CSCYear) {
      updateData['CSCYear'] = req.body.CSCYear;
    }
    if (req.body.NPCYear && req.body.NPCYear !== existingData.NPCYear) {
      updateData['NPCYear'] = req.body.NPCYear;
    }
    if (req.body.CESBYear && req.body.CESBYear !== existingData.CESBYear) {
      updateData['CESBYear'] = req.body.CESBYear;
    }
    if (req.body.PRCYear && req.body.PRCYear !== existingData.PRCYear) {
      updateData['PRCYear'] = req.body.PRCYear;
    }
    if (req.body.SCYear && req.body.SCYear !== existingData.SCYear) {
      updateData['SCYear'] = req.body.SCYear;
    }

    if (!existingData) {
      // No existing record, create a new one
      await CertERL.create({
        email: email,
        name: req.body.name,
        ...updateData,
      });
    } else {
      // Update existing record
      await CertERL.findOneAndUpdate(
        { email: email }, // filter
        { $set: updateData }, // update data
        { new: true } // options
      );
    }

    req.session.message = {
      type: "success",
      message: "Paper submitted successfully",
    };
    res.redirect("/certERL/" + email);
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error submitting paper",
    };
    res.redirect("/hris");
  }
});

router.get("/oathO/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await OathO.find({email: email});
    const pageName = "Oath of Office";
    const docuType = "oathO";
    res.render("HRIS/201Single", {fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/certATD/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await CertATD.find({email: email});
    const pageName = "Certificate of Attendance";
    const docuType = "certATD";
    res.render("HRIS/201Single", {fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/certBL/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await CertBL.find({email: email});
    const pageName = "Certificate of Budgetary Limitation";
    const docuType = "certBL";
    res.render("HRIS/201Single", {fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/posDF/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await PosDF.find({email: email});
    const pageName = "Position Description Form";
    const docuType = "posDF";
    res.render("HRIS/201Single", {fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/medCert/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await MedCert.find({email: email});
    const pageName = "Medical Certificate";
    const docuType = "medCert";
    res.render("HRIS/201Single", {fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.post("/file-submit", employeeUpload.single("files"), async (req, res) => {
  try {
    const email = req.body.email;
    const docuType = req.body.docuType;
    const file = req.file;

    if (docuType === "oathO") {
      const oatho = await OathO.findOne({
        email: email,
        files: file.originalname
      });
      if (oatho) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/oathO/" + email);
        return;
      };
      const filename = path.basename(file.path);
      const data = {
        name: req.body.name,
        email: email,
        files: filename,
        fileYear: req.body.fileYear,
        dateSubmitted: new Date(),
      };
      await OathO.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/oathO/" + email);
    } else if (docuType === "certATD") {
      const certATD = await CertATD.findOne({
        email: email,
        files: file.originalname
      });
      if (certATD) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/certATD/" + email);
        return;
      };
      const filename = path.basename(file.path);
      const data = {
        name: req.body.name,
        email: email,
        files: filename,
        fileYear: req.body.fileYear,
        dateSubmitted: new Date(),
      };
      await CertATD.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/certATD/" + email);
    } else if (docuType === "certBL") {
      const certBL = await CertBL.findOne({
        email: email,
        files: file.originalname
      });
      if (certBL) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/certBL/" + email);
        return;
      };
      const filename = path.basename(file.path);
      const data = {
        name: req.body.name,
        email: email,
        files: filename,
        fileYear: req.body.fileYear,
        dateSubmitted: new Date(),
      };
      await CertBL.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/certBL/" + email);
    } else if (docuType === "posDF") {
      const posDF = await PosDF.findOne({
        email: email,
        files: file.originalname
      });
      if (posDF) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/posDF/" + email);
        return;
      };
      const filename = path.basename(file.path);
      const data = {
        name: req.body.name,
        email: email,
        files: filename,
        fileYear: req.body.fileYear,
        dateSubmitted: new Date(),
      };
      await PosDF.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/posDF/" + email);
    } else if (docuType === "medCert") {
      const medCert = await MedCert.findOne({
        email: email,
        files: file.originalname
      });
      if (medCert) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/medCert/" + email);
        return;
      };
      const filename = path.basename(file.path);
      const data = {
        name: req.body.name,
        email: email,
        files: filename,
        fileYear: req.body.fileYear,
        dateSubmitted: new Date(),
      };
      await MedCert.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/medCert/" + email);
    }

  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.post("/delete-201/:docuType/:fileName/:email", async (req, res) => {
  try {
    const docuType = req.params.docuType;
    const fileName = req.params.fileName;
    const email = req.params.email;
    const filePath = path.join(__dirname, "../../files/employeedocument", fileName);

    if (docuType === "oathO") {
    const result = await OathO.deleteOne({ email: email, files: fileName });
    if (result.deletedCount === 0) {
      req.session.message = {
        type: "danger",
        message: "No document found to delete",
      };
      return res.redirect("/oathO/" + email);
    }
    fs.unlinkSync(filePath);
    req.session.message = {
      type: "danger",
      message: "File deleted successfully",
    };
    res.redirect("/oathO/" + email);
    } else if (docuType === "certATD") {
      const result = await CertATD.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/certATD/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      }; 
      res.redirect("/certATD/" + email);
    } else if (docuType === "certBL") {
      const result = await CertBL.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/certBL/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/certBL/" + email);
    } else if (docuType === "posDF") {
      const result = await PosDF.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/posDF/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/posDF/" + email);
    } else if (docuType === "medCert") {
      const result = await MedCert.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/medCert/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/medCert/" + email);
    }

  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error deleting file",
    };
    res.redirect("/hris");
  }
})

router.get("/download-201/:fileName", async (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "../../files/employeedocument", fileName);
  res.download(filePath, (err) => {
    if (err) {
      console.error(`Error downloading file ${fileName}: ${err}`);
      req.session.message = {
        type: "danger",
        message: "Error downloading file",
      };
      res.redirect("/hris");
      return;
    }
  });
})

module.exports = router;
