/**
 * WhatsApp Message Parser
 *
 * Parses incoming WhatsApp messages into the standard InboundMessage format.
 */

import type { InboundMessage } from '@/types/message.js';
import type { ContentType } from '@/types/channel.js';
import type { WebhookMessage, WebhookContact } from '@/gateway/routes/webhooks/whatsapp.js';
import { generateId } from '@/utils/id.js';

/**
 * Parse a WhatsApp message into the standard format
 */
export function parseWhatsAppMessage(
  message: WebhookMessage,
  contact?: WebhookContact
): InboundMessage {
  const contentType = parseContentType(message.type);
  const content = extractContent(message);

  return {
    id: generateId('message'),
    channel: 'whatsapp',
    channelId: message.from,
    channelMessageId: message.id,
    content,
    contentType,
    timestamp: new Date(parseInt(message.timestamp) * 1000),
    metadata: {
      whatsappMessageId: message.id,
      contactName: contact?.profile.name,
      messageType: message.type,
    },
    raw: message,
  };
}

/**
 * Map WhatsApp message type to our content type
 */
function parseContentType(type: string): ContentType {
  switch (type) {
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'audio':
    case 'voice':
      return 'audio';
    case 'video':
      return 'video';
    case 'document':
      return 'file';
    case 'location':
      return 'location';
    default:
      return 'text';
  }
}

/**
 * Extract content from the message based on type
 */
function extractContent(message: WebhookMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'image':
      return '[Image]';
    case 'audio':
    case 'voice':
      return '[Audio]';
    case 'video':
      return '[Video]';
    case 'document':
      return '[Document]';
    case 'location':
      return '[Location]';
    case 'sticker':
      return '[Sticker]';
    case 'contacts':
      return '[Contact]';
    default:
      return '[Unsupported message type]';
  }
}

/**
 * Check if a message type is supported for AI processing
 */
export function isSupportedMessageType(type: string): boolean {
  // Currently only text messages are fully processed
  return type === 'text';
}
