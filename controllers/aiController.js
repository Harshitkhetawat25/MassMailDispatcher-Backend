const {
  generateFullEmail,
} = require("../ai/services/aiContentService");
// Generate both subject and body in a single call
const generateFullEmailController = async (req, res) => {
  const { prompt, emailType = "general" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });
  try {
    const { subject, body } = await generateFullEmail(prompt, emailType);
    res.json({ subject, body });
  } catch (err) {
    res
      .status(500)
      .json({ error: "AI full email generation failed", details: err.message });
  }
};

module.exports = { generateFullEmailController };
