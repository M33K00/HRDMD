let passport = require("passport");
let logincollection = require("../models/logincollections");
let LocalStrategy = require("passport-local").Strategy;

// Serialize and deserialize user (session management)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  logincollection.findById(id, (err, user) => {
    done(err, user);
  });
});

// Passport local strategy setup
passport.use(
  new LocalStrategy((email, password, done) => {
    logincollection.findOne({ email: email }, (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect email." });
      }
      if (!user.isValidPassword(password)) {
        return done(null, false, { message: "Incorrect password." });
      }
      return done(null, user);
    });
  })
);

module.exports = passport;
