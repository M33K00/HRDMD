const HRSettings = require("../models/hrsettings");

const checkHRSettings = async (req, res, next) => {
    req.models = { HRSettings };
    next()
};

module.exports = { checkHRSettings }