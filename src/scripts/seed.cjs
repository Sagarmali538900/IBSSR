'use strict';

/**
 * Seed script (CommonJS) to create default admin user.
 * Run with: `node src/scripts/seed.cjs`
 */

const path = require('path');
const dbConnect = require(path.resolve(__dirname, '../../lib/db.js')).default;
const { User } = require(path.resolve(__dirname, '../../lib/models.js'));
const { hashPassword } = require(path.resolve(__dirname, '../../lib/auth.js'));

async function main() {
  await dbConnect();

  const adminUsername = 'admin';
  const adminEmail = 'admin@ibssr.org';
  const adminPassword = 'SuperSecret123'; // Change after first login!

  const existing = await User.findOne({ username: adminUsername });
  if (existing) {
    console.log('Admin user already exists. Skipping creation.');
    return;
  }

  const hashed = await hashPassword(adminPassword);
  const admin = await User.create({
    username: adminUsername,
    email: adminEmail,
    password: hashed,
    isSuperuser: true,
    isActive: true
  });

  console.log('Created admin user:');
  console.log(`  username: ${admin.username}`);
  console.log(`  email: ${admin.email}`);
  console.log('  password: (the password you set above)');
}

main()
  .then(() => {
    console.log('Seed script completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  });
