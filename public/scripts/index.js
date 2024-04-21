const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const { checkUser } = require("../middleware/authMiddleware.js");

const PORT =  3939;
const templatePath = path.join(__dirname, "../templates");
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

// Middleware
app.use(express.json());
app.use(cookieParser());

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

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

// Route prefix
app.get("*", checkUser);
app.use("", require("../routes/routes"));
app.use("", require("../routes/document_routes.js"));
app.use("", require("../routes/upload_routes.js"));
app.use("", require("../routes/role1document_routes.js"));
app.use("", require("../routes/role1routes.js"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack trace
  res.contentType("image/png");

  fs.readFile("./public/images/kys.png", (err, data) => {
    if (err) {
      console.error("pati image ayaw mag load bubu", err);
      res.status(404).send("Kasalanan to ni Strike");
    } else {
      res.send(data);
    }
  });
});

mongoose.connect("mongodb://0.0.0.0:27017/HRDMD");

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.on("open", () => console.log("Connected to the Database"));

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
