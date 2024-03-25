const checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.currentUser = req.user; // store user object in locals
  }
  next();
};

module.exports = { checkLoggedIn };
