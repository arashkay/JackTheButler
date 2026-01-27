# SMS Channel Integration

SMS/MMS channel integration using Twilio for Jack The Butler.

---

## Overview

The SMS channel enables guest communication via text messages using Twilio as the provider. Supports both SMS and MMS (images, media).

### Capabilities

| Feature | Support |
|---------|---------|
| Text messages | Yes |
| Images (MMS) | Yes |
| Videos (MMS) | Yes |
| Read receipts | No |
| Typing indicators | No |
| Rich formatting | No |
| Buttons/Quick replies | No |

---

## Configuration

### Environment Variables

```bash
# Required
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Optional
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # For high-volume
TWILIO_STATUS_CALLBACK_URL=https://api.jackthebutler.com/webhooks/twilio/status
```

### Twilio Console Setup

1. **Create account** at [twilio.com](https://www.twilio.com)
2. **Get phone number** with SMS capability
3. **Configure webhook URL**: `https://your-domain.com/webhooks/twilio/sms`
4. **Set webhook method**: POST
5. **Enable status callbacks** (optional)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Guest Phone                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Twilio Platform                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Phone Number│  │  Messaging  │  │   Status Callbacks  │  │
│  │ +1234567890 │  │   Service   │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Jack Gateway                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SMS Channel Adapter                     │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │    │
│  │  │   Webhook    │  │   Sender     │  │  Mapper   │  │    │
│  │  │   Handler    │  │   Client     │  │           │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Adapter Interface

```typescript
// src/channels/sms/adapter.ts

import { Twilio } from 'twilio';
import { ChannelAdapter, IncomingMessage, OutgoingMessage } from '../base-adapter';

export class SMSAdapter implements ChannelAdapter {
  readonly channel = 'sms' as const;
  private client: Twilio;
  private phoneNumber: string;

  constructor(config: SMSConfig) {
    this.client = new Twilio(config.accountSid, config.authToken);
    this.phoneNumber = config.phoneNumber;
  }

  async send(message: OutgoingMessage): Promise<SendResult> {
    const { to, content, mediaUrls } = message;

    try {
      const result = await this.client.messages.create({
        to,
        from: this.phoneNumber,
        body: content,
        mediaUrl: mediaUrls,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL
      });

      return {
        success: true,
        messageId: result.sid,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapTwilioError(error)
      };
    }
  }

  async parseIncoming(payload: TwilioWebhookPayload): Promise<IncomingMessage> {
    return {
      id: payload.MessageSid,
      channel: 'sms',
      channelIdentifier: payload.From,
      content: payload.Body,
      mediaUrls: this.extractMediaUrls(payload),
      timestamp: new Date(),
      raw: payload
    };
  }

  private extractMediaUrls(payload: TwilioWebhookPayload): string[] {
    const urls: string[] = [];
    const numMedia = parseInt(payload.NumMedia || '0', 10);

    for (let i = 0; i < numMedia; i++) {
      const url = payload[`MediaUrl${i}`];
      if (url) urls.push(url);
    }

    return urls;
  }

  private mapTwilioError(error: unknown): ChannelError {
    if (error instanceof Error && 'code' in error) {
      const twilioError = error as TwilioError;

      switch (twilioError.code) {
        case 21211:
          return { code: 'INVALID_NUMBER', message: 'Invalid phone number' };
        case 21614:
          return { code: 'NOT_SMS_CAPABLE', message: 'Number cannot receive SMS' };
        case 21610:
          return { code: 'UNSUBSCRIBED', message: 'User has opted out' };
        case 30003:
          return { code: 'UNREACHABLE', message: 'Phone unreachable' };
        default:
          return { code: 'SEND_FAILED', message: twilioError.message };
      }
    }

    return { code: 'UNKNOWN', message: 'Unknown error' };
  }
}
```

### Webhook Handler

```typescript
// src/channels/sms/webhook.ts

import { Hono } from 'hono';
import { Twilio } from 'twilio';
import { smsAdapter } from './adapter';
import { conversationService } from '@/services/conversation';
import { guestService } from '@/services/guest';
import { logger } from '@/utils/logger';

const sms = new Hono();

// Incoming message webhook
sms.post('/webhooks/twilio/sms', async (c) => {
  const payload = await c.req.parseBody();

  // Validate Twilio signature
  if (!validateTwilioSignature(c.req, payload)) {
    logger.warn('Invalid Twilio signature');
    return c.text('Invalid signature', 403);
  }

  try {
    // Parse incoming message
    const message = await smsAdapter.parseIncoming(payload as TwilioWebhookPayload);

    // Identify or create guest
    const guest = await guestService.identify('sms', message.channelIdentifier);

    // Get or create conversation
    let conversation = await conversationService.getActive(guest.id);
    if (!conversation) {
      conversation = await conversationService.create({
        guestId: guest.id,
        channel: 'sms',
        channelIdentifier: message.channelIdentifier
      });
    }

    // Add message to conversation
    await conversationService.addMessage(conversation.id, {
      role: 'guest',
      content: message.content,
      mediaUrls: message.mediaUrls,
      channelMessageId: message.id,
      timestamp: message.timestamp
    });

    logger.info('SMS message received', {
      conversationId: conversation.id,
      guestId: guest.id,
      messageId: message.id
    });

    // Return empty TwiML (we send responses asynchronously)
    return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
      'Content-Type': 'text/xml'
    });

  } catch (error) {
    logger.error('Failed to process SMS webhook', { error });
    return c.text('Error', 500);
  }
});

// Status callback webhook
sms.post('/webhooks/twilio/status', async (c) => {
  const payload = await c.req.parseBody();

  if (!validateTwilioSignature(c.req, payload)) {
    return c.text('Invalid signature', 403);
  }

  const { MessageSid, MessageStatus, ErrorCode } = payload as StatusPayload;

  logger.info('SMS status update', {
    messageId: MessageSid,
    status: MessageStatus,
    errorCode: ErrorCode
  });

  // Update message status in database
  await messageRepository.updateStatus(MessageSid, {
    status: mapTwilioStatus(MessageStatus),
    errorCode: ErrorCode
  });

  return c.text('OK', 200);
});

// Signature validation
function validateTwilioSignature(req: Request, body: Record<string, unknown>): boolean {
  const signature = req.headers.get('X-Twilio-Signature');
  if (!signature) return false;

  const url = new URL(req.url).toString();
  const authToken = process.env.TWILIO_AUTH_TOKEN!;

  return Twilio.validateRequest(authToken, signature, url, body);
}

function mapTwilioStatus(status: string): MessageStatus {
  const statusMap: Record<string, MessageStatus> = {
    queued: 'pending',
    sending: 'sending',
    sent: 'sent',
    delivered: 'delivered',
    undelivered: 'failed',
    failed: 'failed'
  };

  return statusMap[status] || 'unknown';
}

export { sms };
```

### Configuration Schema

```typescript
// src/channels/sms/config.ts

import { z } from 'zod';

export const smsConfigSchema = z.object({
  accountSid: z.string().regex(/^AC[a-f0-9]{32}$/, 'Invalid Account SID'),
  authToken: z.string().length(32, 'Auth token must be 32 characters'),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 phone number'),
  messagingServiceSid: z.string().regex(/^MG[a-f0-9]{32}$/).optional(),
  statusCallbackUrl: z.string().url().optional()
});

export type SMSConfig = z.infer<typeof smsConfigSchema>;
```

---

## Message Formatting

### Text Messages

```typescript
// Plain text, max 1600 characters per segment
// Messages over 160 chars are split into segments

async function sendText(to: string, content: string) {
  // Truncate very long messages
  const maxLength = 1600;
  const truncated = content.length > maxLength
    ? content.slice(0, maxLength - 3) + '...'
    : content;

  return smsAdapter.send({
    to,
    content: truncated
  });
}
```

### MMS with Media

```typescript
// Send images, max 5MB per message
async function sendWithImage(to: string, content: string, imageUrl: string) {
  return smsAdapter.send({
    to,
    content,
    mediaUrls: [imageUrl]
  });
}

// Supported media types
const SUPPORTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'audio/mp3',
  'audio/ogg',
  'video/mp4'
];
```

### Character Encoding

```typescript
// GSM-7 encoding (160 chars per segment)
// UCS-2 encoding for emoji/unicode (70 chars per segment)

function estimateSegments(content: string): number {
  const hasUnicode = /[^\x00-\x7F]/.test(content);
  const charsPerSegment = hasUnicode ? 70 : 160;
  return Math.ceil(content.length / charsPerSegment);
}
```

---

## Opt-Out Management

### STOP Handling

Twilio automatically handles opt-out keywords (STOP, UNSUBSCRIBE, etc.).

```typescript
// Check opt-out status before sending
async function canSendSMS(phoneNumber: string): Promise<boolean> {
  // Check internal opt-out list
  const guest = await guestService.findByChannel('sms', phoneNumber);
  if (guest?.smsOptOut) return false;

  // Twilio will also reject if user has opted out
  return true;
}

// Handle opt-out webhook
sms.post('/webhooks/twilio/optout', async (c) => {
  const { From, OptOutType } = await c.req.parseBody();

  if (OptOutType === 'STOP') {
    await guestService.updateByChannel('sms', From, { smsOptOut: true });
  } else if (OptOutType === 'START') {
    await guestService.updateByChannel('sms', From, { smsOptOut: false });
  }

  return c.text('OK');
});
```

---

## Rate Limiting

### Twilio Limits

| Limit | Value |
|-------|-------|
| Messages per second | 1 (standard) |
| Messages per second | 10+ (toll-free) |
| Messages per second | 100+ (short code) |
| Daily limit | Based on account |

### Implementation

```typescript
import { RateLimiter } from '@/utils/rate-limiter';

const smsRateLimiter = new RateLimiter({
  key: 'sms',
  maxRequests: 1,
  window: 1000  // 1 per second
});

async function sendWithRateLimit(message: OutgoingMessage) {
  await smsRateLimiter.acquire();
  return smsAdapter.send(message);
}
```

---

## Error Handling

### Common Errors

| Error Code | Description | Action |
|------------|-------------|--------|
| 21211 | Invalid phone number | Validate number format |
| 21614 | Not SMS capable | Try different number |
| 21610 | User opted out | Respect opt-out |
| 30003 | Unreachable | Retry later |
| 30004 | Message blocked | Check content |
| 30005 | Unknown destination | Verify number |
| 30006 | Landline | Cannot send SMS |
| 30007 | Carrier violation | Review message |

### Retry Strategy

```typescript
import { Queue } from 'bullmq';

const smsQueue = new Queue('sms', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000  // 5s, 10s, 20s
    }
  }
});

// Queue message for sending
async function queueSMS(message: OutgoingMessage) {
  await smsQueue.add('send', message, {
    priority: message.priority === 'urgent' ? 1 : 10
  });
}

// Process queue
smsQueue.process('send', async (job) => {
  const result = await smsAdapter.send(job.data);

  if (!result.success) {
    // Don't retry permanent failures
    if (['INVALID_NUMBER', 'UNSUBSCRIBED', 'NOT_SMS_CAPABLE'].includes(result.error.code)) {
      throw new Error(`Permanent failure: ${result.error.code}`);
    }

    // Retry transient failures
    throw new Error(`Transient failure: ${result.error.code}`);
  }

  return result;
});
```

---

## Testing

### Unit Tests

```typescript
// src/channels/sms/adapter.test.ts

import { describe, it, expect, vi } from 'vitest';
import { SMSAdapter } from './adapter';

describe('SMSAdapter', () => {
  const mockConfig = {
    accountSid: 'ACtest123456789012345678901234',
    authToken: '12345678901234567890123456789012',
    phoneNumber: '+15551234567'
  };

  describe('parseIncoming', () => {
    it('should parse text message', async () => {
      const adapter = new SMSAdapter(mockConfig);

      const payload = {
        MessageSid: 'SM123',
        From: '+15559876543',
        To: '+15551234567',
        Body: 'Hello, I need help',
        NumMedia: '0'
      };

      const message = await adapter.parseIncoming(payload);

      expect(message).toEqual({
        id: 'SM123',
        channel: 'sms',
        channelIdentifier: '+15559876543',
        content: 'Hello, I need help',
        mediaUrls: [],
        timestamp: expect.any(Date),
        raw: payload
      });
    });

    it('should extract media URLs', async () => {
      const adapter = new SMSAdapter(mockConfig);

      const payload = {
        MessageSid: 'SM123',
        From: '+15559876543',
        Body: 'Check this out',
        NumMedia: '2',
        MediaUrl0: 'https://example.com/image1.jpg',
        MediaUrl1: 'https://example.com/image2.jpg'
      };

      const message = await adapter.parseIncoming(payload);

      expect(message.mediaUrls).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ]);
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/channels/sms.test.ts

import { describe, it, expect } from 'vitest';
import { app } from '@/gateway/server';

describe('SMS Webhook', () => {
  it('should process incoming SMS', async () => {
    const response = await app.request('/webhooks/twilio/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'valid-signature'
      },
      body: new URLSearchParams({
        MessageSid: 'SM123',
        From: '+15559876543',
        To: '+15551234567',
        Body: 'Test message',
        NumMedia: '0'
      })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/xml');
  });
});
```

---

## Monitoring

### Metrics

```typescript
import { metrics } from '@/utils/metrics';

// Track send success/failure
metrics.counter('sms_messages_sent_total', {
  status: 'success' | 'failure',
  error_code: string
});

// Track message segments
metrics.histogram('sms_message_segments', {
  direction: 'inbound' | 'outbound'
});

// Track delivery status
metrics.counter('sms_delivery_status_total', {
  status: 'delivered' | 'failed' | 'undelivered'
});
```

### Alerts

```yaml
# Prometheus alerts
groups:
  - name: sms
    rules:
      - alert: SMSDeliveryFailureRate
        expr: rate(sms_delivery_status_total{status="failed"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High SMS delivery failure rate"

      - alert: SMSQueueBacklog
        expr: sms_queue_depth > 100
        for: 10m
        labels:
          severity: warning
```

---

## Related

- [Channel Architecture](../../03-architecture/c4-components/channels.md) - Channel design
- [WhatsApp Channel](whatsapp-channel.md) - WhatsApp integration
- [Email Channel](email-channel.md) - Email integration
