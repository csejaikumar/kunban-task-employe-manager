const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const projects = await mongoose.connection.db.collection('projects').find({}).toArray();
    console.log('Projects count:', projects.length);
    console.log('Projects:', JSON.stringify(projects, null, 2));
    
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('Users count:', users.length);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkData();
