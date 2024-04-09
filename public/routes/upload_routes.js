const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
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

const documentUpload = multer({ storage: documentStorage });

const role1storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./files/role1");
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname;
    cb(null, fileName); // Use the original filename without any modifications
  },
});

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

module.exports = router;
