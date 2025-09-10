// Quick fix script to clean up database
// Run this once to remove Google tokens from normal accounts

const mongoose = require("mongoose");
const User = require("./model/userModel");
const connectDb = require("./configs/connectDb");

const cleanupDatabase = async () => {
  try {
    // Connect to database
    await connectDb();
    console.log("Connected to database");

    // Find users who have both password and Google tokens (this shouldn't happen)
    const usersToClean = await User.find({
      password: { $exists: true, $ne: null },
      googleTokens: { $exists: true, $ne: {} },
    });

    console.log(`Found ${usersToClean.length} users that need cleanup`);

    for (const user of usersToClean) {
      // Check if this is a normal password account (not random Google password)
      if (user.password && user.password.length < 50) {
        // Normal passwords are usually < 50 chars
        console.log(`Cleaning user: ${user.email}`);
        user.googleTokens = {};
        await user.save();
      }
    }

    console.log("Database cleanup completed");
    mongoose.disconnect();
  } catch (error) {
    console.error("Error during cleanup:", error);
    mongoose.disconnect();
  }
};

cleanupDatabase();
