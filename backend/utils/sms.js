import axios from "axios";

export const sendDeliveryOtpSms = async (mobile, otp) => {
  try {
    // If Fast2SMS or Twilio API key exists in environment
    if (process.env.FAST2SMS_API_KEY) {
      await axios.post(
        "https://www.fast2sms.com/dev/bulkV2",
        {
          variables_values: otp,
          route: "otp",
          numbers: mobile,
        },
        {
          headers: {
            authorization: process.env.FAST2SMS_API_KEY,
          },
        }
      );
      console.log(`[SMS SENT] Fast2SMS OTP ${otp} dispatched to phone number ${mobile}`);
    } else {
      console.log(`[SMS OTP DISPATCH via PHONE NUMBER] Phone: ${mobile} | OTP: ${otp}`);
    }
    return true;
  } catch (error) {
    console.error("SMS dispatch error:", error.message || error);
    return false;
  }
};
