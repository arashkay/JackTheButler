/**
 * Extension Management API Routes
 *
 * Endpoints for managing extensions (AI providers, channels, PMS).
 * Replaces the old integrations routes.
 *
 * @module gateway/routes/extensions
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { extensionConfigService } from '@/services/extension-config.js';
import { getAllManifests, getManifest } from '@/extensions/index.js';
import { createLogger } from '@/utils/logger.js';
import { maskConfig } from '@/utils/crypto.js';

const log = createLogger('api:extensions');

/**
 * Extension routes
 */
export const extensionRoutes = new Hono();

// ==================
// List Extensions
// ==================

/**
 * GET /api/v1/extensions
 * List all available extensions with their status
 */
extensionRoutes.get('/', async (c) => {
  const extensions = await extensionConfigService.listExtensions();

  // Transform for API response (compatible with old integrations format)
  const response = extensions.map((ext) => ({
    id: ext.manifest.id,
    name: ext.manifest.name,
    category: ext.manifest.category,
    description: ext.manifest.description,
    icon: ext.manifest.icon ?? null,
    version: ext.manifest.version,
    docsUrl: ext.manifest.docsUrl ?? null,
    status: ext.status,
    enabled: ext.config?.enabled ?? false,
    isActive: ext.isActive,
    lastChecked: ext.config?.lastCheckedAt?.toISOString() ?? null,
    lastError: ext.config?.lastError ?? null,
    configSchema: ext.manifest.configSchema,
  }));

  return c.json({ extensions: response });
});

/**
 * GET /api/v1/extensions/categories
 * List extensions grouped by category
 */
extensionRoutes.get('/categories', async (c) => {
  const groups = await extensionConfigService.listExtensionsByCategory();

  return c.json({
    categories: groups.map((g) => ({
      id: g.category,
      label: g.categoryLabel,
      extensions: g.extensions.map((ext) => ({
        id: ext.manifest.id,
        name: ext.manifest.name,
        description: ext.manifest.description,
        icon: ext.manifest.icon ?? null,
        status: ext.status,
        enabled: ext.config?.enabled ?? false,
        isActive: ext.isActive,
      })),
    })),
  });
});

// ==================
// Get Extension Registry (Static Manifests)
// ==================

/**
 * GET /api/v1/extensions/registry
 * Get the static extension registry (available extensions)
 */
extensionRoutes.get('/registry', async (c) => {
  const manifests = getAllManifests();

  return c.json({
    extensions: manifests.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      version: m.version,
      description: m.description,
      icon: m.icon ?? null,
      docsUrl: m.docsUrl ?? null,
      configSchema: m.configSchema,
    })),
  });
});

// ==================
// Get Extension Details
// ==================

/**
 * GET /api/v1/extensions/:extensionId
 * Get detailed extension info with config schema
 */
extensionRoutes.get('/:extensionId', async (c) => {
  const { extensionId } = c.req.param();

  const extension = await extensionConfigService.getExtension(extensionId);
  if (!extension) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  const maskedConfig = extension.config
    ? maskConfig(extension.config.config)
    : null;

  return c.json({
    id: extension.manifest.id,
    name: extension.manifest.name,
    category: extension.manifest.category,
    version: extension.manifest.version,
    description: extension.manifest.description,
    icon: extension.manifest.icon ?? null,
    docsUrl: extension.manifest.docsUrl ?? null,
    configSchema: extension.manifest.configSchema,
    status: extension.status,
    enabled: extension.config?.enabled ?? false,
    isActive: extension.isActive,
    config: maskedConfig,
    lastChecked: extension.config?.lastCheckedAt?.toISOString() ?? null,
    lastError: extension.config?.lastError ?? null,
  });
});

// ==================
// Update Extension Config
// ==================

const updateConfigSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
});

/**
 * PUT /api/v1/extensions/:extensionId
 * Update extension config
 */
extensionRoutes.put('/:extensionId', async (c) => {
  const { extensionId } = c.req.param();

  const manifest = getManifest(extensionId);
  if (!manifest) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  const body = await c.req.json();
  const parsed = updateConfigSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
  }

  const { enabled, config } = parsed.data;

  // Get existing config
  const existing = await extensionConfigService.getExtensionConfig(extensionId);

  // Trim string values and filter out masked credentials
  const trimmedConfig: Record<string, string | boolean | number> = {};
  if (config) {
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.includes('*')) {
          continue; // Skip masked values
        }
        trimmedConfig[key] = trimmed;
      } else {
        trimmedConfig[key] = value;
      }
    }
  }

  // Merge config
  const newConfig: Record<string, string | boolean | number> = config
    ? { ...(existing?.config ?? {}), ...trimmedConfig }
    : existing?.config ?? {};

  // Save config
  const result = await extensionConfigService.saveExtensionConfig(
    extensionId,
    newConfig,
    enabled ?? existing?.enabled ?? false
  );

  log.info({ extensionId, enabled: result.enabled }, 'Extension config updated');

  return c.json({
    success: true,
    config: {
      enabled: result.enabled,
      status: result.status,
      config: maskConfig(result.config),
      lastChecked: result.lastCheckedAt?.toISOString() ?? null,
    },
  });
});

// ==================
// Delete Extension Config
// ==================

/**
 * DELETE /api/v1/extensions/:extensionId
 * Delete extension config
 */
extensionRoutes.delete('/:extensionId', async (c) => {
  const { extensionId } = c.req.param();

  const deleted = await extensionConfigService.deleteExtensionConfig(extensionId);

  if (!deleted) {
    return c.json({ error: 'Extension config not found' }, 404);
  }

  log.info({ extensionId }, 'Extension config deleted');

  return c.json({ success: true });
});

// ==================
// Test Extension Connection
// ==================

/**
 * POST /api/v1/extensions/:extensionId/test
 * Test extension connection
 */
extensionRoutes.post('/:extensionId/test', async (c) => {
  const { extensionId } = c.req.param();

  const manifest = getManifest(extensionId);
  if (!manifest) {
    return c.json({ error: 'Extension not found' }, 404);
  }

  const config = await extensionConfigService.getExtensionConfig(extensionId);
  if (!config) {
    return c.json({ error: 'Extension not configured' }, 400);
  }

  const result = await extensionConfigService.testExtensionConnection(extensionId);

  log.info(
    { extensionId, success: result.success, latencyMs: result.latencyMs },
    'Connection test completed'
  );

  return c.json({
    success: result.success,
    message: result.message,
    details: result.details ?? null,
    latencyMs: result.latencyMs ?? null,
  });
});

// ==================
// Toggle Extension Enabled
// ==================

/**
 * POST /api/v1/extensions/:extensionId/toggle
 * Enable or disable an extension
 */
extensionRoutes.post('/:extensionId/toggle', async (c) => {
  const { extensionId } = c.req.param();

  const body = await c.req.json();
  const enabled = body.enabled === true;

  const result = await extensionConfigService.setExtensionEnabled(extensionId, enabled);

  if (!result) {
    return c.json({ error: 'Extension config not found' }, 404);
  }

  log.info({ extensionId, enabled }, 'Extension toggled');

  return c.json({
    success: true,
    enabled: result.enabled,
    status: result.status,
  });
});

// ==================
// Get Extension Logs
// ==================

/**
 * GET /api/v1/extensions/:extensionId/logs
 * Get extension event logs
 */
extensionRoutes.get('/:extensionId/logs', async (c) => {
  const { extensionId } = c.req.param();
  const limit = parseInt(c.req.query('limit') ?? '50', 10);

  const logs = await extensionConfigService.getExtensionLogs(
    extensionId,
    Math.min(limit, 100)
  );

  return c.json({
    logs: logs.map((log) => ({
      id: log.id,
      extensionId: log.extensionId,
      eventType: log.eventType,
      status: log.status,
      details: log.details,
      errorMessage: log.errorMessage,
      latencyMs: log.latencyMs,
      createdAt: log.createdAt.toISOString(),
    })),
  });
});

// ==================
// Backward Compatibility: Integrations API
// ==================
// These routes maintain compatibility with the old dashboard

/**
 * GET /api/v1/integrations (legacy)
 * Maps to extensions API format expected by old dashboard
 */
export const legacyIntegrationRoutes = new Hono();

legacyIntegrationRoutes.get('/', async (c) => {
  const extensions = await extensionConfigService.listExtensions();

  // Group extensions by legacy integration categories
  const integrationGroups: Record<
    string,
    {
      id: string;
      name: string;
      category: string;
      description: string;
      icon: string;
      required: boolean;
      multiProvider: boolean;
      providers: Array<{
        id: string;
        name: string;
        status: string;
        enabled: boolean;
        lastChecked: string | null;
        lastError: string | null;
      }>;
      activeProvider: string | null;
      status: string;
    }
  > = {};

  for (const ext of extensions) {
    const legacyId = getLegacyIntegrationId(ext.manifest.category, ext.manifest.id);
    const legacyName = getLegacyIntegrationName(legacyId);

    if (!integrationGroups[legacyId]) {
      integrationGroups[legacyId] = {
        id: legacyId,
        name: legacyName,
        category: ext.manifest.category === 'channel' ? 'channels' : ext.manifest.category,
        description: `${legacyName} integration`,
        icon: getIntegrationIcon(legacyId),
        required: legacyId === 'ai',
        multiProvider: true,
        providers: [],
        activeProvider: null,
        status: 'not_configured',
      };
    }

    integrationGroups[legacyId].providers.push({
      id: ext.manifest.id,
      name: ext.manifest.name,
      status: ext.status,
      enabled: ext.config?.enabled ?? false,
      lastChecked: ext.config?.lastCheckedAt?.toISOString() ?? null,
      lastError: ext.config?.lastError ?? null,
    });

    // Update integration status based on providers
    if (ext.status === 'connected' && ext.config?.enabled) {
      integrationGroups[legacyId].status = 'connected';
      integrationGroups[legacyId].activeProvider = ext.manifest.id;
    } else if (ext.status === 'error' && ext.config?.enabled) {
      if (integrationGroups[legacyId].status !== 'connected') {
        integrationGroups[legacyId].status = 'error';
      }
    } else if (ext.config?.enabled) {
      if (
        integrationGroups[legacyId].status !== 'connected' &&
        integrationGroups[legacyId].status !== 'error'
      ) {
        integrationGroups[legacyId].status = 'configured';
      }
    }
  }

  return c.json({ integrations: Object.values(integrationGroups) });
});

legacyIntegrationRoutes.get('/registry', async (c) => {
  const manifests = getAllManifests();

  // Group by legacy integration IDs
  const integrations: Record<string, unknown> = {};

  for (const m of manifests) {
    const legacyId = getLegacyIntegrationId(m.category, m.id);

    if (!integrations[legacyId]) {
      integrations[legacyId] = {
        id: legacyId,
        name: getLegacyIntegrationName(legacyId),
        category: m.category === 'channel' ? 'channels' : m.category,
        description: `${getLegacyIntegrationName(legacyId)} integration`,
        icon: getIntegrationIcon(legacyId),
        required: legacyId === 'ai',
        multiProvider: true,
        providers: [],
      };
    }

    (integrations[legacyId] as { providers: unknown[] }).providers.push({
      id: m.id,
      name: m.name,
      description: m.description,
      docsUrl: m.docsUrl ?? null,
      configSchema: m.configSchema,
    });
  }

  return c.json({ integrations: Object.values(integrations) });
});

legacyIntegrationRoutes.get('/:integrationId', async (c) => {
  const { integrationId } = c.req.param();

  // Map legacy integration ID to extensions
  const extensions = await extensionConfigService.listExtensions();
  const matchingExts = extensions.filter(
    (ext) => getLegacyIntegrationId(ext.manifest.category, ext.manifest.id) === integrationId
  );

  if (matchingExts.length === 0) {
    return c.json({ error: 'Integration not found' }, 404);
  }

  const providers = matchingExts.map((ext) => ({
    id: ext.manifest.id,
    name: ext.manifest.name,
    description: ext.manifest.description,
    docsUrl: ext.manifest.docsUrl ?? null,
    configSchema: ext.manifest.configSchema,
    status: ext.status,
    enabled: ext.config?.enabled ?? false,
    config: ext.config ? maskConfig(ext.config.config) : null,
    lastChecked: ext.config?.lastCheckedAt?.toISOString() ?? null,
    lastError: ext.config?.lastError ?? null,
  }));

  const activeProvider = providers.find((p) => p.enabled && p.status === 'connected');
  const hasError = providers.some((p) => p.enabled && p.status === 'error');

  let overallStatus = 'not_configured';
  if (activeProvider) {
    overallStatus = 'connected';
  } else if (hasError) {
    overallStatus = 'error';
  } else if (providers.some((p) => p.enabled)) {
    overallStatus = 'configured';
  }

  return c.json({
    id: integrationId,
    name: getLegacyIntegrationName(integrationId),
    category: matchingExts[0]?.manifest.category === 'channel' ? 'channels' : matchingExts[0]?.manifest.category,
    description: `${getLegacyIntegrationName(integrationId)} integration`,
    icon: getIntegrationIcon(integrationId),
    required: integrationId === 'ai',
    multiProvider: true,
    providers,
    activeProvider: activeProvider?.id ?? null,
    status: overallStatus,
  });
});

// Provider-specific routes for backward compatibility
legacyIntegrationRoutes.get('/:integrationId/providers/:providerId', async (c) => {
  const { providerId } = c.req.param();

  const ext = await extensionConfigService.getExtension(providerId);
  if (!ext) {
    return c.json({ error: 'Provider not found' }, 404);
  }

  return c.json({
    integrationId: getLegacyIntegrationId(ext.manifest.category, ext.manifest.id),
    providerId: ext.manifest.id,
    providerName: ext.manifest.name,
    configSchema: ext.manifest.configSchema,
    config: ext.config
      ? {
          enabled: ext.config.enabled,
          status: ext.config.status,
          config: maskConfig(ext.config.config),
          lastChecked: ext.config.lastCheckedAt?.toISOString() ?? null,
          lastError: ext.config.lastError,
        }
      : null,
  });
});

legacyIntegrationRoutes.put('/:integrationId/providers/:providerId', async (c) => {
  const { providerId } = c.req.param();

  const manifest = getManifest(providerId);
  if (!manifest) {
    return c.json({ error: 'Provider not found' }, 404);
  }

  const body = await c.req.json();
  const parsed = updateConfigSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
  }

  const { enabled, config } = parsed.data;
  const existing = await extensionConfigService.getExtensionConfig(providerId);

  const trimmedConfig: Record<string, string | boolean | number> = {};
  if (config) {
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.includes('*')) continue;
        trimmedConfig[key] = trimmed;
      } else {
        trimmedConfig[key] = value;
      }
    }
  }

  const newConfig = config
    ? { ...(existing?.config ?? {}), ...trimmedConfig }
    : existing?.config ?? {};

  const result = await extensionConfigService.saveExtensionConfig(
    providerId,
    newConfig,
    enabled ?? existing?.enabled ?? false
  );

  log.info({ extensionId: providerId, enabled: result.enabled }, 'Provider config updated');

  return c.json({
    success: true,
    config: {
      enabled: result.enabled,
      status: result.status,
      config: maskConfig(result.config),
      lastChecked: result.lastCheckedAt?.toISOString() ?? null,
    },
  });
});

legacyIntegrationRoutes.delete('/:integrationId/providers/:providerId', async (c) => {
  const { providerId } = c.req.param();

  const deleted = await extensionConfigService.deleteExtensionConfig(providerId);
  if (!deleted) {
    return c.json({ error: 'Provider config not found' }, 404);
  }

  log.info({ extensionId: providerId }, 'Provider config deleted');
  return c.json({ success: true });
});

legacyIntegrationRoutes.post('/:integrationId/providers/:providerId/test', async (c) => {
  const { providerId } = c.req.param();

  const manifest = getManifest(providerId);
  if (!manifest) {
    return c.json({ error: 'Provider not found' }, 404);
  }

  const config = await extensionConfigService.getExtensionConfig(providerId);
  if (!config) {
    return c.json({ error: 'Provider not configured' }, 400);
  }

  const result = await extensionConfigService.testExtensionConnection(providerId);

  log.info({ extensionId: providerId, success: result.success }, 'Connection test completed');

  return c.json({
    success: result.success,
    message: result.message,
    details: result.details ?? null,
    latencyMs: result.latencyMs ?? null,
  });
});

legacyIntegrationRoutes.post('/:integrationId/providers/:providerId/toggle', async (c) => {
  const { providerId } = c.req.param();

  const body = await c.req.json();
  const enabled = body.enabled === true;

  const result = await extensionConfigService.setExtensionEnabled(providerId, enabled);
  if (!result) {
    return c.json({ error: 'Provider config not found' }, 404);
  }

  log.info({ extensionId: providerId, enabled }, 'Provider toggled');

  return c.json({
    success: true,
    enabled: result.enabled,
    status: result.status,
  });
});

legacyIntegrationRoutes.get('/:integrationId/logs', async (c) => {
  const providerId = c.req.query('providerId');
  const limit = parseInt(c.req.query('limit') ?? '50', 10);

  if (!providerId) {
    return c.json({ logs: [] });
  }

  const logs = await extensionConfigService.getExtensionLogs(providerId, Math.min(limit, 100));

  return c.json({
    logs: logs.map((log) => ({
      id: log.id,
      providerId: log.extensionId,
      eventType: log.eventType,
      status: log.status,
      details: log.details,
      errorMessage: log.errorMessage,
      latencyMs: log.latencyMs,
      createdAt: log.createdAt.toISOString(),
    })),
  });
});

// Helper functions for legacy mapping
function getLegacyIntegrationId(category: string, extensionId: string): string {
  switch (category) {
    case 'ai':
      return 'ai';
    case 'channel':
      if (extensionId.startsWith('whatsapp')) return 'whatsapp';
      if (extensionId.startsWith('sms')) return 'sms';
      if (extensionId.startsWith('email')) return 'email';
      if (extensionId.startsWith('webchat')) return 'webchat';
      return 'channel';
    case 'pms':
      return 'pms';
    default:
      return category;
  }
}

function getLegacyIntegrationName(integrationId: string): string {
  const names: Record<string, string> = {
    ai: 'AI Provider',
    whatsapp: 'WhatsApp',
    sms: 'SMS',
    email: 'Email',
    webchat: 'Web Chat',
    pms: 'Property Management System',
  };
  return names[integrationId] ?? integrationId;
}

function getIntegrationIcon(integrationId: string): string {
  const icons: Record<string, string> = {
    ai: 'brain',
    whatsapp: 'message-circle',
    sms: 'smartphone',
    email: 'mail',
    webchat: 'message-square',
    pms: 'building',
  };
  return icons[integrationId] ?? 'puzzle';
}
