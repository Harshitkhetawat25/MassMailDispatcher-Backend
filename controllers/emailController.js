const { google } = require("googleapis");
const User = require("../model/userModel");
const MailLog = require("../model/mailLogModel");
const nodemailer = require("nodemailer");

// Create Gmail API client for user
const createGmailClient = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
};

const sendMassEmails = async (req, res) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ message: "Email not verified." });
  }
  try {
    const { csvFileId, subject, body } = req.body;
    const userId = req.user.id;
    if (!csvFileId || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has Gmail permissions
    if (!user.googleTokens || !user.googleTokens.accessToken) {
      return res.status(400).json({
        success: false,
        message:
          "Gmail permissions required. Please login with Google to send emails from your account.",
      });
    }

    // Check if token is expired
    if (user.googleTokens.expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Gmail token expired. Please login with Google again.",
      });
    }

    const csvFile = user.files.find((file) => file.fileId === csvFileId);
    if (!csvFile) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const response = await fetch(csvFile.fileUrl);
    const csvText = await response.text();
    const lines = csvText.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });

    const batchSize = 10;
    const delay = 1000;
    const gmail = createGmailClient(user.googleTokens.accessToken);
    let successCount = 0;
    let failedCount = 0;
    let failedEmails = [];

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const emailPromises = batch.map(async (row) => {
        let logData = {
          user: userId,
          recipient:
            row[headers.find((h) => h.toLowerCase().includes("email"))] ||
            "Unknown",
          subject,
          sentAt: new Date(),
        };
        try {
          let personalizedSubject = subject;
          let personalizedBody = body;

          // Replace placeholders with actual data
          headers.forEach((header) => {
            const placeholder = `{{${header}}}`;
            const value = row[header] || "";
            personalizedSubject = personalizedSubject.replace(
              new RegExp(placeholder, "g"),
              value
            );
            personalizedBody = personalizedBody.replace(
              new RegExp(placeholder, "g"),
              value
            );
          });

          const emailField = headers.find((header) =>
            header.toLowerCase().includes("email")
          );
          if (!emailField || !row[emailField])
            throw new Error("No email address found");

          // Create email in Gmail API format
          const email = [
            `To: ${row[emailField]}`,
            `Subject: ${personalizedSubject}`,
            'Content-Type: text/html; charset="UTF-8"',
            "",
            personalizedBody.replace(/\n/g, "<br>"),
          ].join("\n");

          const encodedEmail = Buffer.from(email).toString("base64url");

          await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: encodedEmail,
            },
          });
          successCount++;
          logData.status = "success";
          logData.error = "";
        } catch (error) {
          failedCount++;
          failedEmails.push({
            email:
              row[headers.find((h) => h.toLowerCase().includes("email"))] ||
              "Unknown",
            error: error.message,
          });
          logData.status = "failed";
          logData.error = error.message;
        }
        // Save log for each email
        try {
          await MailLog.create(logData);
        } catch (logErr) {
          console.error("Failed to log email:", logErr);
        }
      });
      await Promise.allSettled(emailPromises);
      // Delay between batches (except last)
      if (i + batchSize < rows.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    res.status(200).json({
      success: true,
      message: "Email sending completed",
      results: {
        total: rows.length,
        successful: successCount,
        failed: failedCount,
        failedEmails: failedEmails,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
async function sendVerificationEmail(user, verificationUrl) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  console.log(
    "EMAIL_USER:",
    process.env.EMAIL_USER,
    "EMAIL_PASS:",
    process.env.EMAIL_PASS
  );
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Verify your email address",
    html: `<p>Please verify your email by clicking the following link:</p>
           <a href="${verificationUrl}">Verify Email</a>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendMassEmails,
  sendVerificationEmail,
};
