import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhoneNumber, validatePhoneNumber } from "../utils/phoneValidator.js";

test("Phone Validation Layer: Normalizes valid phone numbers with prefixes and spacing", () => {
  assert.equal(normalizePhoneNumber("+919876543211"), "9876543211");
  assert.equal(normalizePhoneNumber("+91 98765 43211"), "9876543211");
  assert.equal(normalizePhoneNumber("09876543211"), "9876543211");
  assert.equal(normalizePhoneNumber("919876543211"), "9876543211");
  assert.equal(normalizePhoneNumber("98765-43211"), "9876543211");
  assert.equal(normalizePhoneNumber("(987) 654-3211"), "9876543211");
});

test("Phone Validation Layer: Accepts standard valid 10-digit mobile numbers", () => {
  const validNumbers = [
    "9876543211",
    "8123456789",
    "7012345678",
    "6987654321",
    "+91 88888 12345",
  ];

  for (const num of validNumbers) {
    const res = validatePhoneNumber(num);
    assert.equal(res.isValid, true, `Number ${num} should be valid`);
    assert.equal(res.normalizedMobile.length, 10);
    assert.ok(/^[6-9]/.test(res.normalizedMobile));
  }
});

test("Phone Validation Layer: Rejects invalid length and format", () => {
  // Too short
  const shortRes = validatePhoneNumber("98765");
  assert.equal(shortRes.isValid, false);
  assert.ok(shortRes.message.includes("exactly 10 digits"));

  // Too long
  const longRes = validatePhoneNumber("987654321012");
  assert.equal(longRes.isValid, false);
  assert.ok(longRes.message.includes("exactly 10 digits"));

  // Alphabetical
  const letterRes = validatePhoneNumber("abcdefghij");
  assert.equal(letterRes.isValid, false);

  // Empty
  const emptyRes = validatePhoneNumber("");
  assert.equal(emptyRes.isValid, false);
  assert.ok(emptyRes.message.includes("required"));
});

test("Phone Validation Layer: Rejects non-mobile starting digits (0-5)", () => {
  const invalidStartingDigits = [
    "5123456789",
    "4123456789",
    "3123456789",
    "2123456789",
    "1123456789",
  ];

  for (const num of invalidStartingDigits) {
    const res = validatePhoneNumber(num);
    assert.equal(res.isValid, false, `Number ${num} should be rejected`);
    assert.ok(res.message.includes("must start with 6, 7, 8, or 9"));
  }
});

test("Phone Validation Layer: Rejects repeated and dummy sequential numbers", () => {
  const dummyNumbers = [
    "0000000000",
    "9999999999",
    "8888888888",
    "7777777777",
    "6666666666",
    "1234567890",
    "9876543210",
  ];

  for (const num of dummyNumbers) {
    const res = validatePhoneNumber(num);
    assert.equal(res.isValid, false, `Dummy number ${num} should be rejected`);
    assert.ok(res.message.includes("dummy") || res.message.includes("start with 6, 7, 8, or 9") || res.message.includes("repeated"));
  }
});
