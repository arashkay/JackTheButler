/**
 * Extension Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExtensionRegistry,
  getExtensionRegistry,
  resetExtensionRegistry,
} from '@/extensions/registry.js';
import type { AIExtensionManifest, ChannelExtensionManifest } from '@/extensions/types.js';
import type { AIProvider } from '@/core/interfaces/ai.js';

// Mock AI provider
const mockAIProvider: AIProvider = {
  name: 'mock',
  complete: vi.fn().mockResolvedValue({ content: 'test', usage: { inputTokens: 0, outputTokens: 0 } }),
  embed: vi.fn().mockResolvedValue({ embedding: [], usage: { inputTokens: 0, outputTokens: 0 } }),
};

// Mock AI manifest
const mockAIManifest: AIExtensionManifest = {
  id: 'test-ai',
  name: 'Test AI Provider',
  category: 'ai',
  version: '1.0.0',
  description: 'Test AI provider for testing',
  configSchema: [
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
  ],
  capabilities: { completion: true, embedding: true },
  createProvider: vi.fn().mockReturnValue(mockAIProvider),
};

// Mock channel manifest
const mockChannelManifest: ChannelExtensionManifest = {
  id: 'test-channel',
  name: 'Test Channel',
  category: 'channel',
  version: '1.0.0',
  description: 'Test channel for testing',
  configSchema: [
    { key: 'token', label: 'Token', type: 'password', required: true },
  ],
  features: { inbound: true, outbound: true },
  createAdapter: vi.fn().mockReturnValue({
    id: 'test-channel',
    testConnection: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
  }),
};

describe('ExtensionRegistry', () => {
  let registry: ExtensionRegistry;

  beforeEach(() => {
    resetExtensionRegistry();
    registry = new ExtensionRegistry();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register an extension manifest', () => {
      registry.register(mockAIManifest);

      const ext = registry.get('test-ai');
      expect(ext).toBeDefined();
      expect(ext?.manifest.id).toBe('test-ai');
      expect(ext?.status).toBe('registered');
    });

    it('should not register duplicate extensions', () => {
      registry.register(mockAIManifest);
      registry.register(mockAIManifest);

      const all = registry.getAll();
      expect(all.length).toBe(1);
    });

    it('should register multiple extensions', () => {
      registry.registerAll([mockAIManifest, mockChannelManifest]);

      expect(registry.getAll().length).toBe(2);
    });
  });

  describe('configure', () => {
    it('should configure an extension', () => {
      registry.register(mockAIManifest);
      registry.configure('test-ai', { apiKey: 'test-key' });

      const ext = registry.get('test-ai');
      expect(ext?.status).toBe('configured');
      expect(ext?.config).toEqual({ apiKey: 'test-key' });
    });

    it('should throw if extension not found', () => {
      expect(() => registry.configure('unknown', {})).toThrow('Extension not found');
    });

    it('should throw if required config is missing', () => {
      registry.register(mockAIManifest);

      expect(() => registry.configure('test-ai', {})).toThrow('Missing required config fields');
    });
  });

  describe('initialize', () => {
    it('should initialize a configured extension', async () => {
      registry.register(mockAIManifest);
      registry.configure('test-ai', { apiKey: 'test-key' });

      await registry.initialize('test-ai');

      const ext = registry.get('test-ai');
      expect(ext?.status).toBe('active');
      expect(ext?.instance).toBe(mockAIProvider);
      expect(mockAIManifest.createProvider).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });

    it('should throw if extension not configured', async () => {
      registry.register(mockAIManifest);

      await expect(registry.initialize('test-ai')).rejects.toThrow('Extension not configured');
    });

    it('should set error status on initialization failure', async () => {
      const failingManifest: AIExtensionManifest = {
        ...mockAIManifest,
        id: 'failing-ai',
        createProvider: vi.fn().mockImplementation(() => {
          throw new Error('Initialization failed');
        }),
      };

      registry.register(failingManifest);
      registry.configure('failing-ai', { apiKey: 'test-key' });

      await expect(registry.initialize('failing-ai')).rejects.toThrow('Initialization failed');

      const ext = registry.get('failing-ai');
      expect(ext?.status).toBe('error');
      expect(ext?.lastError).toBe('Initialization failed');
    });
  });

  describe('activate', () => {
    it('should configure and initialize in one step', async () => {
      registry.register(mockAIManifest);

      await registry.activate('test-ai', { apiKey: 'test-key' });

      const ext = registry.get('test-ai');
      expect(ext?.status).toBe('active');
      expect(ext?.config).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('disable', () => {
    it('should disable an active extension', async () => {
      registry.register(mockAIManifest);
      await registry.activate('test-ai', { apiKey: 'test-key' });

      registry.disable('test-ai');

      const ext = registry.get('test-ai');
      expect(ext?.status).toBe('disabled');
      expect(ext?.instance).toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should run health check on extension with testConnection', async () => {
      registry.register(mockChannelManifest);
      await registry.activate('test-channel', { token: 'test-token' });

      const result = await registry.healthCheck('test-channel');

      expect(result.success).toBe(true);
      expect(result.message).toBe('OK');
    });

    it('should return failure for uninitialized extension', async () => {
      registry.register(mockAIManifest);

      const result = await registry.healthCheck('test-ai');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Extension not initialized');
    });

    it('should handle health check failures', async () => {
      const failingChannel: ChannelExtensionManifest = {
        ...mockChannelManifest,
        id: 'failing-channel',
        createAdapter: vi.fn().mockReturnValue({
          id: 'failing-channel',
          testConnection: vi.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      };

      registry.register(failingChannel);
      await registry.activate('failing-channel', { token: 'test-token' });

      const result = await registry.healthCheck('failing-channel');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      registry.register(mockAIManifest);
      registry.register(mockChannelManifest);
      await registry.activate('test-ai', { apiKey: 'test-key' });
    });

    it('should get extensions by category', () => {
      const aiExtensions = registry.getByCategory('ai');
      expect(aiExtensions.length).toBe(1);
      expect(aiExtensions[0]?.manifest.id).toBe('test-ai');
    });

    it('should get active extensions by category', () => {
      const activeAI = registry.getActiveByCategory('ai');
      expect(activeAI.length).toBe(1);

      const activeChannels = registry.getActiveByCategory('channel');
      expect(activeChannels.length).toBe(0);
    });

    it('should get AI provider by ID', () => {
      const provider = registry.getAIProvider('test-ai');
      expect(provider).toBe(mockAIProvider);
    });

    it('should get first active AI provider', () => {
      const provider = registry.getActiveAIProvider();
      expect(provider).toBe(mockAIProvider);
    });

    it('should get completion provider (non-local priority)', () => {
      const provider = registry.getCompletionProvider();
      expect(provider).toBe(mockAIProvider);
    });

    it('should get embedding provider (non-local priority)', () => {
      const provider = registry.getEmbeddingProvider();
      expect(provider).toBe(mockAIProvider);
    });

    it('should return undefined for embedding provider when no capable provider', async () => {
      // Create a new registry and register provider without embedding capability
      const testRegistry = new ExtensionRegistry();
      const noEmbeddingManifest: AIExtensionManifest = {
        ...mockAIManifest,
        id: 'no-embedding',
        capabilities: { completion: true, embedding: false },
        createProvider: vi.fn().mockReturnValue(mockAIProvider),
      };
      testRegistry.register(noEmbeddingManifest);
      await testRegistry.activate('no-embedding', { apiKey: 'test' });

      const provider = testRegistry.getEmbeddingProvider();
      expect(provider).toBeUndefined();
    });

    it('should fallback to local provider for embeddings', async () => {
      // Create registry with non-embedding provider and local
      const testRegistry = new ExtensionRegistry();

      const noEmbeddingManifest: AIExtensionManifest = {
        ...mockAIManifest,
        id: 'anthropic',
        capabilities: { completion: true, embedding: false },
        createProvider: vi.fn().mockReturnValue(mockAIProvider),
      };

      const localProvider: AIProvider = {
        name: 'local',
        complete: vi.fn(),
        embed: vi.fn(),
      };

      const localManifest: AIExtensionManifest = {
        id: 'local',
        name: 'Local AI',
        category: 'ai',
        version: '1.0.0',
        description: 'Local AI for testing',
        configSchema: [], // No required config
        capabilities: { completion: true, embedding: true },
        createProvider: vi.fn().mockReturnValue(localProvider),
      };

      testRegistry.register(noEmbeddingManifest);
      testRegistry.register(localManifest);
      await testRegistry.activate('anthropic', { apiKey: 'test' });
      await testRegistry.activate('local', {});

      // Should get local for embeddings (anthropic doesn't support)
      const embeddingProvider = testRegistry.getEmbeddingProvider();
      expect(embeddingProvider).toBe(localProvider);

      // Should get anthropic for completion (non-local priority)
      const completionProvider = testRegistry.getCompletionProvider();
      expect(completionProvider).toBe(mockAIProvider);
    });

    it('should get status summary', () => {
      const summary = registry.getStatusSummary();

      expect(summary.length).toBe(2);
      expect(summary.find((s) => s.id === 'test-ai')?.status).toBe('active');
      expect(summary.find((s) => s.id === 'test-channel')?.status).toBe('registered');
    });
  });

  describe('singleton', () => {
    it('should return same instance from getExtensionRegistry', () => {
      const registry1 = getExtensionRegistry();
      const registry2 = getExtensionRegistry();

      expect(registry1).toBe(registry2);
    });

    it('should reset singleton on resetExtensionRegistry', () => {
      const registry1 = getExtensionRegistry();
      registry1.register(mockAIManifest);

      resetExtensionRegistry();

      const registry2 = getExtensionRegistry();
      expect(registry2.getAll().length).toBe(0);
    });
  });
});
