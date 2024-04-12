const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const docxConverter = require("docx-pdf");
const LogInCollection = require("../models/logincollections");
const UserDocuments = require("../models/userdocuments");
const rejectedDocuments = require("../models/rejecteddocuments");
const { requireAuth } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/authMiddleware.js");

router.get("/startpage", requireAuth, (req, res) => {
  res.render("startpage");
});

router.get("/home", checkRole, (request, response) => {
  const rejecteddirectory_length = fs.readdirSync("./files/rejected").length;
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;
  const roleDirectories = [
    { name: "Entry Level", path: "./files/role1" },
    { name: "Individual Contributors", path: "./files/role2" },
    { name: "HR Manager", path: "./files/role3" },
    { name: "HR Director", path: "./files/role4" },
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

    response.render("home", {
      allRoleFiles,
      rejecteddirectory_length,
      role1directory_length,
      role2directory_length,
      role3directory_length,
      role4directory_length,
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

router.get("/role1_documents", (req, res) => {
  const role1directory = "./files/role1";
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
      };
    });

    // Pass the files data to the "/role1_documents" route
    res.render("role1_documents", {
      files,
      role1directory_length,
      role2directory_length,
      role3directory_length,
      role4directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/role2_documents", (req, res) => {
  const role2directory = "./files/role2";
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;

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
    res.render("role2_documents", {
      files,
      role1directory_length,
      role2directory_length,
      role3directory_length,
      role4directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/role3_documents", (req, res) => {
  const role3directory = "./files/role3";
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;

  try {
    const fileNames = fs.readdirSync(role3directory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(role3directory, fileName);
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
    res.render("role3_documents", {
      files,
      role1directory_length,
      role2directory_length,
      role3directory_length,
      role4directory_length,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/role4_documents", (req, res) => {
  const role4directory = "./files/role4";
  const role1directory_length = fs.readdirSync("./files/role1").length;
  const role2directory_length = fs.readdirSync("./files/role2").length;
  const role3directory_length = fs.readdirSync("./files/role3").length;
  const role4directory_length = fs.readdirSync("./files/role4").length;

  try {
    const fileNames = fs.readdirSync(role4directory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(role4directory, fileName);
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
    res.render("role4_documents", {
      files,
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
router.get("/statusboard", (request, response) => {
  const roleDirectories = [
    { name: "Rejected", path: "./files/rejected" },
    { name: "Entry Level", path: "./files/role1" },
    { name: "Individual Contributors", path: "./files/role2" },
    { name: "HR Manager", path: "./files/role3" },
    { name: "HR Director", path: "./files/role4" },
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
    response.render("statusboard", {
      allRoleFiles,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
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

// Route to download files

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

router.get("/download/:fileName", (request, response) => {
  const fileName = request.params.fileName;
  const filePath = path.join(__dirname, "../../files/documents", fileName);
  response.download(filePath);
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

// Rename File
router.post("/rename", (req, res) => {
  const { file: oldFileName, newName } = req.body;

  if (!oldFileName || !newName) {
    return res
      .status(400)
      .json({ error: "Both oldFileName and newName are required." });
  }

  const fileExtension = path.extname(oldFileName);
  const oldPath = path.join(__dirname, "../../files/documents", oldFileName);
  const newPath = path.join(
    __dirname,
    "../../files/documents",
    `${newName}${fileExtension}`
  );

  if (!fs.existsSync(oldPath)) {
    return res.status(404).json({ error: "File not found." });
  }

  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      console.error("Error renaming file:", err);
      return res.status(500).json({ error: "Error renaming file." });
    }

    console.log("\nFile Renamed!\n");
    res.json({ success: true, message: "File renamed successfully." });
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

module.exports = router;
