import dotenv from "dotenv";
dotenv.config();
import connectDb from "../config/db.js";
import User from "../models/user.model.js";

const email = process.argv[2];

if (!email) {
  console.log("ℹ️ Usage: node scripts/makeAdmin.js <email>");
  console.log("Example: node scripts/makeAdmin.js admin@example.com\n");
  
  // List current users so the developer can see available accounts
  const listUsers = async () => {
    await connectDb();
    const users = await User.find().select("fullName email role").lean();
    console.log("📋 Current Registered Accounts in Database:");
    users.forEach((u) => {
      console.log(`- ${u.fullName} | ${u.email} | [${u.role}]`);
    });
    process.exit(0);
  };
  listUsers().catch(() => process.exit(1));
} else {
  const promote = async () => {
    await connectDb();
    const targetEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: { $regex: new RegExp(`^${targetEmail}$`, "i") } });

    if (!user) {
      console.error(`❌ User not found with email: "${email}"`);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();
    console.log(`\n🎉 Success! "${user.fullName}" (${user.email}) has been elevated to role: [admin].`);
    console.log("👉 Now open your browser, refresh, and the 'Super Admin' portal will be unlocked!\n");
    process.exit(0);
  };
  promote().catch((err) => {
    console.error("❌ Failed to promote user:", err);
    process.exit(1);
  });
}
