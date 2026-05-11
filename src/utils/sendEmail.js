import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  requireTLS: true,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

export const sendEmail = async (
  to,
  subject,
  html
) => {
  try {

    // ✅ ADD THIS HERE
    await transporter.verify();

    console.log("SMTP READY ✅");

    const info = await transporter.sendMail({
      from: `"Restaurant POS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT ✅", info.messageId);

  } catch (error) {
    console.error("EMAIL ERROR ❌:", error);
    throw error;
  }
};