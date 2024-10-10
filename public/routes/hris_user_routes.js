const router = require("./routes");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { checkHRSettings } = require("../middleware/HRSettingsMiddleware");

// Models
const LogInCollection = require("../models/logincollections");
const LeaveApplications = require("../models/leaveapplications");
const Attendance = require("../models/attendance");
const DaysPresent = require("../models/dayspresent");
const DaysAbsent = require("../models/daysabsent");
const DaysAbsentA = require("../models/daysabsentA");
const DaysPresentA = require("../models/dayspresentA");



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
const logincollections = require("../models/logincollections");
const attendance = require("../models/attendance");

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

// Function to count arrays with null values
function countArraysWithNull(arr) {
  let arrayWithNullCount = 0;

  function traverse(array) {
    let hasNull = false;
    
    array.forEach(item => {
      if (item === null) {
        hasNull = true;
      } else if (Array.isArray(item)) {
        if (traverse(item)) {
          hasNull = true;
        }
      }
    });

    if (hasNull) {
      arrayWithNullCount++;
    }
    return hasNull;
  }

  traverse(arr);
  return arrayWithNullCount;
}

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

// Routes
router.get("/view_profile/:email", async (req, res) => {
  try {
    let email = req.params.email;

    let logincollections = await LogInCollection.findOne({
      email: email,
    });

    if (!logincollections) {
      req.session.message = {
        type: "danger",
        intro: "Error!",
        message: "User account not found.",
      }
      return res.redirect("/hris");
    }

    let attendance = await Attendance.findOne({
      email: email,
    });

    if (!attendance) {
      req.session.message = {
        type: "danger",
        intro: "Error!",
        message: "User attendance data not found.",
      }
      return res.redirect("/hris");
    }

    const results = await findDocumentsByEmail(email);
    const unsubmitted = countArraysWithNull(results);
    const VLPoints = await calculateCurrentVLPoints(logincollections.email);
    const SLPoints = await calculateCurrentSLPoints(logincollections.email);

    res.render("HRISUSER/view_profile", {
      title: "View Account",
      logincollections: logincollections,
      attendance: attendance,
      VLPoints: VLPoints,
      SLPoints: SLPoints,
      results: results,
      unsubmitted: unsubmitted,
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

router.get("/apply_leave/:email", async (req, res) => {
  const userEmail = req.params.email;
  const attendance = await Attendance.findOne({ email: userEmail });
  res.render("HRISUSER/apply_leave", { attendance });
});

router.get("/view_leave/:email", async (req, res) => {
  try {
    const userEmail = req.params.email; // Retrieve email from URL parameter

    const leaveapplications = await LeaveApplications.find({
      email: userEmail,
    });

    const attendance = await Attendance.findOne({ 
      email: userEmail 
    });

    res.render("HRISUSER/view_leave", { leaveapplications, attendance });
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

    // Get account by email
    const account = await Attendance.findOne({ email: data.email });
    
    // Check if account exists
    if (!account) {
      throw new Error("Account not found.");
    }

    const availableSL = parseInt(account.availableSL, 10) || 0;
    const availableVL = parseInt(account.availableVL, 10) || 0;
    const availableSPL = parseInt(account.availableSPL, 3) || 0;

    // Check if there's sufficient leave balance
    if (data.Type === "Sick Leave" && availableSL <= 0) {
      req.session.message = {
        type: "danger",
        message: "You used up all your sick leave.",
      };
      res.redirect("/apply_leave/" + data.email);
    } else if (data.Type === "Vacation Leave" && availableVL <= 0) {
      req.session.message = {
        type: "danger",
        message: "You used up all your vacation leave.",
      };
      res.redirect("/apply_leave/" + data.email);
      return;
    } else if (data.Type === "Special Privilege Leave" && availableSPL <= 0) {
      req.session.message = {
        type: "danger",
        message: "You used up all your Special Privilege Leave.",
      };
      res.redirect("/apply_leave/" + data.email);
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
    res.redirect("/apply_leave/" + data.email);
  }
});

router.get("/HRFiles", async (req, res) => {
  res.render("HRISUSER/HRFiles");
});

router.get("/dtr_user/:id", checkHRSettings, async (req, res) => {
  try {
    let id = req.params.id;
    let hrSettings = await req.models.HRSettings.findOne();

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

    let timeStatus;

    if (attendance.status === "IN") {
      const currentDate = new Date();
    
      // Convert both dates to a consistent format (e.g., just the date portion) for comparison
      const attendanceDate = attendance.timeIn ? attendance.timeIn.toDateString() : null;
      const formattedCurrentDate = currentDate.toDateString();
    
      if (attendanceDate !== formattedCurrentDate) {
        await DaysPresent.findOneAndDelete({
          email: email,
          timeOut: null,
        });
    
        // Update attendance record
        attendance.status = "OUT";
        attendance.timeOut = null;
        attendance.timeIn = null;
        await attendance.save();
        timeStatus = "WARNING";
      } else {
        timeStatus = "CLEAR";
      }
    } else {
      timeStatus = "N/A"; // You can set a default value if attendance.status is not "IN"
    }

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

    let leaveapplications = await LeaveApplications.find({
      email: email,
      Status: "Approved",
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
      date: new Date(new Date().setHours(0, 0, 0, 0)),
    });

    let presentStatus = await DaysPresent.findOne({
      email: email,
      date: new Date(new Date().setHours(0, 0, 0, 0)),
    });

    let pStatus;

    if (presentStatus) {
      pStatus = "Present";
    } else {
      pStatus = "Absent";
    }

    let status;

    if (absentStatus) {
      status = "Absent";
    } else {
      status = "Present";
    }

    const VLPoints = await calculateCurrentVLPoints(logincollections.email);
    const SLPoints = await calculateCurrentSLPoints(logincollections.email);


    res.render("HRISUSER/dtr_user", {
      title: "View Account",
      hrSettings: hrSettings,
      logincollections: logincollections,
      attendance: attendance,
      dayspresent: dayspresent,
      daysabsent: daysabsent,
      leaveapplications: leaveapplications,
      dayspresentA: dayspresentA,
      daysabsentA: daysabsentA,
      leaveA: leaveA,
      totalHours: totalHours,
      totalMinutes: totalMinutes,
      status: status,
      pStatus: pStatus,
      VLPoints: VLPoints,
      SLPoints: SLPoints,
      timeStatus: timeStatus,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/clockin/:email", checkHRSettings, async (req, res) => {
  const hrSettings = await req.models.HRSettings.findOne();
  try {
    const email = req.params.email;
    const [startHours, startMinutes] = hrSettings.startTime.split(":").map(Number);

    // Create a Date object for the startTime with today's date
    const startTime = new Date();
    startTime.setHours(startHours);
    startTime.setMinutes(startMinutes);
    startTime.setSeconds(0); // Optional: Set seconds and milliseconds to 0

    // Create a Date object for the current time
    const currentTime = new Date();

    console.log("Current Time:", currentTime);

    // Calculate the time difference in milliseconds
    const timeDifferenceMs = currentTime.getTime() - startTime.getTime();

    // Calculate timeLate in hours and minutes
    let hoursLate = Math.floor(timeDifferenceMs / (1000 * 60 * 60));
    let minutesLate = Math.floor((timeDifferenceMs % (1000 * 60 * 60)) / (1000 * 60));

    if (timeDifferenceMs <= 0) {
      hoursLate = 0;
      minutesLate = 0;
    }

    // Log the timeLate message
    console.log(`Employee is ${hoursLate} hours and ${minutesLate} minutes late`);

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
        timeIn: currentTime,
        status: "IN",
      };
      await Attendance.create(newData);
    } else {
      // If the user exists, increment daysPresent by 1 and update timeIn
      user.daysPresent += 1;
      user.timeIn = currentTime;
      user.status = "IN";
      await user.save();
    }

    // Create DaysPresent entry for tracking presence
    const dpData = {
      email: email,
      timeIn: currentTime,
      timeLate: `${hoursLate}:${minutesLate}`,
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

function calculateDeductionPoints(hoursLate, minutesLate) {
  // Calculate total lateness in minutes
  const totalMinutesLate = hoursLate * 60 + minutesLate;

  // Deduct points based on lateness rules
  let deductionPoints = 0;
  if (totalMinutesLate > 0 && totalMinutesLate <= 31) {
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
  } else if (totalMinutesLate > 60 && totalMinutesLate <= 120) {
    deductionPoints = 0.250;
  } else if (totalMinutesLate > 120 && totalMinutesLate <= 180) {
    deductionPoints = 0.375;
  } else if (totalMinutesLate > 180 && totalMinutesLate <= 240) {
    deductionPoints = 0.500;
  } else if (totalMinutesLate > 240 && totalMinutesLate <= 300) {
    deductionPoints = 0.625;
  } else if (totalMinutesLate > 300 && totalMinutesLate <= 360) {
    deductionPoints = 0.750;
  } else if (totalMinutesLate > 360 && totalMinutesLate <= 420) {
    deductionPoints = 0.875;
  } else {
    deductionPoints = 1.000;
  }
  return deductionPoints;
}

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

     // Get today's date
     const today = new Date();
     today.setHours(0, 0, 0, 0);
 
     // Find record for today
     const dp = await DaysPresent.findOne({ email: email, date: today });

     // Find record for yesterday
     const yesterday = new Date();
     yesterday.setDate(yesterday.getDate() - 1);
     yesterday.setHours(0, 0, 0, 0);

     const hoursLate = dp.timeLate.split(":")[0];
     const minutesLate = dp.timeLate.split(":")[1];
     const deductionPoints = calculateDeductionPoints(hoursLate, minutesLate);
 
     if (!dp) {
      user.timeIn = null; // Update timeIn to current date and time
      user.status = "OUT";
      user.creditPoints -= 3;
      user.daysPresent -= 1;
      await user.save();
      await DaysPresent.findOneAndDelete({ email: email, date: yesterday });
      req.session.message = {
        type: "danger",
        message: "You did not clock-out properly in your previous clock-in. Please remember to clock-out in time properly.",
      }
      res.redirect("/dtr_user/" + userLogin._id);
      return;
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

    if (!user) {
      console.log("User not found");
      return;
    } else {
      user.timeIn = null; // Update timeIn to current date and time
      user.status = "OUT";
      user.hoursWorked += totalHoursDecimal;
      user.creditPoints -= deductionPoints;
      await user.save();
    }

    req.session.message = {
      type: "success",
      message: "Clock-out successful.",
    };
    res.redirect("/dtr_user/" + userLogin._id);
  } catch (err) {
    console.error(err);
    res.status(500).send("CLOCKOUT SERVER ERROR");
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
      case "certLB":
        res.redirect("/certLB/" + email);
        break;
      case "marriageCont":
        res.redirect("/marriageCont/" + email);
        break;
      case "clearances":
        res.redirect("/clearances/" + email);
        break;
      case "schol":
        res.redirect("/schol/" + email);
        break;
      case "certLeaveB":
        res.redirect("/certLeaveB/" + email);
        break;
      case "copyReso":
        res.redirect("/copyReso/" + email);
        break;
      case "commendations":
        res.redirect("/commendations/" + email);
        break;
      case "disAct":
        res.redirect("/disAct/" + email);
        break;
      case "cos":
        res.redirect("/cos/" + email);
        break;
      case "swornS":
        res.redirect("/swornS/" + email);
        break;
      case "officeOrder":
        res.redirect("/officeOrder/" + email);
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
    const fileType = await AppPaper.find({email: email});
    const pageName = "Application Paper";
    const docuType = "appPaper";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
})

router.get("/pds/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await PDS.find({email: email});
    const pageName = "Personal Data Sheet";
    const docuType = "pds";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/certERL/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await CertERL.find({email: email});
    const pageName = "Certificate of ERL"
    const docuType = "certERL";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
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
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
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
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
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
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
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
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
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
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/certLB/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await CertLB.find({email: email});
    const pageName = "Certificate of Live Birth";
    const docuType = "certLB";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/marriageCont/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await MarriageCont.find({email: email});
    const pageName = "Marriage Contract";
    const docuType = "marriageCont";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/clearances/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await Clearances.find({email: email});
    const pageName = "Clearances";
    const docuType = "clearances";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/schol/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await Schol.find({email: email});
    const pageName = "Scholastic Record/Academic Record";
    const docuType = "schol";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/certLeaveB/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await CertLeaveB.find({email: email});
    const pageName = "Certificate of Leave Balances";
    const docuType = "certLeaveB";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/copyReso/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await CopyReso.find({email: email});
    const pageName = "Copy of Resolution";
    const docuType = "copyReso";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/commendations/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await Commendations.find({email: email});
    const pageName = "Commendations";
    const docuType = "commendations";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/disAct/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await DisAct.find({email: email});
    const pageName = "Disciplinary Action Documents";
    const docuType = "disAct";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/cos/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await Cos.find({email: email});
    const pageName = "Contract of Service";
    const docuType = "cos";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/swornS/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await SwornS.find({email: email});
    const pageName = "Sworn Statement of Assets";
    const docuType = "swornS";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hris");
  }
});

router.get("/officeOrder/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const fileType = await OfficeOrder.find({email: email});
    const pageName = "Office Order";
    const docuType = "officeOrder";
    res.render("HRIS/201Single", {email, fileType, pageName, docuType});
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

    if (docuType === "appPaper") {
      const appPaper = await AppPaper.findOne({
        email: email,
        files: file.originalname
      });
      if (appPaper) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/appPaper/" + email);
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
      await AppPaper.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/appPaper/" + email);
    } else if (docuType === "pds") {
      const pds = await PDS.findOne({
        email: email,
        files: file.originalname
      });
      if (pds) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/pds/" + email);
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
      await PDS.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/pds/" + email);
    } else if (docuType === "certERL") {
      const certERL = await CertERL.findOne({
        email: email,
        files: file.originalname
      });
      if (certERL) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/certERL/" + email);
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
      await CertERL.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/certERL/" + email);
    } else if (docuType === "oathO") {
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
    } else if (docuType === "certLB") {
      const certLB = await CertLB.findOne({
        email: email,
        files: file.originalname
      });
      if (certLB) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/certLB/" + email);
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
      await CertLB.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/certLB/" + email);
    } else if (docuType === "marriageCont") {
      const marriageCont = await MarriageCont.findOne({
        email: email,
        files: file.originalname
      });
      if (marriageCont) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/marriageCont/" + email);
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
      await MarriageCont.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/marriageCont/" + email);
    } else if (docuType === "clearances") {
      const clearances = await Clearances.findOne({
        email: email,
        files: file.originalname
      });
      if (clearances) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/clearances/" + email);
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
      await Clearances.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/clearances/" + email);
    } else if (docuType === "schol") {
      const schol = await Schol.findOne({
        email: email,
        files: file.originalname
      });
      if (schol) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/schol/" + email);
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
      await Schol.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/schol/" + email);
    } else if (docuType === "certLeaveB") {
      const certLeaveB = await CertLeaveB.findOne({
        email: email,
        files: file.originalname
      });
      if (certLeaveB) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/certLeaveB/" + email);
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
      await CertLeaveB.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/certLeaveB/" + email);
    } else if (docuType === "copyReso") {
      const copyReso = await CopyReso.findOne({
        email: email,
        files: file.originalname
      });
      if (copyReso) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/copyReso/" + email);
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
      await CopyReso.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/copyReso/" + email);
    } else if (docuType === "commendations") {
      const commendations = await Commendations.findOne({
        email: email,
        files: file.originalname
      });
      if (commendations) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/commendations/" + email);
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
      await Commendations.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/commendations/" + email);
    } else if (docuType === "disAct") {
      const disAct = await DisAct.findOne({
        email: email,
        files: file.originalname
      });
      if (disAct) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/disAct/" + email);
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
      await DisAct.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/disAct/" + email);
    } else if (docuType === "cos") {
      const cos = await Cos.findOne({
        email: email,
        files: file.originalname
      });
      if (cos) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/cos/" + email);
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
      await Cos.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/cos/" + email);
    } else if (docuType === "swornS") {
      const swornS = await SwornS.findOne({
        email: email,
        files: file.originalname
      });
      if (swornS) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/swornS/" + email);
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
      await SwornS.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/swornS/" + email);
    } else if (docuType === "officeOrder") {
      const officeOrder = await OfficeOrder.findOne({
        email: email,
        files: file.originalname
      });
      if (officeOrder) {
        req.session.message = {
          type: "danger",
          message: "File already exists",
        };
        res.redirect("/officeOrder/" + email);
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
      await OfficeOrder.create(data);
      req.session.message = {
        type: "success",
        message: "Paper submitted successfully",
      };
      res.redirect("/officeOrder/" + email);
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

    if (docuType === "appPaper") {
      const result = await AppPaper.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/appPaper/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/appPaper/" + email);
    } else if (docuType === "pds") {
      const result = await PDS.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/pds/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/pds/" + email);
    } else if (docuType === "certERL") {
      const result = await CertERL.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/certERL/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/certERL/" + email);
    } else if (docuType === "oathO") {
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
    } else if (docuType === "certLB") {
      const result = await CertLB.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/certLB/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/certLB/" + email);
    } else if (docuType === "marriageCont") {
      const result = await MarriageCont.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/marriageCont/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/marriageCont/" + email);
    } else if (docuType === "clearances") {
      const result = await Clearances.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/clearances/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/clearances/" + email);
    } else if (docuType === "schol") {
      const result = await Schol.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/schol/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/schol/" + email);
    } else if (docuType === "certLeaveB") {
      const result = await CertLeaveB.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/certLeaveB/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/certLeaveB/" + email);
    } else if (docuType === "copyReso") {
      const result = await CopyReso.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/copyReso/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/copyReso/" + email);
    } else if (docuType === "commendations") {
      const result = await Commendations.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/commendations/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/commendations/" + email);
    } else if (docuType === "disAct") {
      const result = await DisAct.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/disAct/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/disAct/" + email);
    } else if (docuType === "cos") {
      const result = await Cos.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/cos/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/cos/" + email);
    } else if (docuType === "swornS") {
      const result = await SwornS.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/swornS/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/swornS/" + email);
    } else if (docuType === "officeOrder") {
      const result = await OfficeOrder.deleteOne({ email: email, files: fileName });
      if (result.deletedCount === 0) {
        req.session.message = {
          type: "danger",
          message: "No document found to delete",
        };
        return res.redirect("/officeOrder/" + email);
      }
      fs.unlinkSync(filePath);
      req.session.message = {
        type: "danger",
        message: "File deleted successfully",
      };
      res.redirect("/officeOrder/" + email);
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
});

router.get("/hrSettingsUser" , async (req, res) => {
  res.render("HRISUSER/hrSettingsUser");
})

router.get("/printDTR/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const logincollections = await LogInCollection.findOne({
      email: email,
    });
  
    if (!logincollections) {
      req.session.message = {
        type: "danger",
        message: "No data found",
      };
      return res.redirect("/hrSettingsUser");
    }
  
    const attendance = await Attendance.findOne({
      email: email,
    });
  
    if (!attendance) {
      req.session.message = {
        type: "danger",
        message: "No data found (Attendance Data)",
      };
      return res.redirect("/hrSettingsUser");
    }

    const daysPresent = await DaysPresent.find({ email: email });
    if (!daysPresent) {
      req.session.message = {
        type: "danger",
        message: "No data found (Days Present Data)",
      };
      return res.redirect("/hrSettingsUser");
    }

    const VLPoints = await calculateCurrentVLPoints(logincollections.email);
    const SLPoints = await calculateCurrentSLPoints(logincollections.email);

    res.render("HRISUSER/printDTR", {logincollections, attendance, daysPresent, VLPoints, SLPoints});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/hrSettingsUser");
  }
});

router.get("/printHistory/:email", async (req, res) => {
  const email = req.params.email;
  const logincollections = await LogInCollection.findOne({
    email: email,
  });

  if (!logincollections) {
    req.session.message = {
      type: "danger",
      message: "No data found",
    };
    return res.redirect("/dtr_user" + logincollections.id);
  }
  try {
    const daysPresentA = await DaysPresentA.find({ email: email });
    if (!daysPresentA) {
      req.session.message = {
        type: "danger",
        message: "No data found (Days Present Data)",
      };
      return res.redirect("/dtr_user" + logincollections.id);
    }

    const daysAbsentA = await DaysAbsentA.find({ email: email });
    if (!daysAbsentA) {
      req.session.message = {
        type: "danger",
        message: "No data found (Days Absent Data)",
      };
      return res.redirect("/dtr_user" + logincollections.id);
    }

    const leaveapplications = await LeaveApplications.find({ 
      email: email,
      status: "CLOSED"
    });
    if (!leaveapplications) {
      req.session.message = {
        type: "danger",
        message: "No data found (Leave Application Data)",
      };
      return res.redirect("/dtr_user" + logincollections.id);
    }

    res.render("HRIS/PRINT/printHistory", {logincollections, daysPresentA, daysAbsentA, leaveapplications});
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error fetching data",
    };
    res.redirect("/dtr_user" + logincollections.id);
  }
})

module.exports = router;
