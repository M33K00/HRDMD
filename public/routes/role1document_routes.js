const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const docxConverter = require("docx-pdf");
const LogInCollection = require("../models/logincollections");
const UserDocuments = require("../models/userdocuments");
const { requireAuth } = require("../middleware/authMiddleware");

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

router.get("/role1", (request, response) => {
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;
  const roleDirectories = [
    { name: "Entry Level", path: "./files/role1" },
    { name: "Individual Contributors", path: "./files/role2" },
  ];

  try {
    function getFilesInfo(directory) {
      const fileNames = fs.readdirSync(directory.path); // Use directory.path to get the directory path
      const filesInfo = fileNames.map((fileName) => {
        const filePath = path.join(directory.path, fileName); // Use directory.path here too
        const stats = fs.statSync(filePath);
        const sizeInBytes = stats.size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        // Convert mtime to desired format
        const mtime = stats.mtime.toLocaleString("en-US", {
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
          folder: directory.name,
        };
      });
      return filesInfo;
    }

    const allRoleFiles = roleDirectories.reduce((allFiles, directory) => {
      const roleFiles = getFilesInfo(directory);
      return allFiles.concat(roleFiles);
    }, []);

    // Pass the files data to the "/statusboard" route
    response.render("role/role1_temps/role1", {
      allRoleFiles,
      role1directory_length,
      role2directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

// Role1 Documents
router.get("/role1_docu", (req, res) => {
  const role1directory = "./files/role1";
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
      };
    });

    // Pass the files data to the "/role1_documents" route
    res.render("role/role1_docu", {
      files,
      role1directory_length,
      role2directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/role2_docu", (req, res) => {
  const role2directory = "./files/role2";
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
      };
    });

    // Pass the files data to the "/role1_documents" route
    res.render("role/role2_docu", {
      files,
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

module.exports = router;
