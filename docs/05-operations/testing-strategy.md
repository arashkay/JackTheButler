# Testing Strategy

Testing approach and guidelines for Jack The Butler.

---

## Overview

Jack uses a **testing pyramid** approach:

```
         ┌─────────┐
         │   E2E   │  Few, critical paths
         ├─────────┤
         │  Integ  │  Key integrations
         ├─────────┤
         │  Unit   │  Many, fast, isolated
         └─────────┘
```

| Type | Tool | Coverage Target | Speed |
|------|------|-----------------|-------|
| Unit | Vitest | 70% | Fast |
| Integration | Vitest + in-memory SQLite | Key flows | Fast |
| E2E | Playwright | Critical paths | Slow |
| API | Supertest | All endpoints | Fast |

---

## Testing Tools

### Vitest

Primary test runner for unit and integration tests.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      },
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/types/**'
      ]
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts'],
    exclude: ['**/e2e/**']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
```

### Test Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { migrate } from '@/db/migrate';

// Create in-memory database for tests
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  migrate(db);
  return db;
}

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks();
});
```

---

## Unit Tests

Test individual functions and classes in isolation.

### Location

Mirror the `src/` structure in `tests/unit/`:

```
src/services/guest.ts       → tests/unit/services/guest.test.ts
src/ai/intent/classifier.ts → tests/unit/ai/intent/classifier.test.ts
```

### Guidelines

1. **Test one thing** - Each test should verify one behavior
2. **Use descriptive names** - `should return cached guest when cache hit`
3. **Arrange-Act-Assert** - Clear structure
4. **Mock dependencies** - Isolate the unit under test
5. **Test edge cases** - Null, empty, error conditions

### Example: Service Test

```typescript
// tests/unit/services/guest.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { GuestService } from '@/services/guest';
import { createTestDb } from '@tests/setup';

describe('GuestService', () => {
  let service: GuestService;
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    service = new GuestService(db);
  });

  describe('findById', () => {
    it('should find guest by id', async () => {
      // Arrange
      db.prepare('INSERT INTO guests (id, first_name, last_name) VALUES (?, ?, ?)')
        .run('123', 'Sarah', 'Chen');

      // Act
      const result = await service.findById('123');

      // Assert
      expect(result).toEqual({
        id: '123',
        firstName: 'Sarah',
        lastName: 'Chen'
      });
    });

    it('should return null when guest not found', async () => {
      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences', async () => {
      db.prepare('INSERT INTO guests (id, first_name, last_name) VALUES (?, ?, ?)')
        .run('123', 'Sarah', 'Chen');

      await service.updatePreferences('123', [
        { category: 'room', key: 'floor', value: 'high', source: 'stated' }
      ]);

      const prefs = db.prepare('SELECT * FROM preferences WHERE guest_id = ?').all('123');
      expect(prefs).toHaveLength(1);
      expect(prefs[0].key).toBe('floor');
    });
  });
});
```

### Example: AI Test

```typescript
// tests/unit/ai/intent/classifier.test.ts
import { describe, it, expect, vi } from 'vitest';
import { IntentClassifier } from '@/ai/intent/classifier';
import { createMockLLMProvider } from '@tests/helpers';

describe('IntentClassifier', () => {
  describe('classify', () => {
    it('should classify towel request correctly', async () => {
      const mockProvider = createMockLLMProvider({
        response: {
          intent: 'request.service.towels',
          confidence: 0.95,
          entities: [{ type: 'quantity', value: 2 }]
        }
      });
      const classifier = new IntentClassifier(mockProvider);

      const result = await classifier.classify('Can I get 2 extra towels?');

      expect(result.intent).toBe('request.service.towels');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should extract entities from message', async () => {
      const mockProvider = createMockLLMProvider({
        response: {
          intent: 'request.dining.room_service',
          confidence: 0.92,
          entities: [
            { type: 'item', value: 'club sandwich' },
            { type: 'room', value: '412' }
          ]
        }
      });
      const classifier = new IntentClassifier(mockProvider);

      const result = await classifier.classify(
        'Can I order a club sandwich to room 412?'
      );

      expect(result.entities).toHaveLength(2);
      expect(result.entities).toContainEqual({ type: 'item', value: 'club sandwich' });
    });
  });
});
```

---

## Integration Tests

Test interactions between components with real SQLite database.

### Location

`tests/integration/`

### Using In-Memory SQLite

No need for Testcontainers or external databases. SQLite in-memory mode is fast and isolated.

```typescript
// tests/integration/setup.ts
import Database from 'better-sqlite3';
import { migrate } from '@/db/migrate';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

export function seedTestData(db: Database.Database) {
  db.exec(`
    INSERT INTO guests (id, first_name, last_name, phone, email)
    VALUES
      ('guest-1', 'Sarah', 'Chen', '+15551234567', 'sarah@example.com'),
      ('guest-2', 'Michael', 'Torres', '+15559876543', 'michael@example.com');

    INSERT INTO conversations (id, guest_id, channel, status)
    VALUES
      ('conv-1', 'guest-1', 'whatsapp', 'active');
  `);
}
```

### Example: Channel Integration Test

```typescript
// tests/integration/channels/whatsapp.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WhatsAppAdapter } from '@/channels/whatsapp/adapter';
import { mockWhatsAppAPI } from '@tests/helpers';

describe('WhatsApp Adapter Integration', () => {
  let adapter: WhatsAppAdapter;
  let whatsappMock: ReturnType<typeof mockWhatsAppAPI>;

  beforeAll(async () => {
    whatsappMock = mockWhatsAppAPI();
    adapter = new WhatsAppAdapter({
      phoneNumberId: 'test-phone-id',
      accessToken: 'test-token'
    });
  });

  afterAll(() => {
    whatsappMock.close();
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      whatsappMock.onSendMessage().reply(200, {
        messages: [{ id: 'wamid.xxx' }]
      });

      const result = await adapter.send({
        to: '+15551234567',
        content: 'Hello from Jack!'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.xxx');
    });

    it('should handle rate limiting', async () => {
      whatsappMock.onSendMessage().reply(429, {
        error: { code: 130429, message: 'Rate limited' }
      });

      const result = await adapter.send({
        to: '+15551234567',
        content: 'Hello!'
      });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RATE_LIMITED');
    });
  });
});
```

### Example: Database Integration Test

```typescript
// tests/integration/db/guest-repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { GuestRepository } from '@/db/repositories/guest';
import { createTestDb, seedTestData } from '@tests/integration/setup';

describe('GuestRepository Integration', () => {
  let repository: GuestRepository;
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
    repository = new GuestRepository(db);
  });

  describe('findByPhone', () => {
    it('should find guest by phone number', async () => {
      const guest = await repository.findByPhone('+15551234567');

      expect(guest).toBeDefined();
      expect(guest?.firstName).toBe('Sarah');
    });

    it('should return null for unknown phone', async () => {
      const guest = await repository.findByPhone('+19999999999');

      expect(guest).toBeNull();
    });
  });

  describe('findWithActiveConversation', () => {
    it('should return guest with conversation', async () => {
      const result = await repository.findWithActiveConversation('guest-1');

      expect(result.guest.firstName).toBe('Sarah');
      expect(result.conversation).toBeDefined();
      expect(result.conversation.channel).toBe('whatsapp');
    });
  });
});
```

---

## E2E Tests

Test complete user flows through the system.

### Location

`tests/e2e/`

### Using Playwright

```typescript
// tests/e2e/guest-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Guest Conversation Flow', () => {
  test('guest can request extra towels via API', async ({ request }) => {
    // Simulate WhatsApp webhook
    const webhookResponse = await request.post('/webhooks/whatsapp', {
      data: {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                from: '15551234567',
                text: { body: 'Can I get extra towels please?' },
                type: 'text'
              }]
            }
          }]
        }]
      }
    });

    expect(webhookResponse.status()).toBe(200);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify task was created
    const tasksResponse = await request.get('/api/v1/tasks?type=housekeeping', {
      headers: { Authorization: `Bearer ${testToken}` }
    });

    const tasks = await tasksResponse.json();
    expect(tasks.tasks).toHaveLength(1);
    expect(tasks.tasks[0].description).toContain('towels');
  });
});

test.describe('Staff Dashboard Flow', () => {
  test('staff can view and respond to escalated conversation', async ({ page }) => {
    await page.goto('/dashboard');

    // Login
    await page.fill('[name=email]', 'staff@hotel.com');
    await page.fill('[name=password]', 'testpassword');
    await page.click('button[type=submit]');

    // Navigate to conversations
    await page.click('text=Conversations');

    // Click on escalated conversation
    await page.click('.conversation-item.escalated');

    // Verify conversation details loaded
    await expect(page.locator('.guest-name')).toContainText('Sarah Chen');

    // Send response
    await page.fill('[name=message]', 'I apologize for the inconvenience...');
    await page.click('button:has-text("Send")');

    // Verify message sent
    await expect(page.locator('.message-sent')).toBeVisible();
  });
});
```

---

## API Tests

Test HTTP endpoints directly.

```typescript
// tests/api/conversations.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '@/gateway/server';
import { generateTestToken } from '@tests/helpers';

describe('Conversations API', () => {
  let app: ReturnType<typeof createApp>;
  let authToken: string;

  beforeAll(async () => {
    app = createApp();
    authToken = await generateTestToken({ role: 'front_desk' });
  });

  describe('GET /api/v1/conversations', () => {
    it('should return active conversations', async () => {
      const response = await supertest(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'active' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('conversations');
      expect(Array.isArray(response.body.conversations)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await supertest(app)
        .get('/api/v1/conversations');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/conversations/:id/messages', () => {
    it('should send message to conversation', async () => {
      const response = await supertest(app)
        .post('/api/v1/conversations/conv-123/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello from staff!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });
});
```

---

## Test Helpers

### Mock Factories

```typescript
// tests/helpers/mocks.ts
import { vi } from 'vitest';

export function createMockLLMProvider(options: { response: unknown }) {
  return {
    complete: vi.fn().mockResolvedValue(options.response),
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
  };
}

export function createMockChannelAdapter() {
  return {
    channel: 'mock',
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-123' }),
    parseIncoming: vi.fn()
  };
}

export function mockWhatsAppAPI() {
  // Use nock or msw to mock HTTP requests
  const handlers: any[] = [];

  return {
    onSendMessage: () => ({
      reply: (status: number, body: unknown) => {
        // Mock implementation
      }
    }),
    close: () => {
      // Cleanup
    }
  };
}
```

### Fixtures

```typescript
// tests/fixtures/guests.ts
export const testGuests = {
  sarah: {
    id: 'guest-sarah',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah@example.com',
    phone: '+15551234567',
    loyaltyTier: 'gold'
  },
  michael: {
    id: 'guest-michael',
    firstName: 'Michael',
    lastName: 'Torres',
    email: 'michael@example.com',
    phone: '+15559876543'
  }
};

// tests/fixtures/conversations.ts
export const testConversations = {
  activeWithSarah: {
    id: 'conv-sarah-1',
    guestId: 'guest-sarah',
    channel: 'whatsapp',
    status: 'active',
    messages: [
      { role: 'guest', content: 'Hi, can I get extra towels?' }
    ]
  }
};
```

---

## Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Services | 80% |
| AI Engine | 70% |
| Channels | 70% |
| Integrations | 60% |
| Utils | 70% |
| **Overall** | **70%** |

### Running Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install

      - run: pnpm lint

      - run: pnpm typecheck

      - run: pnpm test:coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

Note: No external database services needed in CI. SQLite in-memory tests are fast and self-contained.

---

## Related

- [Local Development](local-development.md) - Development setup
- [Tech Stack](../03-architecture/tech-stack.md) - Technology choices
- [CLAUDE.md](../../CLAUDE.md) - Project context
