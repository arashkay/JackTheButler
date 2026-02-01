# Phase 15: Architecture Simplification

**Version:** 1.6.0
**Codename:** Clean Slate
**Focus:** Simplify to Orchestrator/Provider pattern, eliminate duplication
**Depends on:** Phase 14 (Real-Time Dashboard)

---

## Status: COMPLETE ✓

Completed on 2026-02-01:
- **15.1** AI Provider Consolidation ✓
- **15.2** Channel Provider Consolidation ✓
- **15.3** Orchestrators - Already implemented in `src/core/`
- **15.4** Cleanup ✓

---

## Goal

Simplify the codebase by clearly separating **Orchestrators** (business logic) from **Providers** (external services). Remove all duplicate code between `ai/`, `channels/` and `extensions/`.

---

## Sub-Phases

| Sub-Phase | Focus | Risk | Status |
|-----------|-------|------|:------:|
| **15.1** | Consolidate AI providers | Low | ✓ |
| **15.2** | Consolidate Channel providers | Medium | ✓ |
| **15.3** | Create Orchestrators | Medium | ✓ (in core/) |
| **15.4** | Cleanup old folders | Low | ✓ |

See detailed sub-phase documents:
- [Phase 15.1: AI Provider Consolidation](phase-15-1-ai-providers.md)
- [Phase 15.2: Channel Provider Consolidation](phase-15-2-channel-providers.md)
- [Phase 15.3: Create Orchestrators](phase-15-3-orchestrators.md)
- [Phase 15.4: Cleanup](phase-15-4-cleanup.md)

---

## The Problem

Current state has duplication:

| Type | Location 1 | Location 2 | Duplicated |
|------|------------|------------|:----------:|
| AI | `ai/providers/claude.ts` | `extensions/ai/providers/anthropic.ts` | Yes |
| AI | `ai/providers/openai.ts` | `extensions/ai/providers/openai.ts` | Yes |
| Channels | `channels/whatsapp/api.ts` | `extensions/channels/whatsapp/meta.ts` | Yes |
| Channels | `channels/sms/api.ts` | `extensions/channels/sms/twilio.ts` | Yes |

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GATEWAY                                 │
│                   (HTTP/WebSocket entry)                        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATORS                             │
│              (Business logic - uses providers)                  │
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │ AI Responder│   │  Message    │   │  PMS Sync   │          │
│   │             │   │  Handler    │   │             │          │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
└──────────┼─────────────────┼─────────────────┼──────────────────┘
           │                 │                 │
           ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PROVIDERS                                │
│                (Extensions - external services)                 │
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │ anthropic   │   │ whatsapp    │   │ opera       │          │
│   │ openai      │   │ twilio      │   │ mews        │          │
│   │ ollama      │   │ mailgun     │   │ cloudbeds   │          │
│   │             │   │ telegram    │   │             │          │
│   └─────────────┘   └─────────────┘   └─────────────┘          │
│        AI              CHANNEL             PMS                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target Folder Structure

```
src/
├── gateway/                     # HTTP/WebSocket entry points
│   ├── routes/
│   │   ├── api.ts               # REST API
│   │   └── webhooks/            # Webhook handlers (thin, delegate to orchestrators)
│   └── websocket.ts
│
├── orchestrators/               # Business logic (uses providers)
│   ├── ai-responder.ts          # Generates AI responses
│   ├── message-handler.ts       # Processes inbound/outbound messages
│   └── pms-sync.ts              # Syncs data with PMS
│
├── extensions/                  # ALL providers (single location)
│   ├── ai/
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   └── ollama.ts
│   ├── channels/
│   │   ├── whatsapp.ts
│   │   ├── twilio.ts
│   │   ├── mailgun.ts
│   │   └── telegram.ts
│   └── pms/
│       ├── opera.ts
│       ├── mews.ts
│       └── cloudbeds.ts
│
├── core/                        # Domain logic
│   ├── message-processor.ts
│   ├── task-router.ts
│   └── escalation-engine.ts
│
├── db/                          # Database
├── services/                    # State management
└── types/                       # TypeScript types
```

---

## Tasks

### 1. Create Orchestrators

Move business logic out of scattered locations into clear orchestrators:

- [ ] Create `src/orchestrators/ai-responder.ts`
  - Move logic from `ai/responder.ts`
  - Uses providers from `extensions/ai/`

- [ ] Create `src/orchestrators/message-handler.ts`
  - Handles inbound message processing
  - Handles outbound message sending
  - Uses providers from `extensions/channels/`

- [ ] Create `src/orchestrators/pms-sync.ts`
  - Move logic from `services/pms-sync.ts`
  - Uses providers from `extensions/pms/`

### 2. Consolidate Providers

Merge duplicate provider code into single implementations:

- [ ] Merge `ai/providers/claude.ts` + `extensions/ai/providers/anthropic.ts`
  - Keep in `extensions/ai/anthropic.ts`
  - Delete duplicate

- [ ] Merge `ai/providers/openai.ts` + `extensions/ai/providers/openai.ts`
  - Keep in `extensions/ai/openai.ts`
  - Delete duplicate

- [ ] Merge `channels/whatsapp/api.ts` + `extensions/channels/whatsapp/meta.ts`
  - Keep in `extensions/channels/whatsapp.ts`
  - Delete duplicate

- [ ] Merge `channels/sms/` + `extensions/channels/sms/`
  - Keep in `extensions/channels/twilio.ts`
  - Delete duplicate

- [ ] Merge `channels/email/` + `extensions/channels/email/`
  - Keep in `extensions/channels/mailgun.ts` (or smtp.ts)
  - Delete duplicate

### 3. Simplify Provider Interface

Each provider type has a simple interface:

```typescript
// extensions/ai/types.ts
interface AIProvider {
  id: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  embed?(text: string): Promise<number[]>;
  testConnection(): Promise<ConnectionTestResult>;
}

// extensions/channels/types.ts
interface ChannelProvider {
  id: string;
  send(message: OutboundMessage): Promise<SendResult>;
  parseWebhook(payload: unknown): InboundMessage;
  verifySignature?(payload: string, signature: string): boolean;
  testConnection(): Promise<ConnectionTestResult>;
}

// extensions/pms/types.ts
interface PMSProvider {
  id: string;
  getReservation(id: string): Promise<Reservation>;
  getGuest(id: string): Promise<Guest>;
  listArrivals(date: string): Promise<Reservation[]>;
  testConnection(): Promise<ConnectionTestResult>;
}
```

### 4. Delete Old Folders

After migration and tests pass:

- [ ] Delete `src/ai/providers/` (merged into extensions)
- [ ] Delete `src/channels/` (merged into extensions)
- [ ] Delete `src/pipeline/` (merged into orchestrators)

### 5. Update Imports

- [ ] Update all imports to use new locations
- [ ] Run TypeScript check: `pnpm typecheck`
- [ ] Run tests: `pnpm test`

---

## Provider Examples

### AI Provider (Anthropic)

```typescript
// src/extensions/ai/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, CompletionRequest, CompletionResponse } from './types.js';

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  private client: Anthropic;

  constructor(config: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.messages.create({
      model: request.model || 'claude-sonnet-4-20250514',
      messages: request.messages,
      max_tokens: request.maxTokens || 1024,
    });
    return { content: response.content[0].text };
  }

  async testConnection() {
    // Simple test call
  }
}
```

### Channel Provider (WhatsApp)

```typescript
// src/extensions/channels/whatsapp.ts
import type { ChannelProvider, OutboundMessage, SendResult } from './types.js';

export class WhatsAppProvider implements ChannelProvider {
  readonly id = 'whatsapp';
  private accessToken: string;
  private phoneNumberId: string;

  constructor(config: { accessToken: string; phoneNumberId: string }) {
    this.accessToken = config.accessToken;
    this.phoneNumberId = config.phoneNumberId;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: message.to,
        text: { body: message.content },
      }),
    });
    return { success: response.ok, messageId: (await response.json()).messages?.[0]?.id };
  }

  parseWebhook(payload: unknown) {
    // Parse Meta webhook format
  }

  verifySignature(payload: string, signature: string) {
    // HMAC verification
  }

  async testConnection() {
    // Verify credentials
  }
}
```

---

## Orchestrator Example

```typescript
// src/orchestrators/message-handler.ts
import { getProvider } from '@/extensions/channels/index.js';
import { AIResponder } from './ai-responder.js';

export class MessageHandler {
  private aiResponder: AIResponder;

  constructor() {
    this.aiResponder = new AIResponder();
  }

  async handleInbound(channelId: string, payload: unknown) {
    // 1. Get the right channel provider
    const provider = getProvider(channelId);

    // 2. Parse the webhook
    const message = provider.parseWebhook(payload);

    // 3. Generate AI response
    const response = await this.aiResponder.respond(message);

    // 4. Send response back
    await provider.send({
      to: message.from,
      content: response.content,
    });
  }
}
```

---

## Acceptance Criteria

- [ ] All provider code lives in `src/extensions/` only
- [ ] No duplicate implementations between folders
- [ ] Orchestrators clearly separated from providers
- [ ] `src/ai/providers/` deleted
- [ ] `src/channels/` deleted
- [ ] All tests pass
- [ ] TypeScript compiles without errors

---

## What You Can Test

```bash
# After completing this phase:

# 1. Send a WhatsApp message - should work
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"123","text":{"body":"Hello"}}]}}]}]}'

# 2. Test AI provider
curl http://localhost:3000/api/v1/extensions/ai/anthropic/test

# 3. Test channel provider
curl http://localhost:3000/api/v1/extensions/channels/whatsapp/test

# 4. Check no duplicate files
find src -name "*.ts" | xargs grep -l "WhatsAppAPI\|MetaWhatsAppProvider" | wc -l
# Expected: 1 (only one implementation)
```

---

## Files Changed

### New Files
```
src/orchestrators/
├── ai-responder.ts
├── message-handler.ts
└── pms-sync.ts
```

### Moved/Merged Files
```
ai/providers/claude.ts       → extensions/ai/anthropic.ts (merged)
ai/providers/openai.ts       → extensions/ai/openai.ts (merged)
channels/whatsapp/           → extensions/channels/whatsapp.ts (merged)
channels/sms/                → extensions/channels/twilio.ts (merged)
channels/email/              → extensions/channels/mailgun.ts (merged)
```

### Deleted Files
```
src/ai/providers/            # All files (merged into extensions)
src/channels/                # Entire folder (merged into extensions)
src/pipeline/                # Merged into orchestrators
```

---

## Related

- [Phase 10.3: Extension Consolidation](phase-10-3-extension-consolidation.md) - Earlier attempt (superseded)
- [Architecture Decisions](../03-architecture/decisions/) - Background context
