# Email Channel Integration

Email channel integration for Jack The Butler using SMTP/IMAP.

---

## Overview

The email channel enables guest communication via email. Supports sending via SMTP and receiving via IMAP polling or webhooks.

### Capabilities

| Feature | Support |
|---------|---------|
| Plain text | Yes |
| HTML formatting | Yes |
| Attachments | Yes |
| Inline images | Yes |
| Read receipts | Optional |
| Threading | Yes |
| Templates | Yes |

---

## Configuration

### Environment Variables

```bash
# SMTP (Sending)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=jack@hotel.com
SMTP_PASSWORD=your-password
SMTP_FROM_NAME=Jack The Butler
SMTP_FROM_EMAIL=concierge@hotel.com

# IMAP (Receiving)
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=jack@hotel.com
IMAP_PASSWORD=your-password
IMAP_MAILBOX=INBOX
IMAP_POLL_INTERVAL=30000  # 30 seconds

# Alternative: Webhook-based receiving (recommended)
EMAIL_WEBHOOK_PROVIDER=sendgrid  # or mailgun, postmark
EMAIL_WEBHOOK_SECRET=your-webhook-secret
```

### Provider Options

| Provider | Sending | Receiving | Webhooks |
|----------|---------|-----------|----------|
| SendGrid | Yes | Via webhook | Yes |
| Mailgun | Yes | Via webhook | Yes |
| Postmark | Yes | Via webhook | Yes |
| AWS SES | Yes | Via SNS | Yes |
| Custom SMTP/IMAP | Yes | IMAP polling | No |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Guest Email Client                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Email Provider                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    SMTP     │  │    IMAP     │  │   Inbound Webhook   │  │
│  │   Server    │  │   Server    │  │    (SendGrid etc)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Jack Gateway                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │             Email Channel Adapter                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │    │
│  │  │ SMTP Sender  │  │ IMAP Poller  │  │  Parser   │  │    │
│  │  │              │  │ or Webhook   │  │           │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Adapter Interface

```typescript
// src/channels/email/adapter.ts

import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';
import { ChannelAdapter, IncomingMessage, OutgoingMessage } from '../base-adapter';

export class EmailAdapter implements ChannelAdapter {
  readonly channel = 'email' as const;
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password
      }
    });
  }

  async send(message: OutgoingMessage): Promise<SendResult> {
    try {
      const { to, subject, content, html, attachments, replyTo, inReplyTo } = message;

      const result = await this.transporter.sendMail({
        from: {
          name: process.env.SMTP_FROM_NAME!,
          address: process.env.SMTP_FROM_EMAIL!
        },
        to,
        subject,
        text: content,
        html: html || this.textToHtml(content),
        attachments: attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType
        })),
        replyTo,
        inReplyTo,
        references: inReplyTo ? [inReplyTo] : undefined,
        headers: {
          'X-Jack-Conversation-Id': message.conversationId
        }
      });

      return {
        success: true,
        messageId: result.messageId,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: this.mapEmailError(error)
      };
    }
  }

  async parseIncoming(raw: string | Buffer): Promise<IncomingMessage> {
    const parsed = await simpleParser(raw);

    return {
      id: parsed.messageId || `email_${Date.now()}`,
      channel: 'email',
      channelIdentifier: this.extractSenderEmail(parsed),
      content: parsed.text || '',
      html: parsed.html || undefined,
      subject: parsed.subject,
      attachments: this.extractAttachments(parsed),
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
      timestamp: parsed.date || new Date(),
      raw: parsed
    };
  }

  private extractSenderEmail(parsed: ParsedMail): string {
    const from = parsed.from?.value[0];
    return from?.address || 'unknown@unknown.com';
  }

  private extractAttachments(parsed: ParsedMail): Attachment[] {
    return (parsed.attachments || []).map(att => ({
      filename: att.filename || 'attachment',
      contentType: att.contentType,
      size: att.size,
      content: att.content
    }));
  }

  private textToHtml(text: string): string {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        ${text.replace(/\n/g, '<br>')}
      </div>
    `;
  }

  private mapEmailError(error: unknown): ChannelError {
    if (error instanceof Error) {
      if (error.message.includes('Invalid recipient')) {
        return { code: 'INVALID_EMAIL', message: 'Invalid email address' };
      }
      if (error.message.includes('Authentication')) {
        return { code: 'AUTH_FAILED', message: 'SMTP authentication failed' };
      }
    }
    return { code: 'SEND_FAILED', message: 'Failed to send email' };
  }
}
```

### IMAP Listener

```typescript
// src/channels/email/imap-listener.ts

import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { emailAdapter } from './adapter';
import { conversationService } from '@/services/conversation';
import { guestService } from '@/services/guest';
import { logger } from '@/utils/logger';

export class IMAPListener {
  private imap: Imap;
  private isConnected = false;

  constructor(config: IMAPConfig) {
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.secure,
      tlsOptions: { rejectUnauthorized: false }
    });

    this.setupEventHandlers();
  }

  async start() {
    logger.info('Starting IMAP listener');
    this.imap.connect();
  }

  async stop() {
    logger.info('Stopping IMAP listener');
    this.imap.end();
  }

  private setupEventHandlers() {
    this.imap.on('ready', () => {
      this.isConnected = true;
      this.openMailbox();
    });

    this.imap.on('error', (error) => {
      logger.error('IMAP error', { error });
      this.reconnect();
    });

    this.imap.on('end', () => {
      this.isConnected = false;
      logger.info('IMAP connection ended');
    });

    this.imap.on('mail', (numNewMsgs) => {
      logger.info('New emails received', { count: numNewMsgs });
      this.fetchNewMessages();
    });
  }

  private openMailbox() {
    this.imap.openBox(process.env.IMAP_MAILBOX || 'INBOX', false, (err) => {
      if (err) {
        logger.error('Failed to open mailbox', { error: err });
        return;
      }

      logger.info('Mailbox opened, listening for new emails');
      this.fetchNewMessages();
    });
  }

  private async fetchNewMessages() {
    // Search for unseen messages
    this.imap.search(['UNSEEN'], (err, uids) => {
      if (err) {
        logger.error('IMAP search error', { error: err });
        return;
      }

      if (uids.length === 0) return;

      const fetch = this.imap.fetch(uids, { bodies: '' });

      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          this.processMessage(stream);
        });
      });
    });
  }

  private async processMessage(stream: NodeJS.ReadableStream) {
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }

    const raw = Buffer.concat(chunks);

    try {
      const message = await emailAdapter.parseIncoming(raw);

      // Skip automated replies
      if (this.isAutomatedReply(message)) {
        logger.info('Skipping automated reply', { from: message.channelIdentifier });
        return;
      }

      // Identify guest
      const guest = await guestService.identify('email', message.channelIdentifier);

      // Find existing conversation or create new
      let conversation = await this.findConversationByThread(message);

      if (!conversation) {
        conversation = await conversationService.create({
          guestId: guest.id,
          channel: 'email',
          channelIdentifier: message.channelIdentifier,
          metadata: { subject: message.subject }
        });
      }

      // Add message
      await conversationService.addMessage(conversation.id, {
        role: 'guest',
        content: message.content,
        metadata: {
          subject: message.subject,
          html: message.html,
          attachments: message.attachments?.length || 0
        },
        channelMessageId: message.id,
        timestamp: message.timestamp
      });

      logger.info('Email processed', {
        conversationId: conversation.id,
        guestId: guest.id,
        subject: message.subject
      });

    } catch (error) {
      logger.error('Failed to process email', { error });
    }
  }

  private isAutomatedReply(message: IncomingMessage): boolean {
    const autoReplyIndicators = [
      'auto-reply',
      'autoreply',
      'automatic reply',
      'out of office',
      'vacation reply',
      'noreply@',
      'no-reply@',
      'mailer-daemon'
    ];

    const fromLower = message.channelIdentifier.toLowerCase();
    const subjectLower = (message.subject || '').toLowerCase();

    return autoReplyIndicators.some(indicator =>
      fromLower.includes(indicator) || subjectLower.includes(indicator)
    );
  }

  private async findConversationByThread(message: IncomingMessage): Promise<Conversation | null> {
    // Check In-Reply-To header
    if (message.inReplyTo) {
      const conv = await conversationService.findByChannelMessageId(message.inReplyTo);
      if (conv) return conv;
    }

    // Check References header
    if (message.references?.length) {
      for (const ref of message.references) {
        const conv = await conversationService.findByChannelMessageId(ref);
        if (conv) return conv;
      }
    }

    // Check X-Jack-Conversation-Id header
    const conversationId = message.raw?.headers?.get('x-jack-conversation-id');
    if (conversationId) {
      return conversationService.getById(conversationId);
    }

    return null;
  }

  private reconnect() {
    setTimeout(() => {
      if (!this.isConnected) {
        logger.info('Reconnecting to IMAP');
        this.imap.connect();
      }
    }, 5000);
  }
}
```

### Webhook Handler (SendGrid)

```typescript
// src/channels/email/webhook.ts

import { Hono } from 'hono';
import crypto from 'crypto';
import { emailAdapter } from './adapter';
import { conversationService } from '@/services/conversation';
import { guestService } from '@/services/guest';
import { logger } from '@/utils/logger';

const email = new Hono();

// SendGrid Inbound Parse webhook
email.post('/webhooks/email/inbound', async (c) => {
  const body = await c.req.parseBody();

  // Validate signature if configured
  if (process.env.EMAIL_WEBHOOK_SECRET) {
    const signature = c.req.header('X-Twilio-Email-Event-Webhook-Signature');
    if (!validateSignature(body, signature)) {
      return c.text('Invalid signature', 403);
    }
  }

  try {
    const {
      from,
      to,
      subject,
      text,
      html,
      attachments: attachmentCount
    } = body as SendGridInboundPayload;

    // Parse sender email
    const senderEmail = extractEmail(from as string);

    // Identify guest
    const guest = await guestService.identify('email', senderEmail);

    // Get or create conversation
    let conversation = await conversationService.getActive(guest.id);
    if (!conversation) {
      conversation = await conversationService.create({
        guestId: guest.id,
        channel: 'email',
        channelIdentifier: senderEmail,
        metadata: { subject }
      });
    }

    // Add message
    await conversationService.addMessage(conversation.id, {
      role: 'guest',
      content: text as string || '',
      metadata: {
        subject,
        html: html as string,
        attachments: parseInt(attachmentCount as string || '0', 10)
      },
      timestamp: new Date()
    });

    logger.info('Email webhook processed', {
      conversationId: conversation.id,
      from: senderEmail,
      subject
    });

    return c.text('OK', 200);

  } catch (error) {
    logger.error('Failed to process email webhook', { error });
    return c.text('Error', 500);
  }
});

function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s<]+@[^\s>]+)/);
  return match ? match[1] : fromHeader;
}

function validateSignature(body: unknown, signature: string | undefined): boolean {
  if (!signature) return false;

  const payload = JSON.stringify(body);
  const expected = crypto
    .createHmac('sha256', process.env.EMAIL_WEBHOOK_SECRET!)
    .update(payload)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export { email };
```

---

## Email Templates

### Template System

```typescript
// src/channels/email/templates.ts

import { compile } from 'handlebars';

interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

const templates: Record<string, EmailTemplate> = {
  welcome_checkin: {
    subject: 'Welcome to {{hotelName}}, {{guestName}}!',
    text: `
Dear {{guestName}},

Welcome to {{hotelName}}! We're delighted to have you with us.

Your room {{roomNumber}} is ready. Here's some helpful information:

- WiFi Network: {{wifiNetwork}}
- WiFi Password: {{wifiPassword}}
- Breakfast: {{breakfastHours}}
- Check-out: {{checkoutTime}}

Need anything? Just reply to this email or text us at {{hotelPhone}}.

Enjoy your stay!

Best regards,
Jack The Butler
{{hotelName}}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f8f9fa; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{hotelName}}</h1>
    </div>
    <div class="content">
      <p>Dear {{guestName}},</p>
      <p>We're delighted to have you with us!</p>

      <div class="info-box">
        <h3>Your Stay Details</h3>
        <p><strong>Room:</strong> {{roomNumber}}</p>
        <p><strong>Check-out:</strong> {{checkoutTime}}</p>
      </div>

      <div class="info-box">
        <h3>WiFi Access</h3>
        <p><strong>Network:</strong> {{wifiNetwork}}</p>
        <p><strong>Password:</strong> {{wifiPassword}}</p>
      </div>

      <p>Need anything? Just reply to this email!</p>
    </div>
    <div class="footer">
      <p>{{hotelName}} | {{hotelAddress}}</p>
      <p>Powered by Jack The Butler</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  },

  checkout_reminder: {
    subject: 'Checkout Reminder - {{hotelName}}',
    text: `
Dear {{guestName}},

This is a friendly reminder that checkout is at {{checkoutTime}} today.

If you need a late checkout, just reply to this email and we'll do our best to accommodate you.

Would you like any assistance with luggage or transportation?

Thank you for staying with us!

Best regards,
Jack The Butler
    `.trim(),
    html: '...'  // Similar HTML structure
  }
};

export function renderTemplate(
  templateName: string,
  data: Record<string, unknown>
): EmailTemplate {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  return {
    subject: compile(template.subject)(data),
    text: compile(template.text)(data),
    html: compile(template.html)(data)
  };
}
```

### Sending Templated Email

```typescript
import { emailAdapter } from './adapter';
import { renderTemplate } from './templates';

async function sendWelcomeEmail(guest: Guest, stay: Stay) {
  const template = renderTemplate('welcome_checkin', {
    guestName: guest.name,
    hotelName: 'Grand Hotel',
    roomNumber: stay.roomNumber,
    wifiNetwork: 'GrandHotel_Guest',
    wifiPassword: 'Welcome2024',
    breakfastHours: '7:00 AM - 10:30 AM',
    checkoutTime: '11:00 AM',
    hotelPhone: '+1 555-123-4567'
  });

  return emailAdapter.send({
    to: guest.email,
    subject: template.subject,
    content: template.text,
    html: template.html,
    conversationId: stay.conversationId
  });
}
```

---

## Email Threading

### Maintaining Thread Continuity

```typescript
// When sending a reply, include threading headers
async function sendReply(conversation: Conversation, content: string) {
  const lastMessage = await getLastGuestMessage(conversation.id);

  return emailAdapter.send({
    to: conversation.channelIdentifier,
    subject: `Re: ${conversation.metadata.subject}`,
    content,
    inReplyTo: lastMessage?.channelMessageId,
    conversationId: conversation.id
  });
}
```

---

## Attachment Handling

### Receiving Attachments

```typescript
// Store attachments and extract relevant info
async function processAttachments(
  conversationId: string,
  attachments: Attachment[]
): Promise<ProcessedAttachment[]> {
  const processed: ProcessedAttachment[] = [];

  for (const att of attachments) {
    // Skip large attachments
    if (att.size > 10 * 1024 * 1024) {  // 10MB limit
      logger.warn('Attachment too large', {
        filename: att.filename,
        size: att.size
      });
      continue;
    }

    // Store in object storage
    const url = await storage.upload(
      `conversations/${conversationId}/attachments/${att.filename}`,
      att.content,
      att.contentType
    );

    processed.push({
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      url
    });
  }

  return processed;
}
```

### Sending Attachments

```typescript
async function sendWithAttachment(
  to: string,
  content: string,
  attachment: { filename: string; content: Buffer; contentType: string }
) {
  return emailAdapter.send({
    to,
    subject: 'Information from Grand Hotel',
    content,
    attachments: [attachment]
  });
}
```

---

## Testing

### Unit Tests

```typescript
// src/channels/email/adapter.test.ts

import { describe, it, expect, vi } from 'vitest';
import { EmailAdapter } from './adapter';

describe('EmailAdapter', () => {
  describe('parseIncoming', () => {
    it('should parse email correctly', async () => {
      const adapter = new EmailAdapter(mockConfig);

      const rawEmail = `
From: guest@example.com
To: concierge@hotel.com
Subject: Room service request
Date: Mon, 15 Jan 2024 10:30:00 +0000
Message-ID: <abc123@example.com>

I would like to order breakfast.
      `.trim();

      const message = await adapter.parseIncoming(rawEmail);

      expect(message.channelIdentifier).toBe('guest@example.com');
      expect(message.subject).toBe('Room service request');
      expect(message.content).toContain('order breakfast');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/channels/email.test.ts

import { describe, it, expect } from 'vitest';
import nodemailer from 'nodemailer';

describe('Email Integration', () => {
  it('should send email via SMTP', async () => {
    // Use Ethereal for testing
    const testAccount = await nodemailer.createTestAccount();

    const adapter = new EmailAdapter({
      smtp: {
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        user: testAccount.user,
        password: testAccount.pass
      }
    });

    const result = await adapter.send({
      to: 'test@example.com',
      subject: 'Test Email',
      content: 'This is a test'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});
```

---

## Monitoring

### Metrics

```typescript
import { metrics } from '@/utils/metrics';

// Track emails sent
metrics.counter('email_sent_total', {
  status: 'success' | 'failure',
  template: string
});

// Track emails received
metrics.counter('email_received_total', {
  source: 'imap' | 'webhook'
});

// Track IMAP connection status
metrics.gauge('email_imap_connected', {
  value: 0 | 1
});
```

---

## Related

- [Channel Architecture](../../03-architecture/c4-components/channels.md) - Channel design
- [SMS Channel](sms-channel.md) - SMS integration
- [WhatsApp Channel](whatsapp-channel.md) - WhatsApp integration
