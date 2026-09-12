import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}

const u = new URL(url);

const config = {
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: decodeURIComponent(u.pathname.replace(/^\//, '')),
};

async function main() {
  const db = await mysql.createConnection(config);

  try {
    console.log('✅ Connected to Railway MySQL');

    const [rows] = await db.query<any[]>(
      `SELECT COLUMN_TYPE, IS_NULLABLE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'id'
       LIMIT 1`
    );

    if (!rows.length) {
      throw new Error('users.id column does not exist');
    }

    console.log(`Current users.id: ${rows[0].COLUMN_TYPE}`);

    if (rows[0].COLUMN_TYPE.toLowerCase().includes('varchar')) {
      console.log('✅ users.id is already VARCHAR');
      return;
    }

    /*
     * Remove foreign keys referencing users.id first.
     */
    const [fkRows] = await db.query<any[]>(
      `SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME = 'users'
       AND REFERENCED_COLUMN_NAME = 'id'`
    );

    for (const fk of fkRows) {
      console.log(
        `Removing FK ${fk.CONSTRAINT_NAME} from ${fk.TABLE_NAME}.${fk.COLUMN_NAME}`
      );

      await db.query(
        `ALTER TABLE \`${fk.TABLE_NAME}\`
         DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
      );
    }

    /*
     * Convert users.id to UUID-compatible string.
     *
     * Existing numeric IDs are preserved as strings.
     * New accounts created by the application use UUIDs.
     */
    console.log('Converting users.id to VARCHAR(36)...');

    await db.query(`
      ALTER TABLE users
      MODIFY COLUMN id VARCHAR(36) NOT NULL
    `);

    console.log('✅ users.id converted to VARCHAR(36)');

    /*
     * Repair common FK columns.
     */
    const [tableRows] = await db.query<any[]>(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()`
    );

    for (const table of tableRows) {
      const tableName = table.TABLE_NAME;

      const [columns] = await db.query<any[]>(
        `SELECT COLUMN_NAME, COLUMN_TYPE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME IN ('user_id','created_by','captain_id')`,
        [tableName]
      );

      for (const column of columns) {
        if (!column.COLUMN_TYPE.toLowerCase().includes('varchar')) {
          console.log(
            `Converting ${tableName}.${column.COLUMN_NAME} to VARCHAR(36)...`
          );

          await db.query(
            `ALTER TABLE \`${tableName}\`
             MODIFY COLUMN \`${column.COLUMN_NAME}\` VARCHAR(36) NULL`
          );
        }
      }
    }

    /*
     * Recreate OAuth table cleanly.
     */
    const [oauth] = await db.query<any[]>(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'oauth_accounts'`
    );

    if (oauth.length) {
      console.log('Recreating oauth_accounts...');
      await db.query(`DROP TABLE oauth_accounts`);
    }

    await db.query(`
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

    console.log('✅ oauth_accounts repaired');

    console.log('');
    console.log('========================================');
    console.log(' USERS ID REPAIR COMPLETE');
    console.log('========================================');
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('');
  console.error('❌ REPAIR FAILED');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
