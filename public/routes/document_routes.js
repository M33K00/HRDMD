const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const docxConverter = require("docx-pdf");
const logincollections = require("../models/logincollections");
// const { checkLoggedIn } = require("../middleware/authMiddleware");

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

// router.get("/startpage", checkLoggedIn, (req, res) => {
//   if (res.locals.currentUser) {
//     res.render("startpage", { logincollections: res.locals.currentUser });
//   } else {
//     res.redirect("/login");
//   }
// });

router.get("/startpage", (req, res) => {
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
    const filePath = path.join(__dirname, "../../files/documents/", filename);
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

module.exports = router;
