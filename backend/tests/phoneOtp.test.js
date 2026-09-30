import test from "node:test";
import assert from "node:assert/strict";
import { validatePhoneNumber } from "../utils/phoneValidator.js";

test("Phone OTP: Flow state management and attempt enforcement", () => {
  // Simulate PhoneOtp document model
  const mockPhoneOtpStore = new Map();

  const sendOtp = (rawMobile) => {
    const check = validatePhoneNumber(rawMobile);
    if (!check.isValid) {
      return { error: check.message };
    }
    const cleanMobile = check.normalizedMobile;

    // Check cooldown
    const existing = mockPhoneOtpStore.get(cleanMobile);
    if (existing && existing.createdAt > Date.now() - 60000) {
      return { error: "Please wait 60 seconds before requesting a new OTP." };
    }

    const otp = "123456"; // Deterministic for test
    mockPhoneOtpStore.set(cleanMobile, {
      mobile: cleanMobile,
      otp,
      expiresAt: Date.now() + 300000,
      createdAt: Date.now(),
      attempts: 0,
      verified: false,
    });

    return { success: true, mobile: cleanMobile, otp };
  };

  const verifyOtp = (rawMobile, userOtp) => {
    const check = validatePhoneNumber(rawMobile);
    if (!check.isValid) return { error: check.message };
    const cleanMobile = check.normalizedMobile;

    const record = mockPhoneOtpStore.get(cleanMobile);
    if (!record || record.expiresAt < Date.now()) {
      return { error: "OTP expired or not found" };
    }
    if (record.attempts >= 5) {
      mockPhoneOtpStore.delete(cleanMobile);
      return { error: "Too many failed attempts. Please request a new OTP." };
    }
    if (record.otp !== userOtp) {
      record.attempts += 1;
      return { error: `Incorrect OTP. ${5 - record.attempts} attempts remaining.` };
    }

    record.verified = true;
    return { success: true, verified: true };
  };

  // 1. Invalid phone number rejection
  const invalidRes = sendOtp("12345");
  assert.ok(invalidRes.error, "Invalid phone should be rejected");

  // 2. Successful OTP send
  const validMobile = "9876543211";
  const sendRes = sendOtp(validMobile);
  assert.equal(sendRes.success, true);
  assert.equal(sendRes.otp.length, 6);

  // 3. Cooldown rate-limit rejection
  const cooldownRes = sendOtp(validMobile);
  assert.ok(cooldownRes.error.includes("60 seconds"), "Must enforce cooldown");

  // 4. Incorrect OTP verification attempt
  const wrongRes = verifyOtp(validMobile, "999999");
  assert.ok(wrongRes.error.includes("Incorrect OTP"));
  const record = mockPhoneOtpStore.get(validMobile);
  assert.equal(record.attempts, 1);
  assert.equal(record.verified, false);

  // 5. Correct OTP verification
  const correctRes = verifyOtp(validMobile, "123456");
  assert.equal(correctRes.success, true);
  assert.equal(correctRes.verified, true);
  assert.equal(record.verified, true);

  // 6. Registration guard: Mobile must be verified
  const canRegister = (mobile) => {
    const rec = mockPhoneOtpStore.get(mobile);
    return Boolean(rec && rec.verified);
  };

  assert.equal(canRegister("9876543211"), true, "Verified phone can register");
  assert.equal(canRegister("9123456780"), false, "Unverified phone cannot register");
});
