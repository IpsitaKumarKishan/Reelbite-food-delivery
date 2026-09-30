import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { validatePhoneNumber } from "../utils/phoneValidator.js";

test("Phone-Only Authentication Architecture", async (t) => {
  // Simulated In-Memory User Store
  const userDatabase = new Map();
  let idCounter = 1;

  const mockSignUp = async ({ fullName, mobile, password, role, email }) => {
    // 1. Phone validation
    const phoneCheck = validatePhoneNumber(mobile);
    if (!phoneCheck.isValid) {
      return { status: 400, error: phoneCheck.message };
    }
    const cleanMobile = phoneCheck.normalizedMobile;

    // 2. Prevent mobile collision
    for (const u of userDatabase.values()) {
      if (u.mobile === cleanMobile) {
        return { status: 400, error: "Mobile number is already registered with another account." };
      }
    }

    // 3. Email is optional
    let cleanEmail = null;
    if (email && typeof email === "string" && email.trim()) {
      cleanEmail = email.trim().toLowerCase();
      for (const u of userDatabase.values()) {
        if (u.email && u.email === cleanEmail) {
          return { status: 400, error: "User already exists with this email address." };
        }
      }
    }

    if (!password || password.length < 6) {
      return { status: 400, error: "Password must be at least 6 characters." };
    }

    const hashedPassword = await bcrypt.hash(password, 4);
    const userId = `user_${idCounter++}`;
    const userDoc = {
      _id: userId,
      fullName: fullName.trim(),
      mobile: cleanMobile,
      email: cleanEmail || undefined,
      password: hashedPassword,
      role: role || "user",
      status: "active"
    };
    userDatabase.set(userId, userDoc);

    const safeUser = { ...userDoc };
    delete safeUser.password;
    return { status: 201, user: safeUser };
  };

  const mockSignIn = async ({ mobile, email, password }) => {
    const rawIdentifier = mobile || email;
    if (!rawIdentifier) {
      return { status: 400, error: "Mobile number is required to sign in." };
    }
    const identifier = String(rawIdentifier).trim();
    const phoneCheck = validatePhoneNumber(identifier);
    let target = null;

    if (phoneCheck.isValid) {
      for (const u of userDatabase.values()) {
        if (u.mobile === phoneCheck.normalizedMobile) {
          target = u;
          break;
        }
      }
    } else if (identifier.includes("@")) {
      for (const u of userDatabase.values()) {
        if (u.email === identifier.toLowerCase()) {
          target = u;
          break;
        }
      }
    } else {
      const digitsOnly = identifier.replace(/\D/g, "");
      if (digitsOnly.length === 10) {
        for (const u of userDatabase.values()) {
          if (u.mobile === digitsOnly) {
            target = u;
            break;
          }
        }
      }
    }

    if (!target) {
      return { status: 400, error: "User not found with this mobile number." };
    }

    const match = await bcrypt.compare(password, target.password);
    if (!match) {
      return { status: 400, error: "Incorrect password." };
    }

    const safeUser = { ...target };
    delete safeUser.password;
    return { status: 200, user: safeUser };
  };

  const mockUpdateProfile = async (userId, { fullName, email, mobile }) => {
    const user = userDatabase.get(userId);
    if (!user) return { status: 404, error: "User not found" };

    if (fullName) user.fullName = fullName.trim();

    if (email !== undefined) {
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (cleanEmail) {
        for (const [id, u] of userDatabase.entries()) {
          if (id !== userId && u.email === cleanEmail) {
            return { status: 400, error: "This email address is already in use by another account." };
          }
        }
        user.email = cleanEmail;
      }
    }

    if (mobile) {
      const cleanMobile = mobile.replace(/\D/g, "");
      user.mobile = cleanMobile;
    }

    const safeUser = { ...user };
    delete safeUser.password;
    return { status: 200, user: safeUser };
  };

  await t.test("allows signup with ONLY mobile number, full name, and password (no email)", async () => {
    const res = await mockSignUp({
      fullName: "Alice Sharma",
      mobile: "9078465344",
      password: "password123",
      role: "user"
    });
    assert.equal(res.status, 201);
    assert.equal(res.user.mobile, "9078465344");
    assert.equal(res.user.email, undefined, "Email should be undefined/omitted at signup");
  });

  await t.test("allows multiple distinct users to exist without email (sparse index behavior)", async () => {
    const res2 = await mockSignUp({
      fullName: "Bob Patel",
      mobile: "9437123456",
      password: "password456",
      role: "owner"
    });
    assert.equal(res2.status, 201);
    assert.equal(res2.user.email, undefined);
    assert.equal(res2.user.mobile, "9437123456");
  });

  await t.test("authenticates user via 10-digit mobile number and password", async () => {
    const signInRes = await mockSignIn({
      mobile: "9078465344",
      password: "password123"
    });
    assert.equal(signInRes.status, 200);
    assert.equal(signInRes.user.fullName, "Alice Sharma");
  });

  await t.test("rejects invalid password on mobile login", async () => {
    const signInRes = await mockSignIn({
      mobile: "9078465344",
      password: "wrongpassword"
    });
    assert.equal(signInRes.status, 400);
    assert.equal(signInRes.error, "Incorrect password.");
  });

  await t.test("allows user to attach email subsequently from profile edit", async () => {
    const updateRes = await mockUpdateProfile("user_1", {
      email: "alice@example.com"
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.user.email, "alice@example.com");
  });

  await t.test("prevents another user from taking an already attached email in profile", async () => {
    const updateRes = await mockUpdateProfile("user_2", {
      email: "alice@example.com"
    });
    assert.equal(updateRes.status, 400);
    assert.match(updateRes.error, /already in use/);
  });
});
