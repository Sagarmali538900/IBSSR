/**
 * Seed script to create default admin user.
 * Run with: node src/scripts/seed.js
 *
 * Manually loads .env.local since plain Node doesn't do it like Next.js does.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env.local manually ────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const envPath    = resolve(__dirname, '../../.env.local');

try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let   val = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
  console.log('.env.local loaded successfully.');
} catch (err) {
  console.error('Could not read .env.local:', err.message);
  process.exit(1);
}

// ── Now import app modules (they read process.env at import time) ───
const { default: dbConnect } = await import('../lib/db.js');
const { User }               = await import('../lib/models.js');
const { hashPassword }       = await import('../lib/auth.js');

// ── Seed logic ──────────────────────────────────────────────────────
async function main() {
  await dbConnect();

  const adminUsername = 'admin';
  const adminEmail   = 'admin@ibssr.org';
  const adminPassword = 'SuperSecret123'; // Change after first login!

  const existing = await User.findOne({ username: adminUsername });
  if (existing) {
    console.log('Admin user already exists. Skipping creation.');
    return;
  }

  const hashed = await hashPassword(adminPassword);
  const admin  = await User.create({
    username:    adminUsername,
    email:       adminEmail,
    password:    hashed,
    isSuperuser: true,
    isActive:    true,
  });

  console.log('Created admin user:');
  console.log(`  username : ${admin.username}`);
  console.log(`  email    : ${admin.email}`);
  console.log('  password : SuperSecret123 (change after first login)');
}

main()
  .then(() => {
    console.log('\nSeed script completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  });
