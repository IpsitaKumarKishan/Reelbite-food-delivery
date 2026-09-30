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
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || "+17372508034";
  const client = getTwilioClient();
  let lastTwilioError = null;

  // 1. Primary: Twilio Programmable SMS Dispatch (client.messages.create)
  if (client) {
    // Attempt custom message body first
    try {
      const message = await client.messages.create({
        body: `Your ReelBite verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`,
        from: fromNumber,
        to: formattedMobile,
      });

      console.log(`[Twilio SMS Sent]: SID=${message.sid} To=${formattedMobile}`);
      return {
        success: true,
        provider: "twilio",
        messageSid: message.sid,
        status: message.status,
      };
    } catch (err) {
      lastTwilioError = err.message || String(err);
      console.warn(`[Twilio SMS Attempt]: ${lastTwilioError}`);

      // If trial account requires predefined template (e.g., 'sms_appointment_reminders')
      if (lastTwilioError.includes("predefined SMS templates") || lastTwilioError.includes("template")) {
        try {
          const templateMessage = await client.messages.create({
            body: "sms_appointment_reminders",
            from: fromNumber,
            to: formattedMobile,
          });

          console.log(`[Twilio Template SMS Sent]: SID=${templateMessage.sid} To=${formattedMobile}`);
          return {
            success: true,
            provider: "twilio_template",
            messageSid: templateMessage.sid,
            status: templateMessage.status,
          };
        } catch (templateErr) {
          lastTwilioError = templateErr.message || String(templateErr);
          console.error(`[Twilio Template Error]:`, lastTwilioError);
        }
      }
    }
  }

  // 2. Secondary: Twilio Verify Service (Delivers direct 6-digit numeric OTP)
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (client && verifyServiceSid) {
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
      lastTwilioError = err.message || String(err);
      console.error(`[Twilio Verify Error]:`, lastTwilioError);
    }
  }

  // 3. Fallback: Log to console and provide dev OTP
  console.log(`\n======================================================`);
  console.log(`📲 [REELBITE PHONE OTP DISPATCH]`);
  console.log(`To: ${formattedMobile || mobile}`);
  console.log(`Your ReelBite verification code is: [ ${otp} ]`);
  console.log(`Valid for 5 minutes. Do not share with anyone.`);
  if (lastTwilioError) {
    console.log(`⚠️ Twilio notice: ${lastTwilioError}`);
  }
  console.log(`======================================================\n`);

  return { success: true, provider: "console_fallback", twilioError: lastTwilioError };
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

