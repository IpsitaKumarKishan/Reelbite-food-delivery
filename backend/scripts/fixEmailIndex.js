import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import connectDb from "../config/db.js";
import User from "../models/user.model.js";

async function fixEmailIndex() {
  try {
    console.log("Connecting to database...");
    await connectDb();

    console.log("Checking current indexes on users collection...");
    const indexes = await User.collection.indexes();
    console.log("Current indexes:", indexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique, sparse: i.sparse, partialFilterExpression: i.partialFilterExpression })));

    // 1. Drop any existing email_1 index
    const emailIndex = indexes.find((i) => i.name === "email_1" || (i.key && i.key.email));
    if (emailIndex) {
      console.log(`Dropping existing index: ${emailIndex.name}...`);
      await User.collection.dropIndex(emailIndex.name);
      console.log(`Successfully dropped ${emailIndex.name}`);
    } else {
      console.log("No legacy email index found.");
    }

    // 2. Unset any email fields that are null or empty string across all users
    const unsetResult = await User.collection.updateMany(
      { email: { $in: [null, ""] } },
      { $unset: { email: "" } }
    );
    console.log(`Unset null/empty email in ${unsetResult.modifiedCount} documents.`);

    // 3. Create the new partial unique index
    console.log("Creating new partial unique index on email...");
    await User.collection.createIndex(
      { email: 1 },
      {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
        name: "email_1"
      }
    );
    console.log("Successfully created partial unique index on email!");

    const updatedIndexes = await User.collection.indexes();
    console.log("Updated indexes:", updatedIndexes.map((i) => ({ name: i.name, key: i.key, unique: i.unique, partialFilterExpression: i.partialFilterExpression })));

    console.log("\n✅ All done! Multiple users can now sign up without an email address without duplicate key errors.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing email index:", error);
    process.exit(1);
  }
}

fixEmailIndex();
