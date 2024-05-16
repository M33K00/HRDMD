const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const rejectedDocuments = require("../models/rejecteddocuments");
const { requireAuth } = require("../middleware/authMiddleware");

const employeeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/employeedocument");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const employeeUpload = multer({ storage: employeeStorage });

const role1storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/role1");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const rejectedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/rejected");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const rejectedUpload = multer({ storage: rejectedStorage });

const role1Upload = multer({ storage: role1storage });

const role2storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/role2");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const role2Upload = multer({ storage: role2storage });

const role3storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/role3");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const role3Upload = multer({ storage: role3storage });

const role4storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/role4");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

const role4Upload = multer({ storage: role4storage });

router.post("/role1upload", role1Upload.single("file"), (req, res) => {
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

  res.redirect(req.originalUrl);
});

router.post("/role2upload", role2Upload.single("file"), (req, res) => {
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

  res.redirect(req.originalUrl);
});

router.post("/role3upload", role3Upload.single("file"), (req, res) => {
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

  res.redirect(req.originalUrl);
});

router.post("/role4upload", role4Upload.single("file"), (req, res) => {
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

  res.redirect(req.originalUrl);
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

// Reject Document
router.get(
  "/reject_document/:fileName/:hrrole/:name",
  rejectedUpload.single("file"),
  async (req, res) => {
    const fileName = req.params.fileName;
    const hrrole = req.params.hrrole;
    const name = req.params.name;

    console.log("file:", fileName, "hrrole:", hrrole, "name:", name);

    try {
      if (!fileName) {
        console.error("No file provided");
        res.status(400).send("No file name provided");
        return;
      }
      if (!hrrole) {
        console.error("No HR role provided");
        res.status(400).send("No HR role provided");
        return;
      }
      if (!name) {
        console.error("No name provided");
        res.status(400).send("No name provided");
        return;
      }

      const rejectedDoc = new rejectedDocuments({
        fileName: fileName,
        hrrole: hrrole,
        name: name,
      });

      // Save the rejected document to the database
      await rejectedDoc.save();

      console.log(`File ${fileName} rejected successfully`);

      res.redirect(`/rejectfile-r1/${fileName}`);
    } catch (err) {
      console.log("Error rejecting file: ", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Reject Bin
router.get("/rejectfile-r1/:fileName", (req, res) => {
  const fileName = req.params.fileName;

  if (!fileName) {
    return res.status(400).send("No file specified for moving to archive");
  }

  const sourceFilePath = path.join(__dirname, "../../files/role1/", fileName);
  const destFolderPath = path.join(__dirname, "../../files/rejected/");

  fs.rename(sourceFilePath, path.join(destFolderPath, fileName), (err) => {
    if (err) {
      console.error(`Error moving file ${fileName} to archive: ${err}`); // Use fileName here
      return res.status(500).send("Error moving file to archive");
    }

    console.log(`File ${fileName} moved to rejected folder successfully`); // Use fileName here
    req.session.message = {
      type: "info",
      message: "File Rejected",
    };
    res.redirect("/role1_docu");
  });
});

module.exports = router;
