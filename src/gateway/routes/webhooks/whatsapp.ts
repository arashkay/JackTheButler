/**
 * WhatsApp Webhook Routes
 *
 * Handles webhook verification and incoming messages from WhatsApp Cloud API.
 */

import { Hono } from 'hono';
import { loadConfig } from '@/config/index.js';
import { verifySignature } from '@/channels/whatsapp/security.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('webhook:whatsapp');

export const whatsappWebhook = new Hono();

/**
 * Webhook verification (GET)
 *
 * Meta sends a GET request to verify the webhook URL.
 * We must respond with the challenge if the verify token matches.
 */
whatsappWebhook.get('/', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  log.debug({ mode, hasToken: !!token, hasChallenge: !!challenge }, 'Webhook verification request');

  const config = loadConfig();

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    log.info('Webhook verified successfully');
    return c.text(challenge || '', 200);
  }

  log.warn({ mode, tokenMatch: token === config.whatsapp.verifyToken }, 'Webhook verification failed');
  return c.text('Forbidden', 403);
});

/**
 * Message webhook (POST)
 *
 * Receives incoming messages and status updates from WhatsApp.
 * Must respond quickly (within 20 seconds) to avoid retries.
 */
whatsappWebhook.post('/', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const body = await c.req.text();

  // Verify signature
  if (!verifySignature(body, signature)) {
    log.warn('Invalid webhook signature');
    return c.text('Invalid signature', 401);
  }

  // Parse payload
  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    log.warn('Invalid JSON payload');
    return c.text('Invalid JSON', 400);
  }

  // Process asynchronously to respond quickly
  processWebhookAsync(payload).catch((err) => {
    log.error({ err }, 'Error processing webhook');
  });

  // Always return 200 quickly to acknowledge receipt
  return c.text('OK', 200);
});

/**
 * WhatsApp webhook payload types
 */
interface WhatsAppWebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

interface WebhookChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WebhookContact[];
    messages?: WebhookMessage[];
    statuses?: WebhookStatus[];
  };
  field: string;
}

interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  // Add more message types as needed
}

interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

/**
 * Process webhook payload asynchronously
 */
async function processWebhookAsync(payload: WhatsAppWebhookPayload): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') {
    log.debug({ object: payload.object }, 'Ignoring non-WhatsApp webhook');
    return;
  }

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') {
        continue;
      }

      const value = change.value;

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await handleIncomingMessage(message, value.contacts?.[0]);
        }
      }

      // Handle status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status);
        }
      }
    }
  }
}

/**
 * Handle an incoming WhatsApp message
 */
async function handleIncomingMessage(
  message: WebhookMessage,
  contact?: WebhookContact
): Promise<void> {
  log.info(
    {
      messageId: message.id,
      from: message.from,
      type: message.type,
      contactName: contact?.profile.name,
    },
    'Received WhatsApp message'
  );

  // Import adapter dynamically to avoid circular dependencies
  const { getWhatsAppAdapter } = await import('@/channels/whatsapp/index.js');
  const adapter = getWhatsAppAdapter();

  if (adapter) {
    await adapter.handleIncomingMessage(message, contact);
  } else {
    log.warn('WhatsApp adapter not configured');
  }
}

/**
 * Handle a status update for a sent message
 */
async function handleStatusUpdate(status: WebhookStatus): Promise<void> {
  log.debug(
    {
      messageId: status.id,
      status: status.status,
      recipientId: status.recipient_id,
    },
    'Received status update'
  );

  // Import adapter dynamically
  const { getWhatsAppAdapter } = await import('@/channels/whatsapp/index.js');
  const adapter = getWhatsAppAdapter();

  if (adapter) {
    await adapter.handleStatusUpdate(status);
  }
}

export type { WhatsAppWebhookPayload, WebhookMessage, WebhookStatus, WebhookContact };
