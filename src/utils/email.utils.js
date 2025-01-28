const nodemailer = require("nodemailer");
const { logger } = require("./logger");
const fs = require("fs").promises;
const path = require("path");
const handlebars = require("handlebars");

// Add more detailed debug logging
console.log("Environment Check:", {
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd(),
  EMAIL_VARS: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    // Don't log the actual password
    hasPassword: !!process.env.EMAIL_PASSWORD,
  },
});

// Create transporter with better error handling
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error(
      "Email credentials are not properly configured in environment variables"
    );
  }

  const config = {
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

// Verify transporter immediately
transporter
  .verify()
  .then(() => {
    logger.info("SMTP server connection successful");
  })
  .catch((error) => {
    logger.error("SMTP connection error:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });
  });

// Load and compile email template
const loadTemplate = async (templateName) => {
  console.log("Loading template:", {
    templateName,
    currentDir: __dirname,
    fullPath: path.join(
      __dirname,
      "..",
      "templates",
      "email",
      `${templateName}.html`
    ),
  });

  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    "email",
    `${templateName}.html`
  );

  try {
    const template = await fs.readFile(templatePath, "utf-8");
    return handlebars.compile(template);
  } catch (error) {
    logger.error("Template loading error:", {
      error: error.message,
      templateName,
      templatePath,
    });
    throw error;
  }
};

// Send email function
const sendEmail = async ({ email, subject, templateName, templateData }) => {
  try {
    // Load template
    const template = await loadTemplate(templateName);
    const html = template(templateData);

    const mailOptions = {
      from: process.env.EMAIL_FROM || "Dream Radio <noreply@dreamradio.com>",
      to: email,
      subject: subject,
      html: html,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${email}`);
  } catch (error) {
    logger.error("Email send error:", error);
    throw new Error("Failed to send email");
  }
};

module.exports = sendEmail;
