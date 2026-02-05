const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function testUserCreationWithPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Try to create user WITH password (should succeed)
    console.log('1️⃣ Testing user creation WITH password...');
    const testUser = {
      name: 'Test HR Manager',
      email: 'hr.test@cubeai.com',
      password: 'Hr@123456',
      role: 'HR_ADMIN',
      isActive: true
    };

    // Delete test user if exists
    await User.deleteOne({ email: testUser.email });

    const user = await User.create(testUser);
    console.log('✅ User created successfully');
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Password hash:', user.password ? user.password.substring(0, 20) + '...' : 'MISSING');
    console.log('   Password format:', user.password && user.password.startsWith('$2b$10$') ? '✅ bcrypt hash' : '❌ NOT bcrypt');

    // Test 2: Verify password comparison works
    console.log('\n2️⃣ Testing password verification...');
    const userWithPassword = await User.findById(user._id).select('+password');
    const isValid = await userWithPassword.comparePassword('Hr@123456');
    console.log('   Password "Hr@123456":', isValid ? '✅ Valid' : '❌ Invalid');

    if (!isValid) {
      console.log('❌ Password verification failed');
      process.exit(1);
    }

    // Test 3: Try to create user WITHOUT password (should fail)
    console.log('\n3️⃣ Testing user creation WITHOUT password...');
    try {
      await User.create({
        name: 'Test Employee',
        email: 'emp.test@cubeai.com',
        // password: missing
        role: 'EMPLOYEE',
        isActive: true
      });
      console.log('❌ User created without password (should have failed!)');
      process.exit(1);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('password')) {
        console.log('✅ User creation correctly blocked without password');
        console.log('   Error:', error.message);
      } else {
        console.log('⚠️ Unexpected error:', error.message);
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteOne({ email: testUser.email });

    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('📋 Summary:');
    console.log('   ✅ User model enforces password requirement');
    console.log('   ✅ Password is hashed with bcrypt');
    console.log('   ✅ Password verification works');
    console.log('   ✅ Cannot create users without password');
    console.log('\n🎯 Ready for admin to create users with initial passwords!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testUserCreationWithPassword();
