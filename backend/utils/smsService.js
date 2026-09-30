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

  if (accountSid && authToken && !twilioClient) {
    try {
      twilioClient = twilio(accountSid, authToken);
    } catch (err) {
      console.error("[Twilio Init Error]:", err.message);
    }
  }
  return twilioClient;
};

/**
 * Normalizes phone number into E.164 format for international SMS delivery.
 * Defaults to +91 (India) if 10-digit number without country code is provided.
 */
export const formatE164Number = (mobile) => {
  if (!mobile) return "";
  const cleaned = mobile.toString().replace(/\s+/g, "").replace(/[-()]/g, "");
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
};

export const sendPhoneOtpSms = async (mobile, otp) => {
  const formattedMobile = formatE164Number(mobile);
  const messageBody = `Your ReelBite verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;

  // 1. Primary: Twilio Verify API (Recommended for trial & production OTP verification)
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && verifyServiceSid) {
    const client = getTwilioClient();
    if (client) {
      try {
        const verification = await client.verify.v2.services(verifyServiceSid)
          .verifications
          .create({ to: formattedMobile, channel: "sms" });

        console.log(`[Twilio Verify SMS Sent]: SID=${verification.sid} Status=${verification.status} To=${formattedMobile}`);
        return {
          success: true,
          provider: "twilio_verify",
          verificationSid: verification.sid,
          status: verification.status,
        };
      } catch (err) {
        console.error(`[Twilio Verify Error]:`, err.message || err);
      }
    }
  }

  // 2. Secondary: Twilio Programmable SMS Dispatch
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (client && (fromNumber || messagingServiceSid)) {
      try {
        const payload = {
          body: messageBody,
          to: formattedMobile,
        };

        if (messagingServiceSid) {
          payload.messagingServiceSid = messagingServiceSid;
        } else {
          payload.from = fromNumber;
        }

        const twilioMessage = await client.messages.create(payload);

        console.log(`[Twilio SMS Sent]: SID=${twilioMessage.sid} To=${formattedMobile}`);
        return {
          success: true,
          provider: "twilio",
          messageSid: twilioMessage.sid,
          status: twilioMessage.status,
        };
      } catch (err) {
        console.error(`[Twilio SMS Error]:`, err.message || err);
      }
    } else {
      console.warn("[Twilio Warning]: TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID is missing in environment variables.");
    }
  }

  // 3. Dev Fallback Logger
  console.log(`\n======================================================`);
  console.log(`📲 [REELBITE PHONE OTP DISPATCH]`);
  console.log(`To: ${formattedMobile || mobile}`);
  console.log(`Your ReelBite verification code is: [ ${otp} ]`);
  console.log(`Valid for 5 minutes. Do not share with anyone.`);
  console.log(`(Configure TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN in .env to deliver real SMS)`);
  console.log(`======================================================\n`);

  return { success: true, provider: "console_fallback" };
};

/**
 * Validates verification code with Twilio Verify API service.
 */
export const verifyTwilioOtp = async (mobile, code) => {
  const formattedMobile = formatE164Number(mobile);
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

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

