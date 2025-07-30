const axios = require("axios");
require("dotenv").config();

const sendSMS = async (numbers, message, language = "English") => {
  try {
    const params = {
      user: process.env.SMS_USER, // Profile ID
      pwd: process.env.SMS_PASS, // Password
      senderid: process.env.SMS_SENDER, // Sender ID
      mobileno: numbers, // Mobile number with country code
      msgtext: message, // Text message
      language: language, // Unicode/English
      CountryCode: 255,
    };
    console.log("Sending SMS with params:", params);
    const response = await axios.get("https://mshastra.com/sendurlcomma.aspx", {
      params,
    });
    console.log(response.status);
    return response.status;
  } catch (error) {
    console.error("SMS Sending Error:", error);
    return error;
  }
};

module.exports = sendSMS;
