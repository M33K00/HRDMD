const jwt = require("jsonwebtoken");
const logincollections = require("../models/logincollections");
const Attendance = require("../models/attendance");
const HRSettings = require("../models/hrsettings");

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  // check if json web token exists and is verified
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect("/login");
      } else {
        next();
      }
    });
  } else {
    res.redirect("/login");
  }
};

// check current user
const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.locals.user = null;
        next();
      } else {
        let user = await logincollections.findById(decodedToken.id);
        let userAttendance = await Attendance.findOne({
          email: user.email,
        })
        res.locals.user = user;
        res.locals.userAttendance = userAttendance;
        res.locals.hrsettings = await HRSettings.findOne({});
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

const checkRole = (req, res, next) => {
  const user = res.locals.user;
  if (user.department === "HR Department" && user.hrrole != "ADMIN") {
    res.redirect("/role1");
  } else {
   next();
  }
};

const checkRoleHR = (req, res, next) => {
  const user = res.locals.user;
  if (user.hrrole === "ROLE 1") {
    res.redirect("/hris_user");
  } else if (user.hrrole === "ROLE 2") {
    res.redirect("/role2");
  } else if (user.hrrole === "ROLE 3") {
    res.redirect("/role3");
  } else if (user.hrrole === "ROLE 4") {
    res.redirect("/role4");
  } else {
    next();
  }
};

module.exports = {
  requireAuth,
  checkUser,
  checkRole,
  checkRoleHR,
};
