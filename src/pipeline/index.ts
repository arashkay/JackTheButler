/**
 * Message Pipeline
 *
 * Exports for the message processing pipeline.
 *
 * Note: MessageProcessor is now part of core. Import from '@/core' for new code.
 *
 * @module pipeline
 */

// Re-export from core (preferred location)
export { MessageProcessor, messageProcessor, getProcessor } from '@/core/message-processor.js';

// Local pipeline components
export { EchoResponder, defaultResponder } from './responder.js';
export type { Responder, Response } from './responder.js';
