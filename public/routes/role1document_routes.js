const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { checkRole } = require("../middleware/authMiddleware");

// Models
const rejectedDocuments = require("../models/rejecteddocuments");
const UserDocuments = require("../models/userdocuments");
const SubmittedFiles = require("../models/submitted_files");

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/documents");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const employeeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/employeedocument");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const documentUpload = multer({ storage: documentStorage });
const employeeUpload = multer({ storage: employeeStorage });

const passUserToRoute = (req, res, next) => {
  if (!res.locals.user) {
    return res.status(401).send("Unauthorized");
  }
  req.user = res.locals.user;
  next();
};

router.get("/role1", passUserToRoute, async (request, response) => {
  const currentPage = parseInt(request.query.page) || 1;
  const pageSize = 10;
  const user = request.user;

  try {
    const totalSubmittedFiles = await SubmittedFiles.countDocuments();
    const totalPages = Math.ceil(totalSubmittedFiles / pageSize);
    // Fetch all submitted files and sort by dateSubmitted in descending order
    const submittedFiles = await SubmittedFiles.find({
      fileType: "non-confidential",
      $or: [{ assignTo: user.name }, { assignTo: "None" }],
    })
      .sort({
        dateSubmitted: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set time to beginning of the day
  
      // Get end of today
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999); // Set time to end of the day
  
      const todayFiles = await SubmittedFiles.find({
        fileType: "non-confidential",
        assignTo: user.name,
        dueDate: { $gte: today, $lte: endOfToday },
      }).sort({ dateSubmitted: -1 });
  
      const todayFilesIds = todayFiles.map((file) => file._id);
  
      // Calculate the start and end of the current week
      const startOfWeek = new Date();
      startOfWeek.setHours(0, 0, 0, 0); // Set time to beginning of the day
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Move to start of the week (Sunday)
  
      const endOfWeek = new Date();
      endOfWeek.setHours(23, 59, 59, 999); // Set time to end of the day
      endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay())); // Move to end of the week (Saturday)
  
      const currentWeekFiles = await SubmittedFiles.find({
        fileType: "non-confidential",
        assignTo: user.name,
        dueDate: { $gte: startOfWeek, $lte: endOfWeek },
        _id: { $nin: todayFilesIds },
      }).sort({ dateSubmitted: -1 });

    // Fetch pending files and sort by dateSubmitted in descending order
    const pendingFiles = await SubmittedFiles.find({
      status: "PENDING",
      assignTo: user.name,
    }).sort({
      dateSubmitted: -1,
    });

    // Fetch approved files and sort by dateSubmitted in descending order
    const approvedFiles = await SubmittedFiles.find({
      status: "APPROVED",
      assignTo: user.name,
    }).sort({ dateSubmitted: -1 });

    const forApproval = await SubmittedFiles.find({
      status: "FOR APPROVAL",
      assignTo: user.name,
    }).sort({ dateSubmitted: -1 });

    response.render("role/role1_temps/role1", {
      submittedFiles,
      todayFiles,
      currentWeekFiles,
      currentPage,
      totalPages,
      pendingFiles,
      approvedFiles,
      forApproval,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    response.status(500).send("Internal Server Error");
  }
});

// Rejected Documents
router.get("/rejected_docu", async (req, res) => {
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;

  try {
    const rejectedDocs = await rejectedDocuments.find();
    // Pass the files data to the "/role1_documents" route
    res.render("role/rejected_docu", {
      rejectedDocuments: rejectedDocs,
      role1directory_length,
      rejecteddirectory_length,
      role2directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

// Role1 Documents
router.get("/role1_docu", (req, res) => {
  const role1directory = "./files/role1";
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;

  try {
    const fileNames = fs.readdirSync(role1directory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(role1directory, fileName);
      const stats = fs.statSync(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      // Convert mtime to desired format
      const mtime = stats.mtime.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
      });
      return {
        name: fileName,
        size: sizeInMB + " MB",
        mtime: mtime,
        folder: "Entry Level",
      };
    });

    // Pass the files data to the "/role1_documents" route
    res.render("role/role1_docu", {
      files,
      rejecteddirectory_length,
      role1directory_length,
      role2directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/role2_docu", (req, res) => {
  const role2directory = "./files/role2";
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;

  try {
    const fileNames = fs.readdirSync(role2directory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(role2directory, fileName);
      const stats = fs.statSync(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      // Convert mtime to desired format
      const mtime = stats.mtime.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
      });
      return {
        name: fileName,
        size: sizeInMB + " MB",
        mtime: mtime,
        folder: "Individual Contributors",
      };
    });

    // Pass the files data to the "/role1_documents" route
    res.render("role/role2_docu", {
      files,
      rejecteddirectory_length,
      role1directory_length,
      role2directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

// Open folder
router.get("/personalfolder/:name", async (req, res) => {
  try {
    const name = req.params.name;

    // Find user by name to get the "fileName" field
    const employee = await UserDocuments.findOne({ name });

    if (!employee) {
      return res.redirect("/employeedocument");
    }

    const employeefiles = "./files/employeedocument";
    // Retrieve file names from the user's "fileName" field
    const fileNames = employee.fileName; // Corrected field name

    const files = fileNames.map((fileName) => {
      const filePath = path.join(employeefiles, fileName);
      const stats = fs.statSync(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      // Convert mtime to desired format
      const mtime = stats.mtime.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
      });
      return {
        name: fileName,
        size: sizeInMB + " MB",
        mtime: mtime,
      };
    });

    // Pass the files data to the "/openfolder" route
    res.render("personalfolder", { employee, files });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Open Recycle Bin/Archive
router.get("/archive_user/:name", async (req, res) => {
  try {
    const name = req.params.name;

    // Find user by name to get the "fileName" field
    const user = await UserDocuments.findOne({ name });

    if (!user) {
      return res.redirect("/role1_archive");
    }

    const employee_archive = "./files/employee_archive";
    const fileNames = user.recycleBin;

    const files = fileNames.map((fileName) => {
      const filePath = path.join(employee_archive, fileName);
      const stats = fs.statSync(filePath);
      const sizeInBytes = stats.size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      // Convert mtime to desired format
      const mtime = stats.mtime.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
      });
      return {
        name: fileName,
        size: sizeInMB + " MB",
        mtime: mtime,
      };
    });

    // Pass the files data to the "/openfolder" route
    res.render("role/role1_temps/role1_archive", { files });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/uploadPerso", employeeUpload.single("file"), async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      console.error("No file uploaded");
      res.status(400).send("No file uploaded");
      return;
    }

    // Get the filename of the uploaded file
    const filename = req.file.filename;

    // Extract the name parameter from the form data
    const { name } = req.body;

    console.log("Uploaded filename:", filename); // Log uploaded filename
    console.log("User name from form data:", name); // Log user name from form data

    // Update the user document with the new file name
    const user = await UserDocuments.findOne({ name });

    if (!user) {
      console.error("User not found");
      res.status(404).send("User not found");
      return;
    }

    console.log("User found:", user); // Log user document found in the database

    // Add the new file name to the fileName array
    user.fileName.push(filename);
    await user.save();

    // Log the successful upload message
    console.log(
      `File ${filename} uploaded successfully and added to user's files`
    );

    req.session.message = {
      type: "info",
      message: "Upload Successfully",
    };

    res.redirect(`/personalfolder/${name}`);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Status Board Route
router.get("/statusboard-r1", async (req, res) => {
  try {
    const ITEMS_PER_PAGE = 10; // Number of items per page
    const page = parseInt(req.query.page) || 1; // Current page number, default to 1
    const totalItems = await SubmittedFiles.countDocuments(); // Total number of items

    const submittedFiles = await SubmittedFiles.find({
      fileType: "non-confidential",
    })
      .sort({ dateSubmitted: -1 }) // Sort by dateSubmitted in descending order
      .skip((page - 1) * ITEMS_PER_PAGE) // Skip items based on current page
      .limit(ITEMS_PER_PAGE); // Limit the number of items per page

    res.render("role/role1_temps/statusboard-r1", {
      submittedFiles,
      currentPage: page,
      totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
      itemsPerPage: ITEMS_PER_PAGE,
      totalItems,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/role1/view_file/:id", async (req, res) => {
  res.redirect("/view_file/" + req.params.id);
});

router.get("/role1/approve-file/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    file.status = "APPROVED";
    await file.save();

    req.session.message = {
      type: "success",
      message: "File Approved Successfully",
    };
    res.redirect("/view_file/" + id);
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.get("/role1/reject-file/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    file.status = "REJECTED";
    await file.save();

    req.session.message = {
      type: "danger",
      message: "File Approved Successfully",
    };
    res.redirect("/view_file/" + id);
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.get("/role1/revision-file/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    file.status = "REVISION";
    await file.save();

    req.session.message = {
      type: "dark",
      message: "File Approved Successfully",
    };
    res.redirect("/view_file/" + id);
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.get("/role1/pending-file/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    file.status = "PENDING";
    await file.save();

    req.session.message = {
      type: "warning",
      message: "File Approved Successfully",
    };
    res.redirect("/view_file/" + id);
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

module.exports = router;
