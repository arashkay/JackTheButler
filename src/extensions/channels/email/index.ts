/**
 * Email Channel Extension
 *
 * Exports for email channel integrations.
 *
 * @module extensions/channels/email
 */

export {
  SMTPProvider,
  createSMTPProvider,
  manifest as smtpManifest,
  type SMTPConfig,
  type SendEmailOptions,
  type SendEmailResult,
} from './smtp.js';
