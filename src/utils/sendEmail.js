import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // MUST be true
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000, // prevents timeout crash
    });

    // ✅ Check connection
    await transporter.verify();
    console.log("SMTP READY ✅");

    // ✅ Send email
    await transporter.sendMail({
      from: `"POS System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT ✅");

  } catch (error) {
    console.error("EMAIL ERROR ❌:", error.message);
    throw error;
  }
};