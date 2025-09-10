const express = require("express");
const { sendMassEmails } = require("../controllers/emailController");
const isAuth = require("../middleware/isAuth");

const router = express.Router();

// Send mass emails using Gmail API
router.post("/send-mass", isAuth, sendMassEmails);

module.exports = router;
