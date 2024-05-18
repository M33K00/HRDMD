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
    // Fetch all submitted files and sort by dateSubmitted in descending order
    const submittedFiles = await SubmittedFiles.find({
      fileType: "non-confidential",
    })
      .sort({
        dateSubmitted: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    // Fetch pending files and sort by dateSubmitted in descending order
    const pendingFiles = await SubmittedFiles.find({
      status: "PENDING",
      fileType: "non-confidential",
    }).sort({
      dateSubmitted: -1,
    });

    // Fetch approved files and sort by dateSubmitted in descending order
    const approvedFiles = await SubmittedFiles.find({
      status: "APPROVED",
      fileType: "non-confidential",
    }).sort({ dateSubmitted: -1 });

    // Fetch rejected files and sort by dateSubmitted in descending order
    const rejectedFiles = await SubmittedFiles.find({
      status: "REJECTED",
      fileType: "non-confidential",
    }).sort({ dateSubmitted: -1 });

    // Fetch revision files and sort by dateSubmitted in descending order
    const revisionFiles = await SubmittedFiles.find({
      status: "REVISION",
      fileType: "non-confidential",
    }).sort({ dateSubmitted: -1 });

    response.render("home", {
      submittedFiles,
      currentPage,
      totalPages,
      pendingFiles,
      approvedFiles,
      rejectedFiles,
      revisionFiles,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    response.status(500).send("Internal Server Error");
  }
});

// Confidential Files
router.get("/confidential", checkRole, async (request, response) => {
  const currentPage = parseInt(request.query.page) || 1;
  const pageSize = 10;

  try {
    const totalSubmittedFiles = await SubmittedFiles.countDocuments();
    const totalPages = Math.ceil(totalSubmittedFiles / pageSize);
    // Fetch all submitted files and sort by dateSubmitted in descending order
    const submittedFiles = await SubmittedFiles.find({
      fileType: "confidential",
    })
      .sort({
        dateSubmitted: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);

    // Fetch pending files and sort by dateSubmitted in descending order
    const pendingFiles = await SubmittedFiles.find({
      status: "PENDING",
      fileType: "confidential",
    }).sort({
      dateSubmitted: -1,
    });

    // Fetch approved files and sort by dateSubmitted in descending order
    const approvedFiles = await SubmittedFiles.find({
      status: "APPROVED",
      fileType: "confidential",
    }).sort({ dateSubmitted: -1 });

    // Fetch rejected files and sort by dateSubmitted in descending order
    const rejectedFiles = await SubmittedFiles.find({
      status: "REJECTED",
      fileType: "confidential",
    }).sort({ dateSubmitted: -1 });

    // Fetch revision files and sort by dateSubmitted in descending order
    const revisionFiles = await SubmittedFiles.find({
      status: "REVISION",
      fileType: "confidential",
    }).sort({ dateSubmitted: -1 });

    response.render("confidential", {
      submittedFiles,
      currentPage,
      totalPages,
      pendingFiles,
      approvedFiles,
      rejectedFiles,
      revisionFiles,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    response.status(500).send("Internal Server Error");
  }
});

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

// Rejected Documents
router.get("/rejected_documents", async (req, res) => {
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;

  try {
    const rejectedDocs = await rejectedDocuments.find();
    // Pass the files data to the "/role1_documents" route
    res.render("rejected_documents", {
      rejectedDocuments: rejectedDocs,
      role1directory_length,
      rejecteddirectory_length,
      role2directory_length,
      role3directory_length,
      role4directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/role1_documents", (req, res) => {
  const role1directory = "./files/role1";
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;

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
        folder: role1directory.name,
      };
    });

    // Pass the files data to the "/role1_documents" route
    res.render("role1_documents", {
      files,
      rejecteddirectory_length,
      role1directory_length,
      role2directory_length,
      role3directory_length,
      role4directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

// Status Board Route
router.get("/statusboard", async (req, res) => {
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

// Archive Route
router.get("/archive", (request, response) => {
  const filesDirectory = "./files/archive";

  try {
    const fileNames = fs.readdirSync(filesDirectory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(filesDirectory, fileName);
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

    // Pass the files data to the "/home" route
    response.render("archive", { files });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.use(
  "/files/documents",
  express.static(path.join(__dirname, "../../files/documents"))
);

router.use(
  "/files/role4",
  express.static(path.join(__dirname, "../../files/role4"))
);

router.use(
  "/files/role3",
  express.static(path.join(__dirname, "../../files/role3"))
);

router.use(
  "/files/role2",
  express.static(path.join(__dirname, "../../files/role2"))
);

router.use(
  "/files/role1",
  express.static(path.join(__dirname, "../../files/role1"))
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

router.get("/delete_rolefile", (req, res) => {
  const filename = req.query.file;

  if (filename) {
    // Array to store the paths of folders to check
    const foldersToCheck = ["role1", "role2", "role3", "role4"];
    let fileDeleted = false;

    // Function to recursively check and delete file from each folder
    const deleteFileFromFolders = (folders, callback) => {
      if (folders.length === 0) {
        // If no more folders to check, invoke the callback
        callback();
        return;
      }

      const currentFolder = folders.shift(); // Get and remove the first folder from the array
      const filePath = path.join(
        __dirname,
        `../../files/${currentFolder}/`,
        filename
      );

      fs.unlink(filePath, (err) => {
        if (!err) {
          console.log(`File ${filename} deleted from ${currentFolder}`);
          fileDeleted = true; // Set flag indicating file was deleted
          // Continue checking remaining folders
          deleteFileFromFolders(folders, callback);

          req.session.message = {
            type: "info",
            message: " File Deleted Successfully",
          };
        } else {
          // File not found in current folder, check next folder
          deleteFileFromFolders(folders, callback);
        }
      });
    };

    // Call the recursive function to delete file from folders
    deleteFileFromFolders([...foldersToCheck], () => {
      if (!fileDeleted) {
        console.error(`File ${filename} not found in any folder`);
        res.status(404).send("File not found");
        return;
      }

      // File deleted successfully from at least one folder
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

    // Create fileData object if file code does not exist
    const fileData = {
      status: req.body.status,
      fileName: req.body.fileName,
      fileCode: req.body.fileCode,
      fileType: req.body.fileType,
      assignTo: req.body.assignTo,
      email: req.body.email,
      fileInstruction: req.body.fileInstruction,
      dateSubmitted: new Date(),
      fileUpload: req.file ? req.file.filename : null,
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

    res.render("DTRACKER/view_file", { file });
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: "Error: " + error,
    };
    res.redirect("/home");
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

router.get("/reject-file/:id", async (req, res) => {
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

router.get("/revision-file/:id", async (req, res) => {
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

router.get("/pending-file/:id", async (req, res) => {
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

/*
router.get("/convertFromOffice/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "../../files/documents/", fileName);
  const outPath = path.resolve(
    __dirname,
    `../../files/documents/${fileName}_convert.pdf`
  );

  docxConverter(filePath, outPath, function (err, result) {
    if (err) {
      console.error(err);
      return res.status(500).send("Error converting file.");
    }
    console.log("PDF file converted successfully!");
    const fileContent = fs.readFileSync(outPath);
    const base64data = fileContent.toString("base64");
    const pdfSrc = `data:application/pdf;base64,${base64data}`;
    const iframeHtml = `<iframe src="${pdfSrc}" width="100%" height="100%" frameborder="0"></iframe>`;
    res.send(iframeHtml);
  });
});
*/

module.exports = router;
