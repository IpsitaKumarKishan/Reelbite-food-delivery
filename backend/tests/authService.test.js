import { test, describe } from "node:test";
import assert from "node:assert";
import { hashPassword, comparePassword, generateOtp, sanitizeUser } from "../services/auth.service.js";

describe("auth.service unit tests", () => {
  test("hashes and correctly verifies passwords with bcrypt", async () => {
    const rawPassword = "secureSecretPassword123";
    const hashed = await hashPassword(rawPassword);

    assert.notStrictEqual(hashed, rawPassword);
    assert.strictEqual(typeof hashed, "string");

    const isMatch = await comparePassword(rawPassword, hashed);
    assert.strictEqual(isMatch, true);

    const isWrongMatch = await comparePassword("wrongPassword", hashed);
    assert.strictEqual(isWrongMatch, false);
  });

  test("generates 4-digit numeric OTP", () => {
    const otp = generateOtp();
    assert.strictEqual(otp.length, 4);
    assert.match(otp, /^\d{4}$/);
  });

  test("sanitizeUser strips password, resetOtp, and otpExpires", () => {
    const user = {
      _id: "user123",
      email: "test@example.com",
      password: "hashedPasswordString",
      resetOtp: "4567",
      otpExpires: new Date(),
      fullName: "Jane Doe"
    };

    const sanitized = sanitizeUser(user);

    assert.strictEqual(sanitized.password, undefined);
    assert.strictEqual(sanitized.resetOtp, undefined);
    assert.strictEqual(sanitized.otpExpires, undefined);
    assert.strictEqual(sanitized.email, "test@example.com");
    assert.strictEqual(sanitized.fullName, "Jane Doe");
  });
});
