const User = require("../model/userModel");

const addTemplate = async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const template = { name, subject, body };
    user.templates.push(template);
    await user.save();

    // Return the last added template
    res.status(201).json(user.templates[user.templates.length - 1]);
  } catch (error) {
    res.status(500).json(error);
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.templates = user.templates.filter(
      (t) => t._id?.toString() !== id && t.id !== id
    );

    await user.save();

    res.status(200).json({ message: "Template deleted", id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;
    const user = await User.findById(req.user._id);
    const template = user.templates.id(id);
    template.name = name;
    template.subject = subject;
    template.body = body;
    await user.save();
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = { addTemplate, deleteTemplate, updateTemplate };
