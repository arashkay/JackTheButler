/**
 * AI Extensions
 *
 * Factory and exports for AI provider extensions.
 *
 * @module extensions/ai
 */

import type { AIProvider } from '@/core/interfaces/ai.js';
import type { AIExtensionManifest, BaseProvider, ConnectionTestResult } from '../types.js';
import { loadConfig } from '@/config/index.js';
import { createLogger } from '@/utils/logger.js';

import {
  createAnthropicProvider,
  anthropicManifest,
  type AnthropicConfig,
} from './providers/index.js';
import {
  createOpenAIProvider,
  openaiManifest,
  type OpenAIConfig,
} from './providers/index.js';
import {
  createOllamaProvider,
  ollamaManifest,
  type OllamaConfig,
} from './providers/index.js';

// Re-export providers
export {
  AnthropicProvider,
  createAnthropicProvider,
  type AnthropicConfig,
} from './providers/anthropic.js';
export { OpenAIProvider, createOpenAIProvider, type OpenAIConfig } from './providers/openai.js';
export { OllamaProvider, createOllamaProvider, type OllamaConfig } from './providers/ollama.js';

const log = createLogger('extensions:ai');

/**
 * AI provider types
 */
export type AIProviderType = 'anthropic' | 'openai' | 'ollama';

/**
 * Combined AI provider interface (AIProvider + connection testing)
 */
export interface CombinedAIProvider extends AIProvider, BaseProvider {}

/**
 * All registered AI extension manifests
 */
export const aiManifests: Record<AIProviderType, AIExtensionManifest> = {
  anthropic: anthropicManifest,
  openai: openaiManifest,
  ollama: ollamaManifest,
};

/**
 * Get all AI extension manifests
 */
export function getAIManifests(): AIExtensionManifest[] {
  return Object.values(aiManifests);
}

/**
 * Get a specific AI extension manifest
 */
export function getAIManifest(type: AIProviderType): AIExtensionManifest | undefined {
  return aiManifests[type];
}

/**
 * Cached provider instances
 */
let cachedProvider: CombinedAIProvider | null = null;
let cachedEmbeddingProvider: CombinedAIProvider | null = null;

/**
 * Create an AI provider by type and config
 */
export function createAIProvider(
  type: AIProviderType,
  config: Record<string, unknown>
): CombinedAIProvider {
  switch (type) {
    case 'anthropic':
      return createAnthropicProvider(config as unknown as AnthropicConfig);
    case 'openai':
      return createOpenAIProvider(config as unknown as OpenAIConfig);
    case 'ollama':
      return createOllamaProvider(config as unknown as OllamaConfig);
    default:
      throw new Error(`Unknown AI provider type: ${type}`);
  }
}

/**
 * Get the configured AI provider
 *
 * Uses the provider specified in config, falls back to available providers.
 */
export function getAIProvider(): CombinedAIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = loadConfig();
  const aiConfig = config.ai;

  // Try configured provider first
  const providerType = aiConfig.provider as AIProviderType;

  try {
    switch (providerType) {
      case 'anthropic':
        if (aiConfig.anthropicApiKey) {
          cachedProvider = createAnthropicProvider({
            apiKey: aiConfig.anthropicApiKey,
            ...(aiConfig.model !== undefined && { model: aiConfig.model }),
            ...(aiConfig.maxTokens !== undefined && { maxTokens: aiConfig.maxTokens }),
          });
          log.info('Using Anthropic Claude as AI provider');
          return cachedProvider;
        }
        break;

      case 'openai':
        if (aiConfig.openaiApiKey) {
          cachedProvider = createOpenAIProvider({
            apiKey: aiConfig.openaiApiKey,
            ...(aiConfig.model !== undefined && { model: aiConfig.model }),
            ...(aiConfig.maxTokens !== undefined && { maxTokens: aiConfig.maxTokens }),
          });
          log.info('Using OpenAI as AI provider');
          return cachedProvider;
        }
        break;

      case 'ollama':
        cachedProvider = createOllamaProvider({
          ...(aiConfig.ollamaBaseUrl !== undefined && { baseUrl: aiConfig.ollamaBaseUrl }),
          ...(aiConfig.model !== undefined && { model: aiConfig.model }),
        });
        log.info('Using Ollama as AI provider');
        return cachedProvider;
    }

    // Fallback chain: Anthropic -> OpenAI -> Ollama
    if (aiConfig.anthropicApiKey) {
      cachedProvider = createAnthropicProvider({
        apiKey: aiConfig.anthropicApiKey,
        ...(aiConfig.model !== undefined && { model: aiConfig.model }),
        ...(aiConfig.maxTokens !== undefined && { maxTokens: aiConfig.maxTokens }),
      });
      log.info('Falling back to Anthropic Claude as AI provider');
      return cachedProvider;
    }

    if (aiConfig.openaiApiKey) {
      cachedProvider = createOpenAIProvider({
        apiKey: aiConfig.openaiApiKey,
        ...(aiConfig.model !== undefined && { model: aiConfig.model }),
        ...(aiConfig.maxTokens !== undefined && { maxTokens: aiConfig.maxTokens }),
      });
      log.info('Falling back to OpenAI as AI provider');
      return cachedProvider;
    }

    // Default to Ollama (local)
    cachedProvider = createOllamaProvider({
      ...(aiConfig.ollamaBaseUrl !== undefined && { baseUrl: aiConfig.ollamaBaseUrl }),
      ...(aiConfig.model !== undefined && { model: aiConfig.model }),
    });
    log.info('Falling back to Ollama as AI provider');
    return cachedProvider;
  } catch (error) {
    log.error({ error }, 'Failed to create AI provider');
    throw error;
  }
}

/**
 * Get an embedding provider
 *
 * Prefers OpenAI for embeddings since Claude doesn't have native embedding support.
 */
export function getEmbeddingProvider(): CombinedAIProvider {
  if (cachedEmbeddingProvider) {
    return cachedEmbeddingProvider;
  }

  const config = loadConfig();
  const aiConfig = config.ai;

  // Prefer OpenAI for embeddings (best quality)
  if (aiConfig.openaiApiKey) {
    cachedEmbeddingProvider = createOpenAIProvider({
      apiKey: aiConfig.openaiApiKey,
      ...(aiConfig.embeddingModel !== undefined && { embeddingModel: aiConfig.embeddingModel }),
    });
    log.info('Using OpenAI for embeddings');
    return cachedEmbeddingProvider;
  }

  // Use Claude's fallback embeddings
  if (aiConfig.anthropicApiKey) {
    cachedEmbeddingProvider = createAnthropicProvider({
      apiKey: aiConfig.anthropicApiKey,
    });
    log.info('Using Anthropic fallback for embeddings');
    return cachedEmbeddingProvider;
  }

  // Fallback to Ollama
  cachedEmbeddingProvider = createOllamaProvider({
    ...(aiConfig.ollamaBaseUrl !== undefined && { baseUrl: aiConfig.ollamaBaseUrl }),
    ...(aiConfig.embeddingModel !== undefined && { embeddingModel: aiConfig.embeddingModel }),
  });
  log.info('Using Ollama for embeddings');
  return cachedEmbeddingProvider;
}

/**
 * Test connection to an AI provider
 */
export async function testAIProviderConnection(
  type: AIProviderType,
  config: Record<string, unknown>
): Promise<ConnectionTestResult> {
  try {
    const provider = createAIProvider(type, config);
    return await provider.testConnection();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Failed to create provider: ${message}`,
    };
  }
}

/**
 * Reset cached providers (for testing)
 */
export function resetAIProviders(): void {
  cachedProvider = null;
  cachedEmbeddingProvider = null;
  log.debug('AI provider cache cleared');
}
