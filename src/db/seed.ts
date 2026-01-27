/**
 * Database Seed Script
 *
 * Creates initial data for development/testing.
 * Run with: pnpm db:seed
 */

import { db, staff, settings } from './index.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('seed');

async function seed() {
  log.info('Starting database seed...');

  // Check if already seeded
  const existingStaff = await db.select().from(staff).limit(1);
  if (existingStaff.length > 0) {
    log.info('Database already seeded, skipping');
    return;
  }

  // Seed settings
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

  // Seed staff users
  const staffData = [
    {
      id: 'staff-admin-001',
      email: 'admin@hotel.com',
      name: 'Admin User',
      role: 'admin',
      department: 'management',
      permissions: JSON.stringify(['*']),
      status: 'active',
      passwordHash: 'admin123', // In production, this would be hashed
    },
    {
      id: 'staff-manager-001',
      email: 'manager@hotel.com',
      name: 'Hotel Manager',
      role: 'manager',
      department: 'management',
      permissions: JSON.stringify(['guests:read', 'guests:write', 'tasks:*', 'staff:read']),
      status: 'active',
      passwordHash: 'manager123',
    },
    {
      id: 'staff-concierge-001',
      email: 'concierge@hotel.com',
      name: 'Concierge Staff',
      role: 'concierge',
      department: 'front_desk',
      permissions: JSON.stringify(['guests:read', 'tasks:read', 'tasks:write']),
      status: 'active',
      passwordHash: 'concierge123',
    },
  ];

  for (const member of staffData) {
    await db.insert(staff).values(member);
  }
  log.info({ count: staffData.length }, 'Seeded staff');

  log.info('Database seed complete!');
}

seed().catch((error) => {
  log.error({ error }, 'Seed failed');
  process.exit(1);
});
