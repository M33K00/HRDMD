require("dotenv").config();
const mongoose = require("mongoose");
const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.DB_URI);

const db = mongoose.connection;
db.on("error", (error) => console.log(error));
db.on("open", () => console.log("Connected to the Database"));
