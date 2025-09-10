const cloudinary = require("../configs/cloudinary");
const multer = require("multer");
const streamifier = require("streamifier");
const csv = require("csv-parser");
const https = require("https");
const User = require("../model/userModel");

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

// Helper: Row count from Cloudinary URL
function getRowCount(fileUrl) {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    https.get(fileUrl, (response) => {
      response
        .pipe(csv())
        .on("data", () => rowCount++)
        .on("end", () => resolve(rowCount))
        .on("error", reject);
    });
  });
}

// Main Upload CSV
const uploadCsv = async (req, res) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ message: "Email not verified." });
  }
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 1. Upload file to Cloudinary
    const result = await new Promise((resolve, reject) => {
      let stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: `csv_uploads/${req.user._id}`,
          public_id: `csv_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // 2. Count rows from CSV
    const rowCount = await getRowCount(result.secure_url);

    // 3. Save file info in user DB
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          files: {
            fileId: result.public_id,
            fileName: req.file.originalname,
            fileUrl: result.secure_url,
            rowCount: rowCount,
          },
        },
      },
      { new: true }
    );

    // 4. Send response
    res.status(200).json({
      message: "File uploaded successfully",
      file: {
        fileId: result.public_id,
        fileName: req.file.originalname,
        fileUrl: result.secure_url,
        rowCount,
      },
      files: updatedUser.files, // all user files
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
};
// Delete CSV
const deleteCsv = async (req, res) => {
  try {
    const { id } = req.params; // id = Cloudinary public_id
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove from Cloudinary with detailed error logging

    try {
      const result = await cloudinary.uploader.destroy(id, {
        resource_type: "raw",
      });
      console.log("Cloudinary destroy result:", result);
      if (result.result !== "ok" && result.result !== "not found") {
        console.error("Cloudinary destroy error: ", result);
        return res
          .status(404)
          .json({
            message: "Cloudinary file not found or could not be deleted",
            cloudinaryResult: result,
          });
      }
      // If result is 'ok' or 'not found', proceed to remove from DB
    } catch (cloudErr) {
      console.error("Cloudinary destroy threw error:", cloudErr);
      return res
        .status(500)
        .json({ message: "Cloudinary error", error: cloudErr.message });
    }

    // Remove from user's files array
    user.files = user.files.filter((f) => f.fileId !== id);
    await user.save();

    res.status(200).json({ message: "CSV deleted", id });
  } catch (error) {
    console.error("Delete CSV error:", error);
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
};

module.exports = { upload, uploadCsv, deleteCsv };
