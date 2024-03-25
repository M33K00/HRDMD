require("dotenv").config();
const csurf = require("tiny-csrf");
const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 4000;
const templatePath = path.join(__dirname, "../templates");
const layoutPath = path.join(__dirname, "../templates/layouts");
const publicPath = path.join("public");

app.use(express.static(publicPath));
app.use(express.static("files"));
app.use(express.static("files/documents"));
app.use(express.static("files/images"));

// Production mode static files
app.use(express.static("resources/app/public"));
app.use(express.static("resources/app/files"));
app.use(express.static("resources/app/files/documents"));

app.set("view engine", "ejs");
app.set("views", templatePath);

// Middleware for parsing JSON request bodies
app.use(express.json());

// CSRF middleware
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("cookie-parser-secret"));
app.use(
  session({
    secret: "chiharu is a cat",
    resave: false, // Set resave option explicitly to false
    saveUninitialized: true, // Set saveUninitialized to true or false based on your needs
  })
);

app.use(
  csurf(
    "123456789iamasecret987654321look", // secret -- must be 32 bits or chars in length
    ["/addacc", "/update", "/edit", "/login"], // URLS we want to exclude from CSRF protection
    ["POST"] // the request methods we want CSRF protection for
  )
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

// Route prefix
app.use("", require("../routes/routes"));
app.use("", require("../routes/document_routes.js"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
  res.status(500).send("Something broke!"); // Respond with a generic error message
});

mongoose.connect("mongodb://0.0.0.0:27017/HRDMD");

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.on("open", () => console.log("Connected to the Database"));

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
