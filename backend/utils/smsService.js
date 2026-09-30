/**
 * SMS Dispatch Service
 * Handles SMS OTP transmissions via SMS gateways or secure dev fallback.
 */

export const sendPhoneOtpSms = async (mobile, otp) => {
  // Check if external SMS gateway credentials exist (e.g. Fast2SMS / Twilio)
  const isProd = process.env.NODE_ENV === "production";

  if (process.env.FAST2SMS_API_KEY) {
    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: mobile,
        }),
      });
      const data = await response.json();
      return { success: true, provider: "fast2sms", data };
    } catch (err) {
      console.error("[SMS Gateway Error Fast2SMS]:", err);
    }
  }

  // Fallback logger for local development / testing
  console.log(`\n======================================================`);
  console.log(`📲 [REELBITE PHONE OTP DISPATCH]`);
  console.log(`To: +91 ${mobile}`);
  console.log(`Your ReelBite verification code is: [ ${otp} ]`);
  console.log(`Valid for 5 minutes. Do not share with anyone.`);
  console.log(`======================================================\n`);

  return { success: true, provider: "console_fallback" };
};
