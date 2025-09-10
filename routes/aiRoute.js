const express = require("express");
const { generateFullEmailController } = require("../controllers/aiController");
const isAuth = require("../middleware/isAuth");
const router = express.Router();

router.post("/generate-full-email", isAuth, generateFullEmailController);

module.exports = router;
