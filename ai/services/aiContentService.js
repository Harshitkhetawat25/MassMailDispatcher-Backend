// Generate both subject and body in a single call using the existing helpers
async function generateFullEmail(userPrompt, emailType = "general") {
  try {
    // Run both generations in parallel for efficiency
    const [subject, body] = await Promise.all([
      generateEmailSubject(userPrompt, emailType),
      generateEmailBody(userPrompt, emailType),
    ]);
    return { subject, body };
  } catch (error) {
    console.error("Gemini API Error (full email):", error);
    throw error;
  }
}
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Use your Gemini API key from environment variables for security
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateEmailBody(userPrompt, emailType = "general") {
  try {
    // Email type specific instructions
    const typeInstructions = {
      marketing:
        "Create a compelling marketing email that drives action. Include a clear call-to-action.",
      welcome: "Write a warm welcome email for new customers or subscribers.",
      promotional:
        "Create a promotional email highlighting offers, discounts, or special deals.",
      newsletter:
        "Write engaging newsletter content that provides value to subscribers.",
      "follow-up":
        "Create a professional follow-up email to maintain engagement.",
      general:
        "Write a professional email suitable for business communication.",
    };

    // Enhanced prompt to ensure email-specific, professional content
    const emailPrompt = `
You are a professional email copywriter specializing in ${emailType} emails. Generate ONLY the email body content based on the following requirements:

Email Type: ${emailType.charAt(0).toUpperCase() + emailType.slice(1)}
User Request: "${userPrompt}"

Specific Instructions: ${
      typeInstructions[emailType] || typeInstructions["general"]
    }

General Requirements:
1. Write in a professional, engaging tone appropriate for ${emailType} emails
2. Create proper email structure with greeting, body, and closing
3. Keep it concise but effective (150-300 words)
4. Use proper email etiquette
5. Make it suitable for business/marketing emails
6. Don't include subject line - only body content
7. Use placeholder format {{fieldname}} where personalization might be needed (e.g., {{name}}, {{company}}, {{email}})
8. Ensure the content is appropriate for mass email campaigns
9. Include a clear call-to-action if relevant to the email type

Generate only the email body content:`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(emailPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// Function to generate subject lines specifically
async function generateEmailSubject(userPrompt, emailType = "general") {
  try {
    const subjectPrompt = `
Generate a compelling email subject line for a ${emailType} email based on this request: "${userPrompt}"

Requirements:
1. Keep it under 60 characters
2. Make it attention-grabbing but professional
3. Avoid spam words
4. Make it relevant to ${emailType} emails
5. Use action words when appropriate

Generate only the subject line (no quotes, no extra text):`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(subjectPrompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

module.exports = {  generateFullEmail };
