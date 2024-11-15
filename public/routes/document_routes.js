const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { requireAuth } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/authMiddleware.js");

// Models
const LogInCollection = require("../models/logincollections");
const UserDocuments = require("../models/userdocuments");
const rejectedDocuments = require("../models/rejecteddocuments");
const SubmittedFiles = require("../models/submitted_files");
const ArchivedFiles = require("../models/archivedfiles");
const TaskTimeline = require("../models/taskTimeline");

// Multer configuration
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/documents");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const documentUpload = multer({ storage: documentStorage });

router.get("/startpage", requireAuth, (req, res) => {
  res.render("startpage");
});

router.get("/home", checkRole, async (request, response) => {
  const currentPage = parseInt(request.query.page) || 1;
  const pageSize = 10;

  try {
    const totalSubmittedFiles = await SubmittedFiles.countDocuments();
    const totalPages = Math.ceil(totalSubmittedFiles / pageSize);

    // Fetch all submitted files and sort by dateSubmitted and urgentTask
    const allFiles = await SubmittedFiles.find({})
      .sort({ urgentTask: -1, dateSubmitted: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    // Define date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const endOfWeek = new Date();
    endOfWeek.setHours(23, 59, 59, 999);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

    // Categorize files based on dueDate and status
    const todayFiles = [];
    const currentWeekFiles = [];
    const otherFiles = [];
    const assignedFiles = [];
    const approvedFiles = [];
    const forApproval = [];

    allFiles.forEach((file) => {
      const { dueDate, status } = file;

      // Categorize by due date
      if (dueDate >= today && dueDate <= endOfToday) {
        todayFiles.push(file);
      } else if (dueDate >= startOfWeek && dueDate <= endOfWeek) {
        currentWeekFiles.push(file);
      } else {
        otherFiles.push(file);
      }

      // Categorize by status
      if (status === "ASSIGNED") {
        assignedFiles.push(file);
      } else if (status === "APPROVED") {
        approvedFiles.push(file);
      } else if (status === "FOR APPROVAL") {
        forApproval.push(file);
      }
    });

    const pageType = "non-confidential";

    response.render("home", {
      submittedFiles: allFiles,
      todayFiles,
      currentWeekFiles,
      otherFiles,
      assignedFiles,
      approvedFiles,
      forApproval,
      currentPage,
      totalPages,
      pageType,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    response.status(500).send("Internal Server Error");
  }
});


// Archive Files
router.get("/archive_files", async (req, res) => {
  const currentPage = parseInt(req.query.page) || 1;
  const pageSize = 10;

  try {
    const totalArchivedFiles = await ArchivedFiles.countDocuments();
    const totalPages = Math.ceil(totalArchivedFiles / pageSize);
    // Fetch all submitted files and sort by dateSubmitted in descending order
    const archivedFiles = await ArchivedFiles.find()
      .sort({
        dateSubmitted: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    res.render("DTRACKER/archive_files", {
      archivedFiles,
      currentPage,
      totalPages,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Status Board Route
router.get("/statusboard", async (req, res) => {
  try {
    const ITEMS_PER_PAGE = 10; // Number of items per page
    const page = parseInt(req.query.page) || 1; // Current page number, default to 1
    const totalItems = await SubmittedFiles.countDocuments(); // Total number of items

    const submittedFiles = await SubmittedFiles.find({})
      .sort({ dateSubmitted: -1 }) // Sort by dateSubmitted in descending order
      .skip((page - 1) * ITEMS_PER_PAGE) // Skip items based on current page
      .limit(ITEMS_PER_PAGE); // Limit the number of items per page

    res.render("statusboard", {
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

router.use(
  "/files/documents",
  express.static(path.join(__dirname, "../../files/documents"))
);

// Function to retrieve the list of files in the documents directory
function getFileList(callback) {
  const directoryPath = path.join(__dirname, "../../files/documents");
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      callback(err, null);
      return;
    }
    callback(null, files);
  });
}

router.get("/download/:id", async (request, response) => {
  try {
    const id = request.params.id;

    const submittedFiles = await SubmittedFiles.findById(id);

    if (!submittedFiles) {
      request.session.message = {
        type: "danger",
        message: "File not found!",
      };
      return response.redirect("/home");
    }

    const fileUpload = submittedFiles.fileUpload;

    if (!fileUpload) {
      request.session.message = {
        type: "danger",
        message: "No File Attached!",
      };
      return response.redirect("/home");
    }

    const filePath = path.join(__dirname, "../../files/documents", fileUpload);

    // Ensure the file exists before attempting to download
    const fs = require("fs");
    if (fs.existsSync(filePath)) {
      response.download(filePath);
    } else {
      request.session.message = {
        type: "danger",
        message: "File does not exist on the server!",
      };
      response.redirect("/home");
    }
  } catch (error) {
    console.error(error);
    request.session.message = {
      type: "danger",
      message: "An error occurred while processing your request.",
    };
    response.redirect("/home");
  }
});

router.get("/delete", (req, res) => {
  const filename = req.query.file;

  if (filename) {
    const filePath = path.join(__dirname, "../../files/archive/", filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error deleting file ${filename}: ${err}`);
        res.status(500).send("Error deleting file");
        return;
      }
      console.log(`File ${filename} deleted successfully`);

      // Get updated file list after deletion
      getFileList((err, files) => {
        if (err) {
          // Handle error appropriately
          res.status(500).send("Error retrieving file list");
          return;
        }
        // Send the updated file list to the client
        res.json({ files });
      });
    });
  } else {
    // Handle case where no file name is provided
    res.status(400).send("No file specified for deletion");
  }
});


router.get("/recyclebin", async (req, res) => {
  const fileName = req.query.file;
  const hrrole = req.query.hrrole;
  const name = req.query.name;

  console.log(fileName, hrrole, name);

  if (!fileName) {
    return res.status(400).send("No file specified for moving to archive");
  }
  if (!hrrole) {
    return res.status(400).send("No role specified for moving to archive");
  }

  sourceFilePath = path.join(__dirname, "../../files/rejected/", fileName);

  if (!fs.existsSync(sourceFilePath)) {
    console.error("File not found at:", sourceFilePath);
    return res.status(404).send("File not found");
  }

  const user = await rejectedDocuments.findOneAndDelete({ fileName, name });

  if (!user) {
    console.error("User not found");
    return res.status(404).send("User not found");
  }

  console.log("User found and deleted:", user);

  const destFolderPath = path.join(__dirname, "../../files/archive/");

  fs.rename(sourceFilePath, path.join(destFolderPath, fileName), (err) => {
    if (err) {
      console.error(`Error moving file ${fileName} to archive: ${err}`);
      return res.status(500).send("Error moving file to archive");
    }

    console.log(`File ${fileName} moved to archive successfully`);
    res.redirect("/home");
  });
});

// Delete all files in Recycle Bin
router.get("/delete-all", (req, res) => {
  const folderPath = path.join(__dirname, "../../files/archive");

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(`Error reading folder: ${err}`);
      return res.status(500).send("Error reading folder");
    }

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`Error deleting file ${file}: ${unlinkErr}`);
          // Continue deleting other files even if one deletion fails
        } else {
          console.log(`File ${file} deleted successfully`);
        }
      });
    });

    req.session.message = {
      type: "info",
      message: " Files Deleted Successfully",
    };

    res.redirect("/archive");
  });
});

// Restore files
router.get("/restore", (req, res) => {
  const sourceFolderPath = path.join(__dirname, "../../files/archive");
  const destFolderPath = path.join(__dirname, "../../files/documents");

  fs.readdir(sourceFolderPath, (err, files) => {
    if (err) {
      console.error(`Error reading source folder: ${err}`);
      return res.status(500).send("Error reading source folder");
    }

    files.forEach((file) => {
      const sourceFilePath = path.join(sourceFolderPath, file);
      const destFilePath = path.join(destFolderPath, file);

      fs.rename(sourceFilePath, destFilePath, (renameErr) => {
        if (renameErr) {
          console.error(`Error moving file ${file} back: ${renameErr}`);
          // Continue moving other files even if one move fails
        } else {
          console.log(`File ${file} moved back successfully`);
        }
      });
    });

    req.session.message = {
      type: "info",
      message: " Files Restored Successfully",
    };

    res.redirect("/archive");
  });
});

router.get("/employeedocument", async (req, res) => {
  try {
    const logincollection = await LogInCollection.find();
    res.render("employeedocument", { logincollection });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Open folder
router.get("/openfolder/:name", async (req, res) => {
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
    res.render("openfolder", { employee, files });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/deletefile/:filename", async (req, res) => {
  try {
    const filename = req.params.filename; // Get the filename from the URL parameter
    const username = req.body.username; // Assuming username is sent in the request body

    const filePath = path.join(
      __dirname,
      "../../files/employeedocument/",
      filename
    );

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error("File not found");
      return res.status(404).send("File not found");
    }
    // Remove the file from the filesystem
    fs.unlinkSync(filePath);

    if (!username) {
      console.error("Username not provided in the request");
      return res.status(400).send("Username not provided");
    }

    // Update the user document to remove the filename from the array
    const user = await UserDocuments.findOne({ name: username });

    if (!user) {
      console.error("User not found for username:", username);
      return res.status(404).send("User not found");
    }

    // Remove the filename from the array
    const index = user.fileName.indexOf(filename);
    if (index !== -1) {
      user.fileName.splice(index, 1); // Remove the filename from the array
      await user.save(); // Save the updated user document
    }

    // Log the successful deletion message
    console.log(`File ${filename} deleted successfully`);

    res.status(200).send("File deleted successfully");
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/delete_file/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const file = await ArchivedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      if (req.headers['content-type'] === 'application/json') {
        return res.status(404).json({ message: "File not found" });
      } else {
        return res.redirect("/archive_files");
      }
    }

    // Remove the file from the filesystem
    if (file.fileUpload != null) {
      fs.unlinkSync("./files/documents/" + file.fileUpload);
    }

    // Remove the file from the database
    await ArchivedFiles.findByIdAndDelete(id);
    req.session.message = {
      type: "success",
      message: "File deleted successfully",
    };

    if (req.headers['content-type'] === 'application/json') {
      return res.status(200).json({ message: "File deleted successfully" });
    } else {
      return res.redirect("/archive_files");
    }
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };

    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ message: "Error: " + error });
    } else {
      return res.redirect("/archive_files");
    }
  }
});
// Submit File
router.get("/submitfile", async (req, res) => {
  try {
    const users = await LogInCollection.find();
    res.render("submitfile", { users });
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.post("/submitfile", documentUpload.single("file"), async (req, res) => {
  try {
    // Check if file code already exists
    const fileCodeExists = await SubmittedFiles.exists({
      fileCode: req.body.fileCode,
    });

    if (fileCodeExists) {
      req.session.message = {
        type: "danger",
        message: "File Code already exists!",
      };
      return res.redirect("/submitfile");
    }

    const { assignTo } = req.body;
    const [userName, userEmail] = assignTo.split(",");

    // Create fileData object if file code does not exist
    const fileData = {
      status: "ASSIGNED",
      fileName: req.body.fileName,
      fileCode: req.body.fileCode,
      assignTo: userName,
      email: userEmail,
      fileInstruction: req.body.fileInstruction,
      dateSubmitted: new Date(),
      dueDate: req.body.dueDate,
      fileUpload: req.file ? req.file.filename : null,
      urgentTask: req.body.urgentTask === "true",
    };

    // Save fileData to database
    await SubmittedFiles.create(fileData);

    req.session.message = {
      type: "success",
      message: "File Submitted Successfully",
    };
    res.redirect("/home");
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.get("/view_file/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/home");
    }

    const remarks = await TaskTimeline.find({ fileCode: file.fileCode });
    const fileDes = "Main"
    const users = await LogInCollection.find({
      department: "HR Department",
    });

    res.render("DTRACKER/view_file", { file, remarks, fileDes, users });
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.get("/view_archived/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await ArchivedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/archive_files");
    }

    const fileDes = "Archive"

    res.render("DTRACKER/view_file", { file, fileDes });
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/archive_files");
  }
});

router.get("/approve-file/:id", async (req, res) => {
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
    file.dateApproved = new Date();
    await file.save();

    await TaskTimeline.create({
      fileCode: file.fileCode,
      fileStatus: file.status,
      remarks: "Task Approved",
      date: new Date(),
    });

    req.session.message = {
      type: "success",
      message: `File ${file.fileCode} Approved Successfully`,
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


router.get("/reassign-file/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const remarks = req.query.remarks;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    file.status = "REASSIGNED";
    file.remarks = remarks;
    await file.save();

    req.session.message = {
      type: "success",
      message: "Task reassigned successfully.",
    };
    res.redirect("/view_file/" + id);

  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
})

router.get("/assigned-file/:id", async (req, res) => {
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

    file.status = "ASSIGNED";
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

router.get("/update-task/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const remarks = req.query.remarks || "No remarks provided"; // Default message if remarks is missing

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    await TaskTimeline.create({
      fileCode: file.fileCode,
      fileStatus: file.status,
      remarks: remarks,
      date: new Date(),
    });

    req.session.message = {
      type: "success",
      message: "Task remarked successfully.",
    };
    res.redirect("/view_file/" + id);
  } catch (error) {
    console.error("Error updating task:", error); // Log the error for debugging
    req.session.message = {
      type: "danger",
      message: "Error: " + error.message,
    };
    res.redirect("/home");
  }
});


router.get("/for-approval-file/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const remarks = req.query.remarks;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger",
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    file.status = "FOR APPROVAL";
    await file.save();

    await TaskTimeline.create({
      fileCode: file.fileCode,
      fileStatus: file.status,
      remarks: remarks,
      date: new Date(),
    });

    req.session.message = {
      type: "success",
      message: "Task marked for approval.",
    };
    res.redirect("/view_file/" + id);

  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
})

router.get("/archive_file/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = { type: "danger", message: "File not found" };
      return res.redirect("/view_file/" + id);
    }

    try {
      await ArchivedFiles.create(file.toObject());
    } catch (error) {
      console.error(error);
      req.session.message = {
        type: "danger",
        message: "Error: " + error,
      };
      return res.redirect("/home");
    }
    await SubmittedFiles.findByIdAndDelete(id);

    req.session.message = {
      type: "warning",
      message: "File Archived Successfully",
    };

    res.redirect("/home");
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
});

router.get("/change-assignee/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const assignee = req.query.newAssignee;
    const empID = req.query.empID;

    const newAssign = await LogInCollection.findOne({ email: assignee });

    if (!newAssign) {
      req.session.message = {
        type: "danger",
        message: "User not found",
      };
      return res.redirect("/view_file/" + id);
    }
    console.log(newAssign);

    const assignChange = await LogInCollection.findOne({ employeeID: empID });

    if (!assignChange) {
      req.session.message = {
        type: "danger",
        message: "Your Employee ID is not found",
      };
      return res.redirect("/view_file/" + id);
    }

    const file = await SubmittedFiles.findById(id);

    if (!file) {
      req.session.message = {
        type: "danger", 
        message: "File not found",
      };
      return res.redirect("/view_file/" + id);
    }

    const data = {
      assignTo: newAssign.name + ", " + newAssign.lastname,
      assignChange: assignChange.name + " " + assignChange.lastname,
      email: newAssign.email,
    };

    await SubmittedFiles.findByIdAndUpdate(id, data);

    req.session.message = {
      type: "warning",
      message: "Assignee changed successfully.",
    };
    res.redirect("/view_file/" + id);
  } catch (error) {
    console.error("Error updating assignee:", error);
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
  }
})

router.get("/printStatusboard", async (req, res) => {
  const files = await SubmittedFiles.find({});
  res.render("HRIS/PRINT/statusboardprint", { files });
})

module.exports = router;
