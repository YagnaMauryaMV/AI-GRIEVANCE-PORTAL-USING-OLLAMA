require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_grievance_db';
const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@1234';

const accounts = [
  { username: 'admin@gok', roles: ['super'] },
  { username: 'water@gok', roles: ['water'] },
  { username: 'electricity@gok', roles: ['electricity'] },
  { username: 'potholes@gok', roles: ['potholes'] },
  { username: 'police@gok', roles: ['police'] },
];

async function run() {
  await mongoose.connect(MONGO_URI);

  for (const acct of accounts) {
    const existing = await Admin.findOne({ username: acct.username });
    if (existing) {
      console.log('Already exists:', acct.username);
      continue;
    }
    const hash = await bcrypt.hash(defaultPassword, 10);
    await Admin.create({ username: acct.username, passwordHash: hash, roles: acct.roles, createdAt: new Date() });
    console.log('Seeded admin ->', acct.username, ' password:', defaultPassword);
  }

  console.log('Seeding complete');
  process.exit(0);
}

run().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
