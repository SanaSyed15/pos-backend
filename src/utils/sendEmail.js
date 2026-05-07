import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    const data = await resend.emails.send({
      from: "Restaurant POS <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log("EMAIL SENT ✅", data);

  } catch (error) {
    console.error("EMAIL ERROR ❌:", error);
    throw error;
  }
};