/**
 * Phone Number Validator & Normalizer Utility
 * Standardizes mobile phone numbers, validates structure, and blocks dummy/repetitive numbers.
 */

/**
 * Normalizes user input into a clean 10-digit mobile number string.
 * Strips formatting, whitespace, '+91', '91', or leading '0' prefix.
 *
 * @param {string|number} rawInput
 * @returns {string} Clean digits
 */
export const normalizePhoneNumber = (rawInput) => {
  if (!rawInput) return "";
  let digits = String(rawInput).trim().replace(/[\s\-\(\)\.]/g, "");

  // Handle "+91" prefix
  if (digits.startsWith("+91")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("0091")) {
    digits = digits.slice(4);
  } else if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    // e.g. "919876543210"
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    // e.g. "09876543210"
    digits = digits.slice(1);
  }

  // Remove any remaining non-digit characters
  return digits.replace(/\D/g, "");
};

const BLOCKED_DUMMY_NUMBERS = new Set([
  "1234567890",
  "0123456789",
  "9876543210",
  "0987654321",
]);

/**
 * Validates a mobile phone number for new user registration.
 *
 * @param {string|number} rawInput
 * @returns {{ isValid: boolean, normalizedMobile: string, message?: string }}
 */
export const validatePhoneNumber = (rawInput) => {
  if (!rawInput || String(rawInput).trim() === "") {
    return {
      isValid: false,
      normalizedMobile: "",
      message: "Mobile phone number is required.",
    };
  }

  const normalized = normalizePhoneNumber(rawInput);

  if (!/^\d+$/.test(normalized)) {
    return {
      isValid: false,
      normalizedMobile: normalized,
      message: "Mobile number must contain digits only.",
    };
  }

  if (normalized.length !== 10) {
    return {
      isValid: false,
      normalizedMobile: normalized,
      message: `Mobile number must be exactly 10 digits (received ${normalized.length}).`,
    };
  }

  // Must begin with 6, 7, 8, or 9 (Standard mobile allocation)
  if (!/^[6-9]/.test(normalized)) {
    return {
      isValid: false,
      normalizedMobile: normalized,
      message: "Mobile number must start with 6, 7, 8, or 9.",
    };
  }

  // Block all identical digits (e.g. 0000000000, 9999999999, etc.)
  if (/^(\d)\1{9}$/.test(normalized)) {
    return {
      isValid: false,
      normalizedMobile: normalized,
      message: "Invalid mobile number: repeated dummy digits are not allowed.",
    };
  }

  // Block sequential dummy numbers
  if (BLOCKED_DUMMY_NUMBERS.has(normalized)) {
    return {
      isValid: false,
      normalizedMobile: normalized,
      message: "Invalid mobile number: sequential dummy numbers are not allowed.",
    };
  }

  return {
    isValid: true,
    normalizedMobile: normalized,
  };
};
