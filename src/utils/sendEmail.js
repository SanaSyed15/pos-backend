import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,

  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

export const sendEmail = async (
  to,
  subject,
  html
) => {
  try {

    const info = await transporter.sendMail({
      from:
        `"Restaurant POS" <restaurantpos24@gmail.com>`,
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