const express = require("express");
const isAuth = require("../middleware/isAuth");
const mailLogController = require("../controllers/mailLogController");
const router = express.Router();

router.get("/logs", isAuth, mailLogController );

module.exports = router;