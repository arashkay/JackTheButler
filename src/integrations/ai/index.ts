/**
 * AI Integration Layer
 *
 * @deprecated Import from '@/extensions/ai' instead.
 * This file is kept for backward compatibility.
 *
 * @module integrations/ai
 */

// Re-export everything from extensions
export {
  // Providers
  AnthropicProvider,
  createAnthropicProvider,
  OpenAIProvider,
  createOpenAIProvider,
  OllamaProvider,
  createOllamaProvider,
  // Factory
  createAIProvider,
  getAIProvider,
  getEmbeddingProvider,
  testAIProviderConnection,
  resetAIProviders,
  // Types
  type AIProviderType,
  type CombinedAIProvider as AIProvider,
  type AnthropicConfig,
  type OpenAIConfig,
  type OllamaConfig,
} from '@/extensions/ai/index.js';
