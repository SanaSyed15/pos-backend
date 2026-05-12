import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 465,
secure: true,

  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
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

    console.log(
      "BREVO USER:",
      process.env.BREVO_USER
    );

    console.log(
      "BREVO PASS EXISTS:",
      !!process.env.BREVO_PASS
    );

    await transporter.verify();

    console.log("SMTP VERIFIED ✅");

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