const express = require("express");
const router = express.Router();
const multer = require("multer");
const logincollections = require("../models/logincollections");
const fs = require("fs");
const path = require("path");
const docxConverter = require("docx-pdf");
const bcrypt = require("bcrypt");

// Models
const LogInCollection = require("../models/logincollections");
const UserVerification = require("../models/UserVerification");

// Email Handler
const nodemailer = require("nodemailer");

// Unique String
const { v4: uuidv4 } = require("uuid");

// env variable
require("dotenv").config();

// NodeMailer
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASSWORD,
  },
});

// Testing
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Server lit af, ready for email");
  }
});

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

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: storage,
}).single("image");

// Insert an account into the database route

router.post("/addacc", upload, async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      hrrole: req.body.hrrole || "NOROLE",
      image: req.file.filename,
    };

    // Insert data into the LogInCollection
    await LogInCollection.insertMany([data]);

    // Set success message in session
    req.session.message = {
      type: "SUCCESS",
      message: " User added successfully",
    };

    // Redirect to manage_accounts page
    return res.redirect("/manage_accounts");
  } catch (error) {
    // Set error message in session
    req.session.message = {
      type: "DANGER",
      message: error.message,
    };
    // Redirect to the previous page or an error page
    return res.redirect("back");
  }
});

router.get("/", (req, res) => {
  res.render("login");
});
router.get("/login", (req, res) => {
  http: res.render("login");
});

// Signup route
router.post("/signup", multer().single("image"), async (req, res) => {
  try {
    const { name, email, password, hrrole } = req.body;

    // Validate input data
    if (!name || !email || !password || !hrrole) {
      return res.status(400).json({
        status: "FAILED",
        message: "All fields are required.",
        type: "DANGER",
      });
    } else if (!/^[a-zA-Z0-9]+$/.test(name)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Name can only contain letters and numbers.",
        type: "DANGER",
      });
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return res.status(400).json({
        status: "FAILED",
        message: "Invalid email address.",
        type: "DANGER",
      });
    } else if (password.length < 8) {
      return res.status(400).json({
        status: "FAILED",
        message: "Password must be at least 8 characters long.",
        type: "DANGER",
      });
    }

    const existingUser = await LogInCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "FAILED",
        message: "Email already exists.",
        type: "DANGER",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new LogInCollection({
      name,
      email,
      password: hashedPassword,
      hrrole,
      verified: false,
    });

    const savedUser = await newUser.save();
    if (!savedUser) {
      throw new Error("Failed to save user data.");
    }

    // Send verification email
    await sendVerificationEmail(savedUser, res);

    res.redirect("/login");
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({
      status: "FAILED",
      message: "An error occurred during user creation.",
      type: "DANGER",
    });
  }
});

// Send Verification Email
const sendVerificationEmail = async (user, res) => {
  try {
    const { _id, email } = user;
    const currentUrl = "http://localhost:5000";
    const uniqueString = uuidv4() + _id;

    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Email Verification",
      html: `<p>Please click the below link to verify your email</p><p>This link <b>expires in 6 hours</b>.</p><p> Press <a href=${currentUrl}/user/verify/${_id}/${uniqueString}>here</a> to continue</p>`,
    };

    const saltRounds = 10;
    const hashUniqueString = await bcrypt.hash(uniqueString, saltRounds);

    const newUserVerification = new UserVerification({
      userId: _id,
      uniqueString: hashUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6 hours expiration time
    });

    await newUserVerification.save();
    await transporter.sendMail(mailOptions);
    console.log("Email sent, Check Email for verification link");
  } catch (error) {
    console.log("Couldn't send verification email ", error);
    res.status(500).json({
      status: "FAILED",
      message: "Couldn't send verification email.",
      type: "DANGER",
    });
  }
};

// Verify Email
router.get("/user/verify/:userId/:uniqueString", async (req, res) => {
  try {
    const { userId, uniqueString } = req.params;

    const verificationRecord = await UserVerification.findOne({ userId });
    if (!verificationRecord) {
      throw new Error("Account not found. Please try again.");
    }

    const { expiresAt, uniqueString: hashedUniqueString } = verificationRecord;

    if (expiresAt < Date.now()) {
      // Link has expired
      await UserVerification.deleteOne({ userId });
      await LogInCollection.deleteOne({ _id: userId });
      throw new Error("Link has expired. Please try again.");
    }

    // Compare hashed uniqueString
    const result = await bcrypt.compare(uniqueString, hashedUniqueString);
    if (result) {
      // Unique string matches
      await LogInCollection.updateOne({ _id: userId }, { verified: true });
      await UserVerification.deleteOne({ userId });
      res.sendFile(path.join(__dirname, "../templates/verified.html"));
    } else {
      // Invalid verification details
      throw new Error("Invalid verification details. Check your inbox.");
    }
  } catch (error) {
    console.error("Error occurred during email verification:", error.message);
    const message = error.message || "Something went wrong. Please try again.";
    res.redirect(`/user/verified/error=true&message=${message}`);
  }
});

// Verified page route
router.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "../templates/verified.html"));
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body; // Destructure email and password from req.body

  try {
    if (!email || !password) {
      console.log("Please enter email and password");
      return res.status(400).json({ error: "Please enter email and password" });
    }

    const user = await LogInCollection.findOne({ email }); // Find user by email

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.verified) {
      console.log("User is not verified");
      res.redirect("login");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password); // Compare hashed password

    if (isPasswordValid) {
      console.log("Login Successful");
      res.redirect("/startpage"); // Redirect to start page on successful login
    } else {
      console.log("Invalid Password");
      return res.status(401).json({ error: "Invalid Password" });
    }
  } catch (err) {
    console.log("Error occurred while logging in:");
    console.log(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all users route
router.get("/manage_accounts", async (req, res) => {
  try {
    const logincollections = await LogInCollection.find();
    res.render("manage_accounts", { logincollections });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// Route pages
router.get("/home", (request, response) => {
  const filesDirectory = "./files/documents";

  try {
    const fileNames = fs.readdirSync(filesDirectory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(filesDirectory, fileName);
      const stats = fs.statSync(filePath);
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
        mtime: mtime,
      };
    });

    // Pass the files data to the "/home" route
    response.render("home", { files });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/archive", (request, response) => {
  const filesDirectory = "./files/archive";

  try {
    const fileNames = fs.readdirSync(filesDirectory);
    const files = fileNames.map((fileName) => {
      const filePath = path.join(filesDirectory, fileName);
      const stats = fs.statSync(filePath);
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
        mtime: mtime,
      };
    });

    // Pass the files data to the "/home" route
    response.render("archive", { files });
  } catch (error) {
    console.error("Error reading directory:", error);
  }
});

router.get("/startpage", (request, response) => {
  response.render("startpage");
});

router.get("/login", (request, response) => {
  response.render("login");
});

router.get("/role/role1", (request, response) => {
  response.render("role1");
});

router.get("/addacc", (req, res) => {
  res.render("addacc");
});

router.get("/hris", (req, res) => {
  res.render("hris");
});

// Edit a user
router.get("/edit/:id", async (req, res) => {
  try {
    let id = req.params.id;
    let logincollections = await LogInCollection.findById(id);

    if (!logincollections) {
      // If the user account doesn't exist, redirect to manage_accounts page
      return res.redirect("/manage_accounts");
    }

    // Render the edit_users template with the retrieved user data
    res.render("edit_users", {
      title: "Edit Account",
      logincollections: logincollections,
    });
  } catch (err) {
    // Log and handle errors gracefully
    console.error("Error editing user account:", err);
    // Redirect to manage_accounts page in case of an error
    res.redirect("/manage_accounts");
  }
});

// Update a user
router.post("/update/:id", upload, async (req, res) => {
  try {
    let id = req.params.id;
    let new_image = "";

    if (req.file) {
      new_image = req.file.filename;
      try {
        // Delete old image if a new image is uploaded
        fs.unlinkSync("./files/" + req.body.old_image);
      } catch (err) {
        console.error(err);
        // If an error occurs during file deletion, it shouldn't affect the update process
      }
    } else {
      new_image = req.body.old_image;
    }

    // Update user information in the database
    const result = await LogInCollection.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        hrrole: req.body.hrrole,
        image: new_image,
      },
      { new: true } // Return the modified document after update
    );

    if (!result) {
      return res.json({ message: "User not found", type: "DANGER" });
    }

    req.session.message = {
      type: "SUCCESS",
      message: " User updated successfully",
    };
    // Redirect after successful update
    return res.redirect("/manage_accounts");
  } catch (err) {
    console.error(err);
    // Handle errors and provide a response
    return res.json({ message: err.message, type: "DANGER" });
  }
});

// Delete a user
router.get("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await LogInCollection.findByIdAndDelete(id);

    if (result && result.image !== "") {
      try {
        fs.unlinkSync("./files/" + result.image);
      } catch (err) {
        console.error(err);
      }
    }

    req.session.message = {
      type: "info",
      message: " User deleted successfully",
    };

    res.redirect("/manage_accounts");
  } catch (err) {
    console.error(err);
    res.json({ message: err.message, type: "danger" });
  }
});

// Document Tracker routes

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
router.get("/recyclebin/:fileName", (req, res) => {
  const fileName = req.params.fileName; // Use req.params.fileName for route parameters

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
