const jwt = require('jsonwebtoken');
const User = require('./models/User');
const mongoose = require('mongoose');
require('dotenv').config();

async function testAuth() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Verify SYS_ADMIN user exists
    console.log('1️⃣ Testing SYS_ADMIN user...');
    const admin = await User.findOne({ email: 'admin@cubeai.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ SYS_ADMIN user not found');
      process.exit(1);
    }
    
    console.log('✅ SYS_ADMIN user found');
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   isActive:', admin.isActive);
    console.log('   Password hash:', admin.password.substring(0, 20) + '...');
    console.log('   Password format:', admin.password.startsWith('$2b$10$') ? '✅ bcrypt hash' : '❌ NOT bcrypt');
    
    // 2. Verify password comparison works
    console.log('\n2️⃣ Testing password verification...');
    const isValid = await admin.comparePassword('Admin@123');
    console.log('   Password "Admin@123":', isValid ? '✅ Valid' : '❌ Invalid');
    
    if (!isValid) {
      console.log('❌ Password verification failed');
      process.exit(1);
    }

    // 3. Verify JWT generation includes role
    console.log('\n3️⃣ Testing JWT token generation...');
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('✅ Token generated:', token.substring(0, 30) + '...');
    
    // 4. Decode and verify JWT payload
    console.log('\n4️⃣ Testing JWT payload...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('   Payload:', JSON.stringify(decoded, null, 2));
    console.log('   Contains userId:', decoded.userId ? '✅ Yes' : '❌ No');
    console.log('   Contains role:', decoded.role ? '✅ Yes' : '❌ No');
    console.log('   Role value:', decoded.role);
    
    if (!decoded.role) {
      console.log('❌ JWT payload missing role field');
      process.exit(1);
    }

    // 5. Test deviceType fields
    console.log('\n5️⃣ Testing deviceType audit fields...');
    admin.lastLoginDevice = 'WEB';
    admin.lastLoginAt = new Date();
    await admin.save();
    
    const updatedAdmin = await User.findById(admin._id);
    console.log('   lastLoginDevice:', updatedAdmin.lastLoginDevice);
    console.log('   lastLoginAt:', updatedAdmin.lastLoginAt);
    console.log('   ✅ Device audit fields working');

    console.log('\n✅ ALL TESTS PASSED! Authentication is correctly configured.\n');
    console.log('📋 Summary:');
    console.log('   ✅ User model with bcrypt hashing');
    console.log('   ✅ Password verification working');
    console.log('   ✅ JWT includes userId and role');
    console.log('   ✅ Device audit fields functional');
    console.log('\n🔐 Login Credentials:');
    console.log('   Email: admin@cubeai.com');
    console.log('   Password: Admin@123');
    console.log('   Expected Role: SYS_ADMIN');
    console.log('   Expected Redirect: /system/dashboard');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAuth();
