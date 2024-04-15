const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const rejectedDocuments = require("../models/rejecteddocuments");
const UserDocuments = require("../models/userdocuments");
const { checkRole } = require("../middleware/authMiddleware");

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
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
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
        const timestamp = stats.mtime.getTime();
        return {
          name: fileName,
          size: sizeInMB + " MB",
          mtime: mtime,
          timestamp: timestamp,
          folder: directory.name,
        };
      });
      return filesInfo;
    }

    const allRoleFiles = roleDirectories.reduce((allFiles, directory) => {
      const roleFiles = getFilesInfo(directory);
      return allFiles.concat(roleFiles);
    }, []);

    const currentDate = new Date();

    const groupTimestamps = [
      new Date(
        currentDate.getFullYear(), // This Year
        currentDate.getMonth(), // This Month
        1 // Day 1
      ).getTime(),
      new Date(
        currentDate.getFullYear(), // This Year
        currentDate.getMonth() - 1, // Last Month
        1 // Day 1
      ).getTime(),
      new Date(
        currentDate.getFullYear(), // This Year
        currentDate.getMonth() - 2, // Last 2 Months
        1 // Day 1
      ).getTime(),
      new Date(
        currentDate.getFullYear(), // This Year
        currentDate.getMonth() - 3, // Last 3 Months
        1 // Day 1
      ).getTime(),
    ];

    // Each groupTimestamp represents the earlier boundary of a group
    // eg.
    //   This Month (groupName 0) is from day 1 of this month (groupTimestamp 0) until present
    //   Last Month (groupName 1) is from day 1 of last month (groupTimestamp 1) until day 1 of this month (groupTimestamp 0)
    //   ...

    // Present
    //  |
    //  | Group 0 (This Month)
    //  |
    // groupTimestap 0 (Day 1 of this month)
    //  |
    //  | Group 1 (Last Month)
    //  |
    // groupTimestap 1 (Day 1 of last month)
    // ...

    // Put files into groups

    const groupFiles = [];

    for (var gago in groupTimestamps) {
      groupFiles.push([]);
    }

    const lastGroup = [];

    groupFiles.push(lastGroup);

    for (var file of allRoleFiles) {
      const fileTimestamp = file.timestamp;

      // Hacky way to use some()
      // some() will terminate once true is returned by the iteration function,
      // and return true itself if it does

      groupFound = groupTimestamps.some(function (groupTimestamp, i) {
        if (fileTimestamp >= groupTimestamps[i]) {
          // If a file is newer than a group timestamp,
          // add that to the corresponding group
          groupFiles[i].push(file);
          // And return true to terminate the some() loop and make `groupFound` true as well
          return true;
        }
        // If file is older, return false or whatever the fuck to check the next timestamp
        return false;
      });

      if (!groupFound) {
        // If a file didn't belong to a group,
        // add it to the last group "Older Than Your Mom"
        lastGroup.push(file);
      }
    }

    filesThisMonth = groupFiles[0];
    filesLastMonth = groupFiles[1];
    filesLastTwoMonths = groupFiles[2];
    filesLastThreeMonths = groupFiles[3];
    filesOlderThanThreeMonths = groupFiles[4];

    response.render("role/role1_temps/role1", {
      allRoleFiles,
      rejecteddirectory_length,
      role1directory_length,
      role2directory_length,
      filesOlderThanThreeMonths,
      filesLastThreeMonths,
      filesLastTwoMonths,
      filesLastMonth,
      filesThisMonth,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
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
router.get("/statusboard-r1", (request, response) => {
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
    response.render("role/role1_temps/statusboard-r1", {
      allRoleFiles,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

module.exports = router;
