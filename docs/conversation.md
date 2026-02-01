# Data Entities

Reference for database entities and their importance to core business value.

---

## Entity Priority

Sorted by importance to the 5 business value drivers (V1-V5).

| Entity | Essential | Purpose |
|--------|:---------:|---------|
| conversations | **Yes** | Guest communication threads |
| messages | **Yes** | Individual messages within conversations |
| guests | **Yes** | Guest identity, channel mappings, learned preferences |
| tasks | **Yes** | Service requests routed to departments |
| knowledgeBase | **Yes** | Hotel info for answering questions |
| knowledgeEmbeddings | **Yes** | Vector search for knowledge retrieval |
| staff | **Yes** | Employee auth, assignments, escalations |
| reservations | **Yes** | Booking records, stay context |
| settings | No | Global configuration |
| automationRules | No | Scheduled/event-driven workflows |
| approvalQueue | No | Autonomy L1 approval workflow |
| responseCache | No | Cached AI responses for performance |
| integrationConfigs | No | External service credentials |
| integrationLogs | No | Integration debugging |
| automationLogs | No | Automation debugging |
| auditLog | No | Security/compliance tracking |

---

## Data Ownership

| Category | Entities | Source of Truth |
|----------|----------|-----------------|
| **Jack's Domain** | conversations, messages, tasks, knowledgeBase, knowledgeEmbeddings, preferences (in guests) | Local DB | guests | reservations | PMS |
| **Infrastructure** | settings, staff, integrationConfigs, auditLog | Local DB |

---

## Message Processing Flow

```
INCOMING MESSAGE (WhatsApp/SMS/Email)
         │
    [Webhook] ─── Verify & parse
         │
    [Message Processor] ─── Central orchestrator
         │
         ├── 1. Identify guest (by phone/email)
         ├── 2. Find/create conversation
         ├── 3. Load context (reservation, profile)
         ├── 4. Save inbound message
         │
         ├── 5. Generate response (AI)
         │      ├── Intent classification
         │      ├── Confidence score
         │      └── Response content
         │
         ├── 5a. [Task Router] ─── If action needed
         │        └── Create task OR queue for approval
         │
         ├── 5b. [Escalation Engine] ─── If human needed
         │        └── Low confidence, negative sentiment, VIP complaint
         │
         ├── 5c. [Autonomy Check] ─── Can AI send this?
         │        ├── L1: Queue for staff approval
         │        └── L2: Auto-send
         │
         ├── 6. Save outbound message
         └── 7. Send response to guest
```

## Decision Points

| Decision | Who Decides | Criteria |
|----------|-------------|----------|
| Create task? | Task Router | Intent requires action + confidence >= 0.6 |
| Which department? | Task Router | Intent to department mapping |
| Escalate to human? | Escalation Engine | Low confidence, sentiment, repetition, VIP |
| Auto-execute? | Autonomy Engine | Action type + autonomy level (L1/L2) |

## Core Files

| File | Purpose |
|------|---------|
| `src/core/message-processor.ts` | Central orchestrator |
| `src/core/task-router.ts` | Routes intents to tasks |
| `src/core/escalation-engine.ts` | Detects when human needed |
| `src/core/autonomy.ts` | Controls auto-execution |
| `src/core/approval-queue.ts` | Queues actions for staff review |

## Source Folders

| Folder | Contents |
|--------|----------|
| core/ | message-processor, task-router, escalation-engine, autonomy, approval-queue, interfaces |
| db/ | schema, migrations, seed data |
| gateway/ | HTTP server, webhooks, WebSocket, routes |
| services/ | guest, conversation, task, auth, scheduler, extension-config |
| ai/ | responder, intent classification, knowledge retrieval, cache (no providers - moved to extensions) |
| channels/ | email adapter, webchat adapter (whatsapp/sms moved to extensions) |
| types/ | TypeScript type definitions |
| utils/ | logger, crypto, id generation |
| config/ | Environment/config loading |
| errors/ | Custom error classes |
| events/ | Event emitter system |
| extensions/ | ALL external providers (ai: anthropic/openai/ollama, channels: whatsapp/sms/email, pms) |
| pipeline/ | responder interface, re-exports from core (legacy) |
| automation/ | Scheduled/event-driven rules |
| monitoring/ | Metrics collection |

**Note:** WhatsApp and SMS are extension-based. Configure via Settings > Integrations in the dashboard.

---

## Related

- [Business Value](01-vision/business-value.md) - V1-V5 definitions
- [Schema](../src/db/schema.ts) - Implementation
