/**
 * System Status Routes
 *
 * Provides system health and status information for the dashboard.
 *
 * @module gateway/routes/system
 */

import { Hono } from 'hono';
import { getExtensionRegistry } from '@/extensions/index.js';
import type { AIExtensionManifest } from '@/extensions/types.js';

/**
 * System issue severity levels
 */
type IssueSeverity = 'critical' | 'warning' | 'info';

/**
 * System issue with actionable information
 */
interface SystemIssue {
  type: string;
  severity: IssueSeverity;
  message: string;
  action?: {
    label: string;
    route: string;
  };
}

/**
 * System status response
 */
interface SystemStatus {
  healthy: boolean;
  issues: SystemIssue[];
  providers: {
    completion: string | null;
    embedding: string | null;
    completionIsLocal: boolean;
    embeddingIsLocal: boolean;
  };
  extensions: {
    ai: number;
    channel: number;
    pms: number;
    tool: number;
  };
}

const systemRoutes = new Hono();

/**
 * GET /api/v1/system/status
 * Returns system health and critical issues
 */
systemRoutes.get('/status', async (c) => {
  const registry = getExtensionRegistry();
  const issues: SystemIssue[] = [];

  // Get providers
  const completionProvider = registry.getCompletionProvider();
  const embeddingProvider = registry.getEmbeddingProvider();

  // Check completion capability
  if (!completionProvider) {
    issues.push({
      type: 'no_completion_provider',
      severity: 'critical',
      message: 'No AI provider configured for conversations',
      action: { label: 'Configure AI', route: '/settings/integrations' },
    });
  }

  // Check embedding capability
  if (!embeddingProvider) {
    issues.push({
      type: 'no_embedding_provider',
      severity: 'critical',
      message: 'No embedding provider available for knowledge search',
      action: { label: 'Configure AI', route: '/settings/integrations' },
    });
  } else if (embeddingProvider.name === 'local' && completionProvider?.name !== 'local') {
    // Using local embeddings as fallback
    issues.push({
      type: 'using_local_embeddings',
      severity: 'info',
      message: 'Using local embeddings (first search may be slow while model downloads)',
      action: { label: 'Configure OpenAI', route: '/settings/integrations' },
    });
  }

  // Check if using local completion (warn about quality/speed)
  if (completionProvider?.name === 'local') {
    issues.push({
      type: 'using_local_completion',
      severity: 'warning',
      message: 'Using local AI for responses (slower, lower quality than cloud AI)',
      action: { label: 'Configure Cloud AI', route: '/settings/integrations' },
    });
  }

  // Count active extensions by category
  const allExtensions = registry.getAll();
  const activeByCategory = {
    ai: 0,
    channel: 0,
    pms: 0,
    tool: 0,
  };

  for (const ext of allExtensions) {
    if (ext.status === 'active') {
      const category = ext.manifest.category as keyof typeof activeByCategory;
      if (category in activeByCategory) {
        activeByCategory[category]++;
      }
    }
  }

  // Check for no channels configured
  if (activeByCategory.channel === 0) {
    issues.push({
      type: 'no_channels',
      severity: 'warning',
      message: 'No messaging channels configured',
      action: { label: 'Configure Channels', route: '/settings/integrations' },
    });
  }

  const status: SystemStatus = {
    healthy: issues.filter((i) => i.severity === 'critical').length === 0,
    issues,
    providers: {
      completion: completionProvider?.name ?? null,
      embedding: embeddingProvider?.name ?? null,
      completionIsLocal: completionProvider?.name === 'local',
      embeddingIsLocal: embeddingProvider?.name === 'local',
    },
    extensions: activeByCategory,
  };

  return c.json(status);
});

/**
 * GET /api/v1/system/capabilities
 * Returns what capabilities are available based on configured providers
 */
systemRoutes.get('/capabilities', async (c) => {
  const registry = getExtensionRegistry();

  const completionProvider = registry.getCompletionProvider();
  const embeddingProvider = registry.getEmbeddingProvider();

  // Get capabilities from active AI providers
  const aiExtensions = registry.getActiveByCategory('ai');
  const capabilities = {
    completion: !!completionProvider,
    embedding: !!embeddingProvider,
    streaming: false,
  };

  // Check if any provider supports streaming
  for (const ext of aiExtensions) {
    const manifest = ext.manifest as AIExtensionManifest;
    if (manifest.capabilities?.streaming) {
      capabilities.streaming = true;
      break;
    }
  }

  return c.json({
    capabilities,
    providers: {
      completion: completionProvider?.name ?? null,
      embedding: embeddingProvider?.name ?? null,
    },
  });
});

export { systemRoutes };
