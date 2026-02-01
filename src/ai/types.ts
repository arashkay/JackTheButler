/**
 * AI Provider Types
 *
 * Interfaces for LLM providers (Claude, OpenAI, Ollama).
 */

/**
 * Message role in a conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A message in a completion request
 */
export interface CompletionMessage {
  role: MessageRole;
  content: string;
}

/**
 * Request to generate a completion
 */
export interface CompletionRequest {
  messages: CompletionMessage[];
  maxTokens?: number | undefined;
  temperature?: number | undefined;
  stopSequences?: string[] | undefined;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Response from a completion request
 */
export interface CompletionResponse {
  content: string;
  usage: TokenUsage;
  stopReason?: string | undefined;
}

/**
 * Embedding request
 */
export interface EmbeddingRequest {
  text: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embedding: number[];
  usage?: TokenUsage | undefined;
}

/**
 * LLM Provider interface
 *
 * Abstraction for different AI providers (Claude, OpenAI, Ollama).
 */
export interface LLMProvider {
  /**
   * Provider name
   */
  readonly name: string;

  /**
   * Generate a completion from the model
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Generate embeddings for text
   */
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string | undefined;
  baseUrl?: string | undefined;
  model?: string | undefined;
  embeddingModel?: string | undefined;
  maxTokens?: number | undefined;
  temperature?: number | undefined;
}

/**
 * Available provider types
 */
export type ProviderType = 'claude' | 'openai' | 'ollama';

// ===================
// Responder Types
// ===================

import type { Conversation } from '@/db/schema.js';
import type { InboundMessage } from '@/types/message.js';
import type { GuestContext } from '@/services/guest-context.js';

/**
 * Response from the responder
 */
export interface Response {
  content: string;
  confidence: number;
  intent?: string | undefined;
  entities?: unknown[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Responder interface
 */
export interface Responder {
  /**
   * Generate a response for a message
   * @param conversation - The conversation context
   * @param message - The inbound message to respond to
   * @param guestContext - Optional guest context with profile and reservation info
   */
  generate(
    conversation: Conversation,
    message: InboundMessage,
    guestContext?: GuestContext
  ): Promise<Response>;
}
