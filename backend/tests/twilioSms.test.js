import test from "node:test";
import assert from "node:assert/strict";
import { formatE164Number, sendPhoneOtpSms } from "../utils/smsService.js";

test("Twilio SMS: E.164 phone formatting and dispatch behavior", async (t) => {
  await t.test("correctly formats 10-digit mobile number to E.164 with +91 country code", () => {
    const formatted = formatE164Number("9876543210");
    assert.equal(formatted, "+919876543210");
  });

  await t.test("handles 12-digit number with 91 prefix without doubling prefix", () => {
    const formatted = formatE164Number("919876543210");
    assert.equal(formatted, "+919876543210");
  });

  await t.test("preserves existing international E.164 numbers", () => {
    const usNumber = formatE164Number("+14155552671");
    assert.equal(usNumber, "+14155552671");

    const inNumber = formatE164Number("+919876543210");
    assert.equal(inNumber, "+919876543210");
  });

  await t.test("strips whitespace, dashes, and parentheses before formatting", () => {
    const formatted = formatE164Number("(98765) 432-10");
    assert.equal(formatted, "+919876543210");
  });

  await t.test("falls back cleanly to console log in dev environment when Twilio credentials are not set", async () => {
    const originalSid = process.env.TWILIO_ACCOUNT_SID;
    const originalToken = process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;

    try {
      const result = await sendPhoneOtpSms("9876543210", "456789");
      assert.ok(result.success);
      assert.equal(result.provider, "console_fallback");
    } finally {
      if (originalSid) process.env.TWILIO_ACCOUNT_SID = originalSid;
      if (originalToken) process.env.TWILIO_AUTH_TOKEN = originalToken;
    }
  });
});
