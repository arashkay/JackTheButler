# Phase 3: Pipeline

**Version:** 0.4.0
**Codename:** Pipeline
**Goal:** Message processing flow working (echo bot)

---

## Overview

Phase 3 establishes the message processing pipeline. After this phase:

1. Messages flow through the system
2. Conversations are created and tracked
3. Basic "echo bot" responds to messages
4. WebSocket broadcasts updates
5. **First stakeholder demo possible**

---

## Prerequisites

- Phase 2 complete (Gateway responding)

---

## Deliverables

### 0.4.0-alpha.1: Message Types and Events

**Files to create:**

```
src/types/
├── message.ts                # Message types
├── conversation.ts           # Conversation types
├── events.ts                 # Event types
└── index.ts                  # Re-exports
src/events/
├── index.ts                  # Event emitter setup
└── types.ts                  # Event payload types
```

**Core message types:**

```typescript
// src/types/message.ts
export interface InboundMessage {
  id: string;
  conversationId?: string;
  channel: ChannelType;
  channelId: string;              // Phone number, email, session ID
  content: string;
  contentType: 'text' | 'image' | 'audio' | 'document';
  timestamp: Date;
  raw?: unknown;                  // Original channel payload
}

export interface OutboundMessage {
  conversationId: string;
  content: string;
  contentType: 'text' | 'image';
  metadata?: Record<string, unknown>;
}

export type ChannelType = 'whatsapp' | 'sms' | 'email' | 'webchat';
```

**Event system:**

```typescript
// src/events/index.ts
import { EventEmitter } from 'events';

export const events = new EventEmitter();

// Event types
export const EventTypes = {
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_SENT: 'message.sent',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
  TASK_CREATED: 'task.created',
} as const;
```

**Acceptance criteria:**
- [ ] Message types defined
- [ ] Event emitter configured
- [ ] Events can be emitted and listened to

---

### 0.4.0-alpha.2: Conversation Service

**Files to create:**

```
src/services/
├── conversation.ts           # Conversation CRUD
├── message.ts                # Message CRUD
└── guest.ts                  # Guest CRUD (basic)
```

**Conversation service:**

```typescript
// src/services/conversation.ts
export class ConversationService {
  constructor(private db: Database) {}

  async findOrCreate(channelType: ChannelType, channelId: string): Promise<Conversation> {
    // Find active conversation for this channel
    const existing = await this.db.select()
      .from(conversations)
      .where(and(
        eq(conversations.channelType, channelType),
        eq(conversations.channelId, channelId),
        eq(conversations.state, 'active')
      ))
      .limit(1);

    if (existing[0]) return existing[0];

    // Create new conversation
    const id = generateId('conv');
    await this.db.insert(conversations).values({
      id,
      channelType,
      channelId,
      state: 'active',
    });

    events.emit(EventTypes.CONVERSATION_CREATED, { conversationId: id });
    return this.findById(id);
  }

  async addMessage(conversationId: string, message: CreateMessageInput): Promise<Message> {
    const id = generateId('msg');
    await this.db.insert(messages).values({
      id,
      conversationId,
      ...message,
    });

    // Update conversation last_message_at
    await this.db.update(conversations)
      .set({ lastMessageAt: new Date().toISOString() })
      .where(eq(conversations.id, conversationId));

    return this.getMessage(id);
  }
}
```

**Acceptance criteria:**
- [ ] Conversations can be created
- [ ] Messages can be added to conversations
- [ ] Conversation state tracked
- [ ] Last message timestamp updated

---

### 0.4.0-alpha.3: Message Processor

**Files to create:**

```
src/pipeline/
├── index.ts                  # Pipeline orchestration
├── processor.ts              # Message processor
└── responder.ts              # Response generator (echo for now)
```

**Message processor:**

```typescript
// src/pipeline/processor.ts
export class MessageProcessor {
  constructor(
    private conversationService: ConversationService,
    private responder: Responder
  ) {}

  async process(inbound: InboundMessage): Promise<OutboundMessage> {
    const log = createLogger('processor');

    // 1. Find or create conversation
    const conversation = await this.conversationService.findOrCreate(
      inbound.channel,
      inbound.channelId
    );

    // 2. Save inbound message
    await this.conversationService.addMessage(conversation.id, {
      direction: 'inbound',
      senderType: 'guest',
      content: inbound.content,
      contentType: inbound.contentType,
    });

    log.info({ conversationId: conversation.id }, 'Processing message');

    // 3. Generate response (echo for now)
    const response = await this.responder.generate(conversation, inbound);

    // 4. Save outbound message
    await this.conversationService.addMessage(conversation.id, {
      direction: 'outbound',
      senderType: 'ai',
      content: response.content,
      contentType: 'text',
    });

    return {
      conversationId: conversation.id,
      content: response.content,
      contentType: 'text',
    };
  }
}
```

**Echo responder (temporary):**

```typescript
// src/pipeline/responder.ts
export class EchoResponder implements Responder {
  async generate(conversation: Conversation, message: InboundMessage): Promise<Response> {
    return {
      content: `Echo: ${message.content}`,
      confidence: 1.0,
    };
  }
}
```

**Acceptance criteria:**
- [ ] Messages flow through processor
- [ ] Conversations created/found correctly
- [ ] Messages saved to database
- [ ] Echo response returned

---

### 0.4.0-alpha.4: WebChat Channel (Internal Test)

**Files to create:**

```
src/channels/
├── index.ts                  # Channel exports
├── types.ts                  # Channel interface
└── webchat/
    ├── index.ts              # WebChat adapter
    └── handler.ts            # WebSocket message handler
```

**WebChat adapter:**

```typescript
// src/channels/webchat/index.ts
export class WebChatAdapter implements ChannelAdapter {
  readonly channel: ChannelType = 'webchat';

  constructor(private wss: WebSocketServer, private processor: MessageProcessor) {
    this.setupHandlers();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws) => {
      const sessionId = generateId('ws');

      ws.on('message', async (data) => {
        const parsed = JSON.parse(data.toString());

        if (parsed.type === 'message') {
          const inbound: InboundMessage = {
            id: generateId('msg'),
            channel: 'webchat',
            channelId: sessionId,
            content: parsed.content,
            contentType: 'text',
            timestamp: new Date(),
          };

          const response = await this.processor.process(inbound);
          ws.send(JSON.stringify({
            type: 'message',
            content: response.content,
          }));
        }
      });
    });
  }
}
```

**Acceptance criteria:**
- [ ] WebSocket messages processed
- [ ] Echo response sent back
- [ ] Conversation visible in database
- [ ] Messages stored correctly

---

### 0.4.0-alpha.5: API Endpoints for Conversations

**Add routes:**

```
src/gateway/routes/
├── conversations.ts          # Conversation endpoints
└── messages.ts               # Message endpoints (nested)
```

**Conversation endpoints:**

```typescript
// GET /api/v1/conversations
// GET /api/v1/conversations/:id
// GET /api/v1/conversations/:id/messages
// POST /api/v1/conversations/:id/messages (staff reply)
```

**Acceptance criteria:**
- [ ] List conversations endpoint works
- [ ] Get conversation by ID works
- [ ] Get messages for conversation works
- [ ] Staff can send messages via API

---

## Testing Checkpoint

### Manual Tests

```bash
# Test 1: WebSocket echo
wscat -c ws://localhost:3000/ws
> {"type":"message","content":"Hello"}
< {"type":"message","content":"Echo: Hello"}

# Test 2: Check conversation created
curl http://localhost:3000/api/v1/conversations \
  -H "Authorization: Bearer <token>"
# Expected: List with new conversation

# Test 3: Check messages
curl http://localhost:3000/api/v1/conversations/<id>/messages \
  -H "Authorization: Bearer <token>"
# Expected: Inbound and outbound messages
```

### Stakeholder Demo

**Demo script:**
1. Open WebSocket client (wscat or browser console)
2. Send a message: "Hello, I need extra towels"
3. Receive echo response
4. Show conversation in database (Drizzle Studio)
5. Show messages stored

**Key message:** "The pipeline works end-to-end. Next we add AI."

---

## Exit Criteria

Phase 3 is complete when:

1. **Messages flow through pipeline** from receipt to response
2. **Conversations are tracked** in database
3. **Echo bot responds** to all messages
4. **WebChat channel works** for testing
5. **API endpoints** list conversations and messages

---

## Next Phase

After Phase 3, proceed to [Phase 4: Intelligence](phase-4-intelligence.md) to replace echo with AI.

---

## Checklist for Claude Code

```markdown
## Phase 3 Implementation Checklist

### 0.4.0-alpha.1: Types and Events
- [ ] Create src/types/message.ts
- [ ] Create src/types/conversation.ts
- [ ] Create src/events/index.ts
- [ ] Define event types
- [ ] Verify: Events emit and receive

### 0.4.0-alpha.2: Conversation Service
- [ ] Create src/services/conversation.ts
- [ ] Create src/services/message.ts
- [ ] Implement findOrCreate
- [ ] Implement addMessage
- [ ] Verify: Conversations persist

### 0.4.0-alpha.3: Message Processor
- [ ] Create src/pipeline/index.ts
- [ ] Create src/pipeline/processor.ts
- [ ] Create src/pipeline/responder.ts (echo)
- [ ] Wire up processor
- [ ] Verify: Messages flow through

### 0.4.0-alpha.4: WebChat Channel
- [ ] Create src/channels/webchat/index.ts
- [ ] Handle WebSocket messages
- [ ] Process through pipeline
- [ ] Send response back
- [ ] Verify: Echo works via WebSocket

### 0.4.0-alpha.5: API Endpoints
- [ ] Create GET /api/v1/conversations
- [ ] Create GET /api/v1/conversations/:id
- [ ] Create GET /api/v1/conversations/:id/messages
- [ ] Create POST /api/v1/conversations/:id/messages
- [ ] Verify: All endpoints work

### Phase 3 Complete
- [ ] All checks above pass
- [ ] Stakeholder demo successful
- [ ] Commit: "Phase 3: Pipeline complete"
- [ ] Tag: v0.4.0
```
