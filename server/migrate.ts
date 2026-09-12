import 'dotenv/config';
import { connectDatabase, verifyConnection, runMigrations, seedDatabase } from './database/index.js';

async function main() {
  console.log('[MIGRATE] Connecting to MySQL...');
  await connectDatabase();
  await verifyConnection();
  console.log('[MIGRATE] MySQL connection OK');
  await runMigrations();
  await seedDatabase();
  console.log('[MIGRATE] DONE');
  process.exit(0);
}

main().catch((error) => {
  console.error('[MIGRATE] FAILED:', error instanceof Error ? error.message : error);
  process.exit(1);
});
