/**
 * Database Seed Script
 *
 * Creates essential settings for the application.
 * The admin user is created by the migration.
 * Sample/demo data is loaded separately via the UI (POST /api/v1/seed/demo).
 *
 * Run with: pnpm db:seed
 */

import { db, settings } from './index.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('seed');

async function seed() {
  log.info('Starting database seed...');

  // Check if already seeded
  const existing = await db.select().from(settings).limit(1);
  if (existing.length > 0) {
    log.info('Database already seeded, skipping');
    return;
  }

  // Seed essential settings
  const settingsData = [
    { key: 'hotel.name', value: 'Demo Hotel' },
    { key: 'hotel.timezone', value: 'UTC' },
    { key: 'ai.provider', value: 'anthropic' },
    { key: 'ai.model', value: 'claude-sonnet-4-20250514' },
  ];

  for (const setting of settingsData) {
    await db.insert(settings).values(setting);
  }
  log.info({ count: settingsData.length }, 'Seeded settings');

  log.info('Database seed complete!');
}

seed().catch((error) => {
  log.error({ error }, 'Seed failed');
  process.exit(1);
});
