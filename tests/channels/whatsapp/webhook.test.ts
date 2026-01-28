/**
 * WhatsApp Webhook Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app } from '@/gateway/server.js';
import { createHmac } from 'node:crypto';
import { resetConfig } from '@/config/index.js';

// Mock the WhatsApp adapter
vi.mock('@/channels/whatsapp/index.js', () => ({
  getWhatsAppAdapter: () => null,
}));

describe('WhatsApp Webhook', () => {
  beforeEach(() => {
    resetConfig(); // Reset cached config before each test
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    delete process.env.WHATSAPP_APP_SECRET;
    resetConfig();
  });

  describe('GET /webhooks/whatsapp (Verification)', () => {
    it('should return challenge when verify token matches', async () => {
      // Set the verify token in env
      process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';

      const res = await app.request(
        '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=test-challenge-123'
      );

      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('test-challenge-123');
    });

    it('should return 403 when verify token does not match', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';

      const res = await app.request(
        '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test-challenge'
      );

      expect(res.status).toBe(403);
    });

    it('should return 403 when mode is not subscribe', async () => {
      process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';

      const res = await app.request(
        '/webhooks/whatsapp?hub.mode=unsubscribe&hub.verify_token=test-verify-token&hub.challenge=test-challenge'
      );

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhooks/whatsapp (Messages)', () => {
    const samplePayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: 'phone-id-123',
                },
                contacts: [
                  {
                    profile: { name: 'Test User' },
                    wa_id: '15559876543',
                  },
                ],
                messages: [
                  {
                    from: '15559876543',
                    id: 'wamid.HBgNMTU1NTk4NzY1NDM=',
                    timestamp: '1234567890',
                    type: 'text',
                    text: { body: 'Hello, what time is checkout?' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    it('should return 200 for valid webhook with no signature (dev mode)', async () => {
      // Without app secret, signature verification is skipped
      delete process.env.WHATSAPP_APP_SECRET;

      const res = await app.request('/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(samplePayload),
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('OK');
    });

    it('should return 401 for invalid signature when app secret is set', async () => {
      process.env.WHATSAPP_APP_SECRET = 'test-app-secret';

      const res = await app.request('/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': 'sha256=invalid-signature',
        },
        body: JSON.stringify(samplePayload),
      });

      expect(res.status).toBe(401);
    });

    it('should return 200 for valid signature', async () => {
      const appSecret = 'test-app-secret';
      process.env.WHATSAPP_APP_SECRET = appSecret;

      const body = JSON.stringify(samplePayload);
      const signature = createHmac('sha256', appSecret).update(body).digest('hex');

      const res = await app.request('/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': `sha256=${signature}`,
        },
        body,
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('OK');
    });

    it('should return 400 for invalid JSON', async () => {
      delete process.env.WHATSAPP_APP_SECRET;

      const res = await app.request('/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'not-valid-json',
      });

      expect(res.status).toBe(400);
    });
  });
});
