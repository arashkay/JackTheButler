# Phase 15.3: Create Orchestrators

**Focus:** Create clear orchestrator layer for business logic
**Risk:** Medium
**Depends on:** Phase 15.2
**Status:** ✓ COMPLETE (Already implemented in src/core/)

> **Note:** The orchestrator pattern is already implemented in `src/core/` with message-processor.ts, task-router.ts, escalation-engine.ts, and autonomy.ts. No new folder needed.

---

## Goal

Create `src/orchestrators/` folder with clear business logic that uses providers. Orchestrators contain the "how" of processing, providers contain the "what" of external communication.

---

## What Are Orchestrators?

| Layer | Purpose | Example |
|-------|---------|---------|
| **Orchestrators** | Business logic, workflow | "Generate AI response, check confidence, maybe escalate" |
| **Providers** | External service calls | "Call Anthropic API with this prompt" |

---

## Tasks

### 1. Create Orchestrators Folder

- [ ] Create `src/orchestrators/` directory
- [ ] Create `src/orchestrators/index.ts`

### 2. Create AI Responder Orchestrator

- [ ] Create `src/orchestrators/ai-responder.ts`
- [ ] Move logic from `src/ai/responder.ts`
- [ ] Import providers from `extensions/ai/`

```typescript
// src/orchestrators/ai-responder.ts
import { getAIProvider } from '@/extensions/ai/index.js';

export class AIResponder {
  async respond(message: string, context: GuestContext): Promise<AIResponse> {
    const provider = getAIProvider(); // Gets configured provider

    const prompt = this.buildPrompt(message, context);
    const response = await provider.complete(prompt);

    return {
      content: response.content,
      confidence: response.confidence,
      intent: response.intent,
    };
  }
}
```

### 3. Create Message Handler Orchestrator

- [ ] Create `src/orchestrators/message-handler.ts`
- [ ] Move logic from `src/pipeline/processor.ts`
- [ ] Coordinates: receive → process → respond → send

```typescript
// src/orchestrators/message-handler.ts
import { getChannelProvider } from '@/extensions/channels/index.js';
import { AIResponder } from './ai-responder.js';

export class MessageHandler {
  async handleInbound(channelId: string, payload: unknown) {
    const channel = getChannelProvider(channelId);
    const message = channel.parseWebhook(payload);

    const response = await this.aiResponder.respond(message.content, context);

    await channel.send({ to: message.from, content: response.content });
  }
}
```

### 4. Create PMS Sync Orchestrator

- [ ] Create `src/orchestrators/pms-sync.ts`
- [ ] Move logic from `src/services/pms-sync.ts`
- [ ] Import providers from `extensions/pms/`

### 5. Update Core to Use Orchestrators

- [ ] Update `src/core/message-processor.ts` to use `MessageHandler`
- [ ] Update other core modules as needed

### 6. Delete Old Files

- [ ] Delete `src/ai/responder.ts` (moved to orchestrators)
- [ ] Delete `src/pipeline/` folder (moved to orchestrators)

---

## New Folder Structure

```
src/orchestrators/
├── index.ts
├── ai-responder.ts      # AI response generation
├── message-handler.ts   # Inbound/outbound message flow
└── pms-sync.ts          # PMS data synchronization
```

---

## Verification

```bash
# 1. TypeScript compiles
pnpm typecheck

# 2. Tests pass
pnpm test

# 3. Message processing works end-to-end
# Send a WhatsApp message and verify response
```

---

## Files Changed

| Action | File |
|--------|------|
| Create | `src/orchestrators/index.ts` |
| Create | `src/orchestrators/ai-responder.ts` |
| Create | `src/orchestrators/message-handler.ts` |
| Create | `src/orchestrators/pms-sync.ts` |
| Modify | `src/core/message-processor.ts` |
| Delete | `src/ai/responder.ts` |
| Delete | `src/pipeline/` |

---

## Acceptance Criteria

- [ ] `src/orchestrators/` folder exists with 3 orchestrators
- [ ] Orchestrators use providers from `extensions/`
- [ ] Core modules use orchestrators
- [ ] `src/pipeline/` deleted
- [ ] All tests pass
