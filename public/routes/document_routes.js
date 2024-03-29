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

router.get("/startpage", requireAuth, (req, res) => {
  res.render("startpage");
});

router.get("/home", (request, response) => {
  const filesDirectory = "./files/documents";

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
    response.render("home", { files });
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

router.post("/upload", documentUpload.single("file"), (req, res) => {
  // Check if a file was uploaded
  if (!req.file) {
    console.error("No file uploaded");
    res.status(400).send("No file uploaded");
    return;
  }

  // Get the filename of the uploaded file
  const filename = req.file.filename;

  // Log the successful upload message
  console.log(`File ${filename} uploaded successfully`);

  req.session.message = {
    type: "info",
    message: " Upload Successfully",
  };

  res.redirect("home");
});

router.use(
  "/files/documents",
  express.static(path.join(__dirname, "../../files/documents"))
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

// Recycle Bin
router.get("/recyclebin", (req, res) => {
  const fileName = req.query.file;

  if (!fileName) {
    return res.status(400).send("No file specified for moving to archive");
  }

  const sourceFilePath = path.join(
    __dirname,
    "../../files/documents/",
    fileName
  );
  const destFolderPath = path.join(__dirname, "../../files/archive/");

  fs.rename(sourceFilePath, path.join(destFolderPath, fileName), (err) => {
    if (err) {
      console.error(`Error moving file ${fileName} to archive: ${err}`); // Use fileName here
      return res.status(500).send("Error moving file to archive");
    }

    console.log(`File ${fileName} moved to archive successfully`); // Use fileName here
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
    const user = await UserDocuments.findOne({ name });

    if (!user) {
      return res.redirect("/employeedocument");
    }

    const employeefiles = "./files/employeedocument";
    // Retrieve file names from the user's "fileName" field
    const fileNames = user.fileName; // Corrected field name

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
    res.render("openfolder", { user, files });
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post(
  "/uploaddocument",
  employeeUpload.single("file"),
  async (req, res) => {
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

      res.redirect(`/openfolder/${name}`);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

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
