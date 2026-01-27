# CLAUDE.md - Jack The Butler

> Project context for Claude Code

## Project Overview

**Jack The Butler** (Joint AI Control Kernel) is a self-hosted AI-powered hospitality assistant for hotels. It handles guest communication across multiple channels (WhatsApp, SMS, email, web chat), integrates with hotel systems (PMS, POS), and routes complex requests to staff.

**Deployment Model:** Self-hosted on hotel infrastructure (like Clawdbot)
**Domain:** JackTheButler.com

## Tech Stack

- **Runtime:** Node.js ≥22
- **Language:** TypeScript (strict mode)
- **Execution:** tsx for development, compiled for production
- **Package Manager:** pnpm
- **Web Framework:** Hono
- **Database:** SQLite (single file, zero config)
- **Vector Search:** sqlite-vec (embeddings)
- **Cache:** In-memory LRU
- **AI:** Anthropic Claude API (primary), OpenAI (fallback), Ollama (local)
- **Testing:** Vitest (70% coverage target)
- **Linting:** oxlint + Prettier

## Project Structure

```
jack/
├── src/
│   ├── gateway/          # Central WebSocket/HTTP server
│   ├── channels/         # Channel adapters (whatsapp, sms, email, webchat)
│   ├── ai/               # AI engine, intent classification, RAG
│   ├── integrations/     # Hotel system adapters (PMS, housekeeping)
│   ├── services/         # Business logic services
│   ├── db/               # Database schema, migrations, repositories
│   ├── config/           # Configuration loading
│   ├── utils/            # Shared utilities
│   └── types/            # TypeScript type definitions
├── apps/
│   ├── dashboard/        # Staff web dashboard (React)
│   └── widget/           # Guest web chat widget
├── data/                 # SQLite database & uploads (gitignored)
│   └── jack.db           # Main database file
├── docs/                 # Documentation
├── tests/                # Test files mirroring src/
└── config/               # Environment configs
```

## Key Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm dev                  # Start development server (with hot reload)
pnpm dev:gateway          # Start only API server
pnpm dev:dashboard        # Start only dashboard

# Database
pnpm db:migrate           # Run migrations
pnpm db:migrate:create    # Create new migration
pnpm db:seed              # Seed development data
pnpm db:reset             # Reset database (dev only)
pnpm db:studio            # Open Drizzle Studio

# Testing
pnpm test                 # Run all tests
pnpm test:watch           # Run in watch mode
pnpm test:coverage        # Run with coverage report
pnpm test:e2e             # Run end-to-end tests

# Build & Deploy
pnpm build                # Build for production
pnpm start                # Start production server
pnpm docker:build         # Build Docker image
pnpm docker:run           # Run Docker container

# Linting
pnpm lint                 # Run oxlint
pnpm lint:fix             # Fix auto-fixable issues
pnpm format               # Run Prettier
pnpm typecheck            # TypeScript type checking
pnpm check                # Run all checks (lint + types + tests)
```

## Architecture Principles

1. **Self-hosted** - Runs on hotel's own infrastructure
2. **Single container** - No external database services required
3. **Local-first** - Data stays on hotel's server
4. **Channel-agnostic** - Core logic independent of messaging platform
5. **AI provider abstraction** - Support Claude, OpenAI, or local Ollama
6. **Simple operations** - SQLite database, easy backup (copy file)

## Code Conventions

### File Naming
- `kebab-case` for files: `guest-memory.ts`, `whatsapp-adapter.ts`
- `PascalCase` for classes: `GatewayService`, `WhatsAppAdapter`
- `camelCase` for functions/variables: `processMessage`, `guestProfile`

### Imports
```typescript
// External packages first
import { Hono } from 'hono';
import Database from 'better-sqlite3';

// Internal absolute imports
import { GuestService } from '@/services/guest';
import { logger } from '@/utils/logger';

// Relative imports last
import { handleMessage } from './handlers';
```

### Error Handling
```typescript
// Use custom error classes
import { AppError, NotFoundError, ValidationError } from '@/errors';

// Always include context
throw new NotFoundError('Guest not found', { guestId });
```

### Logging
```typescript
import { logger } from '@/utils/logger';

logger.info('Processing message', { conversationId, channel });
logger.error('Failed to send message', { error, messageId });
```

## Environment Variables

Required in `.env`:
```bash
# Core
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/jack.db

# Security
JWT_SECRET=your-secret-min-32-chars
ENCRYPTION_KEY=your-key-32-bytes

# AI (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# OLLAMA_BASE_URL=http://localhost:11434

# Channels (as needed)
WHATSAPP_ACCESS_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

## Common Patterns

### Service Pattern
```typescript
// src/services/guest.ts
export class GuestService {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Guest | null> {
    return this.db
      .prepare('SELECT * FROM guests WHERE id = ?')
      .get(id) as Guest | null;
  }
}
```

### Channel Adapter Pattern
```typescript
// src/channels/base-adapter.ts
export interface ChannelAdapter {
  readonly channel: ChannelType;
  send(message: OutgoingMessage): Promise<SendResult>;
  parseIncoming(raw: unknown): Promise<IncomingMessage>;
}

// src/channels/whatsapp/adapter.ts
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channel = 'whatsapp';
  // ... implementation
}
```

### Repository Pattern
```typescript
// src/db/repositories/conversation.ts
export class ConversationRepository {
  constructor(private db: Database) {}

  async findActive(guestId: string): Promise<Conversation | null> {
    return this.db
      .prepare('SELECT * FROM conversations WHERE guest_id = ? AND status = ?')
      .get(guestId, 'active') as Conversation | null;
  }
}
```

## Database (SQLite)

```typescript
// src/db/index.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database(process.env.DATABASE_PATH || './data/jack.db');
export const db = drizzle(sqlite);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');
```

## Testing Approach

```typescript
// tests/services/guest.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { GuestService } from '@/services/guest';

describe('GuestService', () => {
  let service: GuestService;
  let db: Database;

  beforeEach(() => {
    // In-memory SQLite for tests
    db = new Database(':memory:');
    // Run migrations
    migrate(db);
    service = new GuestService(db);
  });

  it('should find guest by id', async () => {
    db.prepare('INSERT INTO guests (id, name) VALUES (?, ?)').run('123', 'Test');

    const guest = await service.findById('123');

    expect(guest).toEqual({ id: '123', name: 'Test' });
  });
});
```

## Key Documentation

- [Vision & Goals](docs/01-vision/overview.md)
- [Use Cases](docs/02-use-cases/index.md)
- [Architecture](docs/03-architecture/index.md)
- [Tech Stack](docs/03-architecture/tech-stack.md)
- [API Specs](docs/04-specs/api/openapi.yaml)
- [Local Development](docs/05-operations/local-development.md)
- [Deployment](docs/05-operations/deployment.md)

## When Implementing

1. **Read relevant use case first** - Understand the user story
2. **Check existing patterns** - Follow established conventions
3. **Write tests** - Aim for 70%+ coverage
4. **Keep it simple** - SQLite is enough, no microservices
5. **Small commits** - One logical change per commit
