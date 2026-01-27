# Phase 5: Channels

**Version:** 0.6.0
**Codename:** Channels
**Goal:** WhatsApp integration working

---

## Overview

Phase 5 connects Jack to real messaging channels. After this phase:

1. WhatsApp webhook receives messages
2. Messages processed through pipeline
3. Responses sent back via WhatsApp
4. Guest identification from phone number
5. **Real guests can message Jack**

---

## Prerequisites

- Phase 4 complete (AI responds intelligently)
- WhatsApp Business Account with Cloud API access
- Webhook URL accessible from internet (ngrok for dev)

---

## Deliverables

### 0.6.0-alpha.1: Webhook Infrastructure

**Files to create:**

```
src/gateway/routes/
└── webhooks/
    ├── index.ts              # Webhook router
    ├── whatsapp.ts           # WhatsApp webhook
    └── verify.ts             # Webhook verification
```

**Webhook route:**

```typescript
// src/gateway/routes/webhooks/whatsapp.ts
import { Hono } from 'hono';
import { verifySignature } from '@/channels/whatsapp/security';

const webhook = new Hono();

// Verification endpoint (GET)
webhook.get('/', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    return c.text(challenge);
  }
  return c.text('Forbidden', 403);
});

// Message webhook (POST)
webhook.post('/', async (c) => {
  // 1. Verify signature
  const signature = c.req.header('x-hub-signature-256');
  const body = await c.req.text();

  if (!verifySignature(body, signature)) {
    return c.text('Invalid signature', 401);
  }

  // 2. Parse and process
  const payload = JSON.parse(body);
  await whatsappAdapter.handleWebhook(payload);

  // 3. Always return 200 quickly
  return c.text('OK', 200);
});

export { webhook as whatsappWebhook };
```

**Acceptance criteria:**
- [ ] GET webhook returns challenge for verification
- [ ] POST webhook validates signature
- [ ] Invalid signatures rejected
- [ ] Response returned within 100ms

---

### 0.6.0-alpha.2: WhatsApp Adapter

**Files to create:**

```
src/channels/whatsapp/
├── index.ts                  # Main adapter
├── api.ts                    # WhatsApp Cloud API client
├── parser.ts                 # Parse inbound messages
├── formatter.ts              # Format outbound messages
└── security.ts               # Signature verification
```

**WhatsApp adapter:**

```typescript
// src/channels/whatsapp/index.ts
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel: ChannelType = 'whatsapp';

  constructor(
    private api: WhatsAppAPI,
    private processor: MessageProcessor
  ) {}

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const messages = parseWebhookMessages(payload);

    for (const msg of messages) {
      const inbound: InboundMessage = {
        id: msg.id,
        channel: 'whatsapp',
        channelId: msg.from,  // Phone number
        content: msg.text?.body || '',
        contentType: parseContentType(msg),
        timestamp: new Date(parseInt(msg.timestamp) * 1000),
        raw: msg,
      };

      // Process asynchronously
      this.processor.process(inbound)
        .then(response => this.send(msg.from, response))
        .catch(err => logger.error({ err }, 'Failed to process message'));
    }
  }

  async send(to: string, message: OutboundMessage): Promise<SendResult> {
    const result = await this.api.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message.content },
    });

    return {
      channelMessageId: result.messages[0].id,
      status: 'sent',
    };
  }
}
```

**Acceptance criteria:**
- [ ] Inbound messages parsed correctly
- [ ] Phone numbers extracted
- [ ] Text messages handled
- [ ] Outbound messages sent via API

---

### 0.6.0-alpha.3: Guest Identification

**Update guest service:**

```typescript
// src/services/guest.ts
export class GuestService {
  async findOrCreateByPhone(phone: string): Promise<Guest> {
    // Normalize phone number
    const normalized = normalizePhone(phone);

    // Find existing guest
    const existing = await this.db.select()
      .from(guests)
      .where(eq(guests.phone, normalized))
      .limit(1);

    if (existing[0]) return existing[0];

    // Create new guest with minimal info
    const id = generateId('guest');
    await this.db.insert(guests).values({
      id,
      firstName: 'Guest',
      lastName: phone.slice(-4),  // Last 4 digits as placeholder
      phone: normalized,
    });

    return this.findById(id);
  }
}
```

**Link guest to conversation:**

```typescript
// In MessageProcessor
async process(inbound: InboundMessage): Promise<OutboundMessage> {
  // 1. Identify guest (if phone channel)
  let guestId: string | undefined;
  if (inbound.channel === 'whatsapp' || inbound.channel === 'sms') {
    const guest = await this.guestService.findOrCreateByPhone(inbound.channelId);
    guestId = guest.id;
  }

  // 2. Find or create conversation (with guest link)
  const conversation = await this.conversationService.findOrCreate(
    inbound.channel,
    inbound.channelId,
    guestId
  );

  // ... rest of processing
}
```

**Acceptance criteria:**
- [ ] Guests created from phone numbers
- [ ] Existing guests matched by phone
- [ ] Conversations linked to guests
- [ ] Phone numbers normalized

---

### 0.6.0-alpha.4: Message Status Tracking

**Track delivery status:**

```typescript
// Status webhook handling
webhook.post('/status', async (c) => {
  const payload = await c.req.json();
  const statuses = parseStatusUpdates(payload);

  for (const status of statuses) {
    await this.db.update(messages)
      .set({
        deliveryStatus: status.status,  // sent, delivered, read, failed
        deliveryError: status.errors?.[0]?.message,
      })
      .where(eq(messages.channelMessageId, status.id));
  }

  return c.text('OK');
});
```

**Acceptance criteria:**
- [ ] Delivery status updated in database
- [ ] Status: sent → delivered → read tracked
- [ ] Failed messages marked with error

---

### 0.6.0-alpha.5: Development Testing Setup

**ngrok setup for local development:**

```bash
# .env.local additions
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_APP_SECRET=your-app-secret
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WEBHOOK_URL=https://xxxx.ngrok.io
```

**Development script:**

```bash
# scripts/dev-whatsapp.sh
#!/bin/bash
# Start ngrok
ngrok http 3000 &
NGROK_PID=$!

# Wait for ngrok
sleep 2

# Get public URL
WEBHOOK_URL=$(curl -s localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
echo "Webhook URL: $WEBHOOK_URL/webhooks/whatsapp"

# Start dev server
WEBHOOK_URL=$WEBHOOK_URL pnpm dev
```

**Acceptance criteria:**
- [ ] ngrok tunnel works
- [ ] Webhook registered with Meta
- [ ] Test message received
- [ ] Response sent back

---

## Testing Checkpoint

### Manual Tests

```bash
# Test 1: Webhook verification
curl "http://localhost:3000/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Expected: test123

# Test 2: Send test message via WhatsApp
# Use Meta's test tool or actual WhatsApp
# Expected: Message appears in database

# Test 3: Check response sent
# Expected: Response in WhatsApp chat
```

### End-to-End Test

1. Send WhatsApp message: "What time is checkout?"
2. Verify message logged in Jack
3. Verify AI response generated
4. Verify response received in WhatsApp
5. Check guest created in database
6. Check conversation linked to guest

### Stakeholder Demo

**Demo script:**
1. Show WhatsApp on phone
2. Send message to Jack's number
3. Receive AI response
4. Show conversation in database
5. Show guest profile created

**Key message:** "Jack is now live on WhatsApp. Real guests can message."

---

## Exit Criteria

Phase 5 is complete when:

1. **WhatsApp webhook** receives and validates messages
2. **Messages flow** through pipeline with AI responses
3. **Responses sent** back via WhatsApp API
4. **Guests identified** from phone numbers
5. **Delivery status** tracked

---

## Dependencies

**Add to package.json:**

```json
{
  "dependencies": {
    "libphonenumber-js": "^1.11.0"
  }
}
```

---

## Security Considerations

- Webhook signature verification is REQUIRED
- Store access tokens in environment, never in code
- Rate limit webhook endpoints
- Log but don't expose phone numbers in errors

---

## Next Phase

After Phase 5, proceed to [Phase 6: Operations](phase-6-operations.md) to add staff dashboard.

---

## Checklist for Claude Code

```markdown
## Phase 5 Implementation Checklist

### 0.6.0-alpha.1: Webhook Infrastructure
- [ ] Create src/gateway/routes/webhooks/whatsapp.ts
- [ ] Implement GET verification endpoint
- [ ] Implement POST message endpoint
- [ ] Add signature verification
- [ ] Verify: Webhook passes Meta verification

### 0.6.0-alpha.2: WhatsApp Adapter
- [ ] Create src/channels/whatsapp/index.ts
- [ ] Create src/channels/whatsapp/api.ts
- [ ] Create src/channels/whatsapp/parser.ts
- [ ] Implement send method
- [ ] Verify: Messages sent via API

### 0.6.0-alpha.3: Guest Identification
- [ ] Add findOrCreateByPhone to GuestService
- [ ] Implement phone normalization
- [ ] Link guests to conversations
- [ ] Verify: Guests created from messages

### 0.6.0-alpha.4: Status Tracking
- [ ] Handle status webhooks
- [ ] Update message delivery_status
- [ ] Track sent → delivered → read
- [ ] Verify: Status updates in database

### 0.6.0-alpha.5: Dev Testing
- [ ] Create ngrok setup script
- [ ] Document Meta webhook setup
- [ ] Test end-to-end flow
- [ ] Verify: Full loop works

### Phase 5 Complete
- [ ] All checks above pass
- [ ] WhatsApp message → AI response works
- [ ] Commit: "Phase 5: WhatsApp integration complete"
- [ ] Tag: v0.6.0
```
