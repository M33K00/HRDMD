const jwt = require("jsonwebtoken");
const logincollections = require("../models/logincollections");

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
        res.locals.user = user;
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
  if (user.hrrole === "ROLE 1") {
    return res.redirect("/role1");
  } else if (res.hrrole === "ROLE 2") {
    return res.redirect("/role2");
  } else if (user.hrrole === "ROLE 3") {
    return res.redirect("/role3");
  } else if (user.hrrole === "ROLE 4") {
    return res.redirect("/role4");
  } else {
    next();
  }
};

const checkRoleHR = (req, res, next) => {
  const user = res.locals.user;
  if (user.hrrole === "ROLE 1") {
    return res.redirect("/role1");
  } else if (user.hrrole === "ROLE 2") {
    return res.redirect("/role2");
  } else if (user.hrrole === "ROLE 3") {
    return res.redirect("/role3");
  } else if (user.hrrole === "ROLE 4") {
    return res.redirect("/role4");
  } else {
    next();
  }
}

module.exports = { requireAuth, checkUser, checkRole, checkRoleHR };
