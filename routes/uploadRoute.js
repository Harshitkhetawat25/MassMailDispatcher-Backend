const express = require("express");
const {
  upload,
  uploadCsv,
  deleteCsv,
} = require("../controllers/uploadController");
const uploadRouter = express.Router();
const isAuth = require("../middleware/isAuth");

// POST /api/upload/csv
uploadRouter.post("/csv", isAuth, upload.single("csv"), uploadCsv);
// DELETE /api/upload/deletecsv/:id
uploadRouter.delete("/deletecsv/:id", isAuth, deleteCsv);

module.exports = uploadRouter;
