/**
 * Channel Adapters
 *
 * Adapters that translate between external messaging platforms
 * and Jack's internal message format.
 *
 * Channels:
 * - Web Chat (WebSocket) - Direct adapter
 * - Email (SMTP/IMAP) - Direct adapter
 *
 * Note: WhatsApp and SMS are handled via extension registry.
 * Configure them in Settings > Integrations.
 *
 * @see docs/03-architecture/c4-components/channel-adapters.md
 */

export * from './types.js';
export { WebChatAdapter, webChatAdapter, handleChatConnection, getSessionCount } from './webchat/index.js';
export { EmailAdapter, getEmailAdapter, resetEmailAdapter } from './email/index.js';
