import axios from "axios";

export const sendEmail = async (
  to,
  subject,
  html
) => {

  try {

    const response = await axios.post(

      "https://api.brevo.com/v3/smtp/email",

      {
        sender: {
          name: "Restaurant POS",
          email: "restaurantpos24@gmail.com",
        },

        to: [
          {
            email: to,
          },
        ],

        subject,
        htmlContent: html,
      },

      {
        headers: {
          "api-key":
            process.env.BREVO_API_KEY,

          "Content-Type":
            "application/json",
        },
      }
    );

    console.log(
      "EMAIL SENT ✅",
      response.data
    );

  } catch (error) {

    console.error(
      "EMAIL ERROR ❌",
      error.response?.data || error.message
    );

    throw error;
  }
};