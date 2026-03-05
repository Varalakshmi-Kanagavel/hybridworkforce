const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

const resetPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ role: "SYS_ADMIN" });

    if (!user) {
      console.log("SYS_ADMIN not found");
      process.exit(0);
    }

    const newPassword = "Admin@123"; // set new password here
    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    await user.save();

    console.log("SYS_ADMIN password reset successfully");
    console.log("New Password:", newPassword);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
};

resetPassword();
