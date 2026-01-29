/**
 * Core Interfaces
 *
 * Abstract interfaces that define the contracts between the kernel and extensions.
 * Business logic in src/core/ depends on these interfaces, not on concrete implementations.
 *
 * @module core/interfaces
 */

// Channel adapter interface
export type {
  ChannelAdapter,
  InboundMessage,
  OutboundMessage,
  ChannelType,
  ContentType,
  SendResult,
} from './channel.js';

// AI provider interface
export type {
  AIProvider,
  AIProviderConfig,
  AIProviderType,
  CompletionMessage,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  MessageRole,
  TokenUsage,
  // Backward compatibility aliases
  LLMProvider,
  ProviderConfig,
  ProviderType,
} from './ai.js';

// PMS adapter interface
export type {
  PMSAdapter,
  PMSConfig,
  PMSAdapterFactory,
  NormalizedGuest,
  NormalizedReservation,
  NormalizedRoom,
  GuestPreference,
  PMSEvent,
  PMSEventType,
  IntegrationSource,
  ReservationStatus,
  ReservationQuery,
  RoomStatus,
} from './pms.js';
