const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

const seedSysAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({ email: "admin@cubeai.com" });
    if (existing) {
      console.log("SYS_ADMIN already exists");
      process.exit(0);
    }

    // Let the User model pre-save hook handle password hashing
    await User.create({
      name: "System Admin",
      email: "admin@cubeai.com",
      password: "Admin@123",
      role: "SYS_ADMIN",
      isActive: true
    });

    console.log("SYS_ADMIN user created successfully");
    console.log("Email: admin@cubeai.com");
    console.log("Password: Admin@123");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedSysAdmin();
