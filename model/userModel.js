const { Schema, model } = require("mongoose");

const templateSchema = new Schema(
  {
    name: String,
    subject: String,
    body: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  files: [
    {
      fileId: String, // Cloudinary public_id
      fileName: String,
      fileUrl: String, // Cloudinary secure_url
      rowCount: Number,
      uploadDate: { type: Date, default: Date.now },
    },
  ],
  templates: [templateSchema],
  googleTokens: {
    accessToken: String,
    refreshToken: String,
    expiryDate: Date,
    scope: String,
  },
  isVerified:{
    type:Boolean,
    default:false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

const User = model("User", userSchema);

module.exports = User;
