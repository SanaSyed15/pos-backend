import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async (
  to,
  subject,
  html
) => {
  try {
    await transporter.verify();

    console.log("SMTP READY ✅");

    const info = await transporter.sendMail({
      from: `"Restaurant POS" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(
      "EMAIL SENT ✅",
      info.messageId
    );

  } catch (error) {
    console.error(
      "EMAIL ERROR ❌:",
      error
    );

    throw error;
  }
};