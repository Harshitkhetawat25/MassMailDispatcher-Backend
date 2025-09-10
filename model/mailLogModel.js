const mongoose = require("mongoose");

const mailLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  recipient: String,
  subject: String,
  status: { type: String, enum: ["success", "failed"] },
  error: String,
  sentAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MailLog", mailLogSchema);
