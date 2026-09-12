import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL is missing from .env');
  process.exit(1);
}

function dbConfig() {
  const u = new URL(url);

  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
}

async function columnExists(
  conn: mysql.Connection,
  table: string,
  column: string
): Promise<boolean> {
  const [rows] = await conn.query<any[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );

  return rows.length > 0;
}

async function tableExists(
  conn: mysql.Connection,
  table: string
): Promise<boolean> {
  const [rows] = await conn.query<any[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [table]
  );

  return rows.length > 0;
}

async function main() {
  const conn = await mysql.createConnection(dbConfig());

  console.log('✅ Connected to Railway MySQL');

  try {
    /*
     * USERS
     */
    console.log('\n[1/6] Checking users table...');

    if (!(await tableExists(conn, 'users'))) {
      console.log('Creating users table...');

      await conn.query(`
        CREATE TABLE users (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          google_id VARCHAR(255) NULL UNIQUE,
          email VARCHAR(255) NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NULL,
          avatar_url TEXT NULL,
          role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
          status ENUM('ACTIVE','BANNED','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
          bio TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL
        )
      `);

      console.log('✅ users table created');
    } else {
      console.log('users table already exists');

      const requiredColumns = [
        ['google_id', 'VARCHAR(255) NULL'],
        ['email', 'VARCHAR(255) NULL'],
        ['name', 'VARCHAR(255) NULL'],
        ['username', 'VARCHAR(100) NULL'],
        ['password_hash', 'VARCHAR(255) NULL'],
        ['avatar_url', 'TEXT NULL'],
        ['role', "VARCHAR(20) NOT NULL DEFAULT 'USER'"],
        ['status', "VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'"],
        ['bio', 'TEXT NULL'],
        ['created_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP'],
        ['updated_at', 'TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
        ['last_login', 'TIMESTAMP NULL']
      ] as const;

      for (const [name, definition] of requiredColumns) {
        if (!(await columnExists(conn, 'users', name))) {
          console.log(`Adding users.${name}...`);

          await conn.query(
            `ALTER TABLE users ADD COLUMN \`${name}\` ${definition}`
          );

          console.log(`✅ Added ${name}`);
        }
      }

      /*
       * If old database has email column but it is NOT NULL,
       * leave it alone. If it is nullable, create-admin can still
       * work correctly.
       */
    }

    /*
     * Check users.id compatibility.
     */
    const [idRows] = await conn.query<any[]>(
      `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'id'
       LIMIT 1`
    );

    if (!idRows.length) {
      throw new Error(
        'users.id does not exist. Your database has a severely incompatible users table.'
      );
    }

    console.log(`users.id type: ${idRows[0].COLUMN_TYPE}`);

    /*
     * OAuth
     *
     * The previous error:
     * user_id and users.id incompatible
     *
     * OAuth records are safe to recreate because Google OAuth
     * associations can be recreated on next Google login.
     */
    console.log('\n[2/6] Repairing oauth_accounts...');

    if (await tableExists(conn, 'oauth_accounts')) {
      console.log('Dropping old oauth_accounts table...');
      await conn.query(`DROP TABLE oauth_accounts`);
      console.log('✅ Old oauth_accounts removed');
    }

    await conn.query(`
      CREATE TABLE oauth_accounts (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY oauth_provider_account (provider, provider_id),
        CONSTRAINT oauth_accounts_user_fk
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      )
    `);

    console.log('✅ oauth_accounts recreated');

    /*
     * Other expected tables.
     * These are created only if they don't exist.
     */
    console.log('\n[3/6] Checking tournaments...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        game VARCHAR(100) NOT NULL DEFAULT 'free-fire',
        type VARCHAR(50) NOT NULL DEFAULT 'squad',
        entry_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
        max_slots INT NOT NULL DEFAULT 100,
        filled_slots INT NOT NULL DEFAULT 0,
        scheduled_at DATETIME NULL,
        room_id VARCHAR(255) NULL,
        room_password VARCHAR(255) NULL,
        map VARCHAR(100) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING',
        description TEXT NULL,
        created_by VARCHAR(36) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ tournaments checked');

    console.log('\n[4/6] Checking teams...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        tournament_id VARCHAR(36) NULL,
        name VARCHAR(255) NOT NULL,
        captain_id VARCHAR(36) NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'squad',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ teams checked');

    console.log('\n[5/6] Checking notifications...');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'INFO',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ notifications checked');

    console.log('\n[6/6] Checking database...');

    const [tables] = await conn.query<any[]>(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME`
    );

    console.log('\n========================================');
    console.log(' DATABASE REPAIR COMPLETE');
    console.log('========================================');
    console.log('Tables currently present:');

    for (const row of tables) {
      console.log(`  ✓ ${row.TABLE_NAME}`);
    }

    console.log('\n✅ Railway database is reachable.');
    console.log('✅ users schema checked.');
    console.log('✅ oauth_accounts repaired.');
    console.log('========================================');
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error('\n❌ DATABASE REPAIR FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
