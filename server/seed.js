const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminExists = await User.findOne({ role: 'Admin' });
    if (!adminExists) {
      const admin = new User({
        name: 'Admin',
        role: 'Admin',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
        password: 'admin'
      });
      await admin.save();
      console.log('Admin user seeded successfully!');
    } else {
      console.log('Admin user already exists.');
    }
    
    process.exit();
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seedAdmin();
