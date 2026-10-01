import twilio from "twilio";

/**
 * SMS Dispatch Service
 * Handles SMS OTP transmissions via Twilio SMS Gateway or secure dev fallback.
 */

// Cache Twilio client instance
let twilioClient = null;

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  if (!twilioClient) {
    try {
      twilioClient = twilio(accountSid, authToken);
    } catch (err) {
      console.error("[Twilio Init Error]:", err.message);
      return null;
    }
  }
  return twilioClient;
};

/**
 * Normalizes phone number into E.164 format for international SMS delivery.
 * Defaults to +91 (India) if 10-digit number without country code is provided.
 * Strips all non-digit characters to prevent injection.
 */
export const formatE164Number = (mobile) => {
  if (!mobile) return "";
  const str = String(mobile).trim();
  const hasPlus = str.startsWith("+");
  const digits = str.replace(/\D/g, "");
  if (!digits) return "";

  if (hasPlus) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  return `+${digits}`;
};

export const sendPhoneOtpSms = async (mobile, otp) => {
  const formattedMobile = formatE164Number(mobile);
  if (!formattedMobile) {
    return { success: false, error: "Invalid phone number format." };
  }
  if (!otp) {
    return { success: false, error: "OTP code is required." };
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  const isProduction = process.env.NODE_ENV === "production";
  const client = getTwilioClient();
  let lastTwilioError = null;

  // 1. Primary: Twilio Verify Service (Purpose-built for OTPs, works on Trial & Production)
  if (client && verifyServiceSid) {
    try {
      const verification = await client.verify.v2.services(verifyServiceSid)
        .verifications
        .create({ to: formattedMobile, channel: "sms" });

      return {
        success: true,
        provider: "twilio_verify",
        verificationSid: verification.sid,
        status: verification.status,
      };
    } catch (err) {
      lastTwilioError = err.message || String(err);
      console.warn(`[Twilio Verify Attempt Failed]:`, lastTwilioError);
    }
  }

  // 2. Secondary: Twilio Programmable SMS Dispatch (client.messages.create)
  if (client && (fromNumber || messagingServiceSid)) {
    try {
      const messagePayload = {
        body: `Your ReelBite verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
        to: formattedMobile,
      };
      if (messagingServiceSid) {
        messagePayload.messagingServiceSid = messagingServiceSid;
      } else {
        messagePayload.from = fromNumber;
      }

      const message = await client.messages.create(messagePayload);

      return {
        success: true,
        provider: "twilio",
        messageSid: message.sid,
        status: message.status,
      };
    } catch (err) {
      lastTwilioError = err.message || String(err);
      console.warn(`[Twilio SMS Attempt Failed]:`, lastTwilioError);
    }
  }

  // 3. Fallback: Development / Test Mode ONLY
  if (!isProduction) {
    console.log(`\n======================================================`);
    console.log(`📲 [DEV ONLY - REELBITE PHONE OTP DISPATCH]`);
    console.log(`To: ${formattedMobile}`);
    console.log(`Your ReelBite verification code is: [ ${otp} ]`);
    console.log(`Valid for 5 minutes. Do not share with anyone.`);
    if (lastTwilioError) {
      console.log(`⚠️ Twilio notice: ${lastTwilioError}`);
    }
    console.log(`======================================================\n`);

    return { success: true, provider: "console_fallback", twilioError: lastTwilioError };
  }

  // In production, do not expose OTP to logs or pretend delivery succeeded when it didn't
  console.error(`[SMS Dispatch Error]: Failed to send OTP to ${formattedMobile.slice(0, 4)}****. Twilio error: ${lastTwilioError || "Credentials not configured"}`);
  return {
    success: false,
    error: "Unable to send SMS verification code at this time. Please try again later.",
    twilioError: lastTwilioError,
  };
};

/**
 * Validates verification code with Twilio Verify API service.
 */
export const verifyTwilioOtp = async (mobile, code) => {
  const formattedMobile = formatE164Number(mobile);
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!formattedMobile || !code) {
    return { success: false, approved: false, message: "Mobile number and code are required." };
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && verifyServiceSid) {
    const client = getTwilioClient();
    if (client) {
      try {
        const check = await client.verify.v2.services(verifyServiceSid)
          .verificationChecks
          .create({ to: formattedMobile, code: String(code).trim() });

        return {
          success: true,
          approved: check.status === "approved" && check.valid === true,
          status: check.status,
        };
      } catch (err) {
        console.error(`[Twilio Verification Check Error]:`, err.message || err);
        return { success: false, approved: false, error: err.message };
      }
    }
  }

  return { success: false, approved: false, message: "Twilio Verify service not configured" };
};
