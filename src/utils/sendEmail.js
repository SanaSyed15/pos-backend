import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev", // default test sender
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