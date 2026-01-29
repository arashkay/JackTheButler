/**
 * Route Exports
 */

export { healthRoutes } from './health.js';
export { authRoutes } from './auth.js';
export { apiRoutes } from './api.js';
export { conversationsRouter } from './conversations.js';
export { extensionRoutes, legacyIntegrationRoutes } from './extensions.js';
export { automationRoutes } from './automation.js';

/**
 * @deprecated Use extensionRoutes instead
 */
export { legacyIntegrationRoutes as integrationRoutes } from './extensions.js';
