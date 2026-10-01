import dotenv from "dotenv";
dotenv.config();
import connectDb from "../config/db.js";
import User from "../models/user.model.js";

const identifier = process.argv[2];

if (!identifier) {
  console.log("ℹ️ Usage: node scripts/makeAdmin.js <email or mobile>");
  console.log("Example (by email):  node scripts/makeAdmin.js user@example.com");
  console.log("Example (by mobile): node scripts/makeAdmin.js 9078465344\n");
  
  // List current users so the developer can see available accounts
  const listUsers = async () => {
    await connectDb();
    const users = await User.find().select("fullName email mobile role").lean();
    console.log("📋 Current Registered Accounts in Database:");
    users.forEach((u) => {
      const emailStr = u.email ? u.email : "No Email";
      const mobileStr = u.mobile ? u.mobile : "No Mobile";
      console.log(`- ${u.fullName} | ${emailStr} | ${mobileStr} | [${u.role}]`);
    });
    process.exit(0);
  };
  listUsers().catch(() => process.exit(1));
} else {
  const promote = async () => {
    await connectDb();
    const clean = identifier.trim();
    const isEmail = clean.includes("@");
    const query = isEmail
      ? { email: { $regex: new RegExp(`^${clean.toLowerCase()}$`, "i") } }
      : { mobile: clean.replace(/\D/g, "") };

    const user = await User.findOne(query);

    if (!user) {
      console.error(`❌ User not found with ${isEmail ? "email" : "mobile"}: "${identifier}"`);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();
    console.log(`\n🎉 Success! "${user.fullName}" (${user.email || user.mobile}) has been elevated to role: [admin].`);
    console.log("👉 Now open your browser, refresh or sign in, and the 'Admin Dashboard' will be unlocked!\n");
    process.exit(0);
  };
  promote().catch((err) => {
    console.error("❌ Failed to promote user:", err);
    process.exit(1);
  });
}
