/**
 * Channel Extensions
 *
 * Exports for all channel provider extensions.
 *
 * @module extensions/channels
 */

import type { ChannelExtensionManifest } from '../types.js';

// WhatsApp
export {
  MetaWhatsAppProvider,
  createMetaWhatsAppProvider,
  metaWhatsAppManifest,
  type MetaWhatsAppConfig,
} from './whatsapp/index.js';

// SMS
export {
  TwilioProvider,
  createTwilioProvider,
  twilioManifest,
  type TwilioConfig,
} from './sms/index.js';

// Email
export {
  SMTPProvider,
  createSMTPProvider,
  smtpManifest,
  type SMTPConfig,
  type SendEmailOptions,
  type SendEmailResult,
} from './email/index.js';

// Import manifests for registry
import { metaWhatsAppManifest } from './whatsapp/index.js';
import { twilioManifest } from './sms/index.js';
import { smtpManifest } from './email/index.js';

/**
 * Channel provider types
 */
export type WhatsAppProviderType = 'meta';
export type SMSProviderType = 'twilio';
export type EmailProviderType = 'smtp';

/**
 * All registered channel extension manifests
 */
export const channelManifests: Record<string, ChannelExtensionManifest> = {
  'whatsapp-meta': metaWhatsAppManifest,
  'sms-twilio': twilioManifest,
  'email-smtp': smtpManifest,
};

/**
 * Get all channel extension manifests
 */
export function getChannelManifests(): ChannelExtensionManifest[] {
  return Object.values(channelManifests);
}

/**
 * Get manifests by channel type
 */
export function getChannelManifestsByType(
  channelType: 'whatsapp' | 'sms' | 'email'
): ChannelExtensionManifest[] {
  return Object.values(channelManifests).filter((m) => m.id.startsWith(channelType));
}
