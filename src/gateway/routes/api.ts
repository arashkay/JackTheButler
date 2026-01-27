/**
 * API Routes
 *
 * Main API route aggregation. Individual resource routes
 * will be added in later phases.
 */

import { Hono } from 'hono';
import { authRoutes } from './auth.js';

const api = new Hono();

// Authentication routes
api.route('/auth', authRoutes);

// Placeholder for future routes
// Phase 3: api.route('/conversations', conversationRoutes);
// Phase 3: api.route('/messages', messageRoutes);
// Phase 5: api.route('/guests', guestRoutes);
// Phase 5: api.route('/tasks', taskRoutes);
// Phase 6: api.route('/staff', staffRoutes);

/**
 * GET /api/v1
 * API info endpoint
 */
api.get('/', (c) => {
  return c.json({
    name: 'Jack The Butler API',
    version: 'v1',
    documentation: '/docs',
  });
});

export { api as apiRoutes };
