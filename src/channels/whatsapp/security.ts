/**
 * WhatsApp Security
 *
 * Signature verification for webhook requests.
 */

import { createHmac } from 'node:crypto';
import { loadConfig } from '@/config/index.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('whatsapp:security');

/**
 * Verify the signature of a WhatsApp webhook request
 *
 * @param payload - Raw request body as string
 * @param signature - x-hub-signature-256 header value
 * @returns true if signature is valid
 */
export function verifySignature(payload: string, signature: string | undefined): boolean {
  const config = loadConfig();
  const appSecret = config.whatsapp.appSecret;

  if (!appSecret) {
    log.warn('WHATSAPP_APP_SECRET not configured, skipping signature verification');
    return true; // Allow in development without secret
  }

  if (!signature) {
    log.warn('Missing x-hub-signature-256 header');
    return false;
  }

  // Signature format: sha256=<hex_signature>
  const expectedSignature = createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  const expectedHeader = `sha256=${expectedSignature}`;

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedHeader.length) {
    log.warn('Signature length mismatch');
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedHeader.charCodeAt(i);
  }

  const isValid = result === 0;

  if (!isValid) {
    log.warn('Invalid webhook signature');
  }

  return isValid;
}
