#!/usr/bin/env node
import dotenv from 'dotenv';
import readline from 'readline';
import bcrypt from 'bcrypt';
import { connectDatabase, verifyConnection, getPool } from './database/index.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n🔧 ZyroBattle Admin Account Setup\n');
  console.log('This will create or update the administrator account.\n');

  try {
    await connectDatabase();
    await verifyConnection();
    console.log('[DB] Connected successfully\n');
  } catch (error) {
    console.error('[DB] Failed to connect:', (error as Error).message);
    console.log('\nMake sure your DATABASE_URL or DB_* environment variables are set correctly.');
    process.exit(1);
  }

  const pool = getPool();

  const name = await ask('Admin name (e.g., Zohaib): ');
  const email = await ask('Admin email: ');
  const username = await ask('Admin username: ');
  const password = await ask('Admin password (min 6 chars): ');

  if (!name || !email || !username || !password) {
    console.error('\n❌ All fields are required.');
    rl.close();
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('\n❌ Password must be at least 6 characters.');
    rl.close();
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(password, 12);

  // Check if admin already exists
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]) as any;

  if (Array.isArray(existing) && existing.length > 0) {
    // Update existing user to admin
    await pool.query(
      'UPDATE users SET name = ?, username = ?, password_hash = ?, role = "ADMIN", status = "ACTIVE" WHERE id = ?',
      [name, username, password_hash, existing[0].id]
    );
    console.log('\n✅ Admin account updated successfully!');
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log('   Role: ADMIN');
  } else {
    // Create new admin
    const id = uuidv4();
    await pool.query(
      'INSERT INTO users (id, email, name, username, password_hash, role, status) VALUES (?, ?, ?, ?, ?, "ADMIN", "ACTIVE")',
      [id, email, name, username, password_hash]
    );
    console.log('\n✅ Admin account created successfully!');
    console.log(`   ID: ${id}`);
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Username: ${username}`);
    console.log('   Role: ADMIN');
  }

  console.log('\n⚠️  Password is NOT stored in plain text. It is securely hashed with bcrypt.');
  console.log('🔒 Never share or log passwords.\n');

  rl.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  rl.close();
  process.exit(1);
});
