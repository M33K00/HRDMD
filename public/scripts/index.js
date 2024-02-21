require("dotenv").config();
const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const wax = require("wax-on");
const path = require("path");
const ejse = require("ejs-electron");
const hbs = require("hbs");
const mongoose = require("mongoose");
const { request } = require("http");

const PORT = process.env.PORT || 4000;
const templatePath = path.join(__dirname, "../templates");
const layoutPath = path.join(__dirname, "../templates/layouts");
const publicPath = path.join("public");

wax.on(hbs.handlebars);
wax.setLayoutPath(layoutPath);

app.use(express.static(publicPath));
app.use(express.static("files"));
app.set("view engine", "hbs");
app.set("view engine", "ejs");
app.set("views", templatePath);
app.use(express.urlencoded({ extended: false }));

// middlewares
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(
  session({
    secret: "himitsu key",
    saveUninitialized: true,
    resave: false,
  })
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

mongoose.connect(process.env.DB_URI);

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.on("open", () => console.log("Connected to the Database"));

// route prefix
app.use("", require("../routes/routes"));

app.listen(PORT, () => {
  console.log(`Server started at http://localhost:${PORT}`);
});
