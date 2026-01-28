/**
 * Webhook Routes
 *
 * Aggregates all webhook routes for external services.
 */

import { Hono } from 'hono';
import { whatsappWebhook } from './whatsapp.js';

export const webhookRoutes = new Hono();

// WhatsApp webhook
webhookRoutes.route('/whatsapp', whatsappWebhook);

export { whatsappWebhook };
