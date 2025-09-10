const User = require("../model/userModel");

const getCurrentUser = async (req, res) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ message: "Email not verified." });
  }
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

module.exports = { getCurrentUser };

// Update user name
const updateName = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.name = req.body.name;
    await user.save();
    res.status(200).json({ message: "Name updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Change password
const bcrypt = require("bcrypt");
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Old password is incorrect" });
    if (!newPassword || newPassword.length < 8)
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports.updateName = updateName;
module.exports.changePassword = changePassword;
