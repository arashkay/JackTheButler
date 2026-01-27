# Project Structure

Source code organization for Jack The Butler.

---

## Overview

Jack follows a **modular monorepo** structure inspired by [Clawdbot](https://github.com/clawdbot/clawdbot), with clear separation between:
- Core services (`src/`)
- Client applications (`apps/`)
- Shared packages (`packages/`)

---

## Directory Structure

```
jack/
├── .github/                    # GitHub Actions, templates
│   ├── workflows/
│   │   ├── ci.yml              # CI pipeline
│   │   ├── deploy.yml          # Deployment workflow
│   │   └── test.yml            # Test workflow
│   └── ISSUE_TEMPLATE/
│
├── apps/                       # Client applications
│   ├── dashboard/              # Staff web dashboard
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── mobile/                 # Staff mobile app
│   │   ├── src/
│   │   ├── ios/
│   │   ├── android/
│   │   └── package.json
│   │
│   └── widget/                 # Guest web chat widget
│       ├── src/
│       ├── dist/
│       └── package.json
│
├── config/                     # Configuration files
│   ├── default.yaml            # Default configuration
│   ├── development.yaml        # Development overrides
│   ├── production.yaml         # Production overrides
│   └── test.yaml               # Test configuration
│
├── docker/                     # Docker configurations
│   ├── Dockerfile              # Main application
│   ├── Dockerfile.dev          # Development image
│   ├── docker-compose.yml      # Full stack
│   └── docker-compose.dev.yml  # Development stack
│
├── docs/                       # Documentation
│   ├── 01-vision/
│   ├── 02-use-cases/
│   ├── 03-architecture/
│   ├── 04-specs/
│   ├── 05-operations/
│   └── README.md
│
├── packages/                   # Shared packages
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── src/
│   │   └── package.json
│   │
│   └── ui/                     # Shared UI components
│       ├── src/
│       └── package.json
│
├── scripts/                    # Utility scripts
│   ├── build.ts                # Build script
│   ├── deploy.ts               # Deployment script
│   ├── seed.ts                 # Database seeding
│   └── migrate.ts              # Migration runner
│
├── src/                        # Main source code
│   ├── index.ts                # Application entry point
│   │
│   ├── gateway/                # Gateway service
│   │   ├── index.ts
│   │   ├── server.ts           # HTTP/WebSocket server
│   │   ├── router.ts           # Route definitions
│   │   ├── middleware/         # Express/Hono middleware
│   │   ├── handlers/           # Request handlers
│   │   └── websocket/          # WebSocket handlers
│   │
│   ├── channels/               # Channel adapters
│   │   ├── index.ts
│   │   ├── base-adapter.ts     # Base adapter interface
│   │   ├── manager.ts          # Channel manager
│   │   ├── whatsapp/
│   │   │   ├── index.ts
│   │   │   ├── adapter.ts
│   │   │   ├── webhook.ts
│   │   │   └── templates.ts
│   │   ├── sms/
│   │   │   ├── index.ts
│   │   │   ├── adapter.ts
│   │   │   └── webhook.ts
│   │   ├── email/
│   │   │   ├── index.ts
│   │   │   ├── adapter.ts
│   │   │   └── imap-listener.ts
│   │   └── webchat/
│   │       ├── index.ts
│   │       ├── adapter.ts
│   │       └── widget-api.ts
│   │
│   ├── ai/                     # AI engine
│   │   ├── index.ts
│   │   ├── engine.ts           # Main AI engine
│   │   ├── providers/          # LLM provider adapters
│   │   │   ├── base.ts
│   │   │   ├── claude.ts
│   │   │   ├── openai.ts
│   │   │   └── index.ts
│   │   ├── intent/             # Intent classification
│   │   │   ├── classifier.ts
│   │   │   └── intents.ts
│   │   ├── skills/             # Executable skills
│   │   │   ├── base.ts
│   │   │   ├── service-request.ts
│   │   │   ├── room-service.ts
│   │   │   └── concierge.ts
│   │   ├── memory/             # Conversation memory
│   │   │   ├── manager.ts
│   │   │   └── context-builder.ts
│   │   └── rag/                # Retrieval augmented generation
│   │       ├── retriever.ts
│   │       └── embeddings.ts
│   │
│   ├── integrations/           # Hotel system integrations
│   │   ├── index.ts
│   │   ├── manager.ts          # Integration manager
│   │   ├── sync-engine.ts      # Data synchronization
│   │   ├── pms/                # Property Management Systems
│   │   │   ├── base.ts
│   │   │   ├── opera.ts
│   │   │   ├── mews.ts
│   │   │   └── cloudbeds.ts
│   │   ├── housekeeping/
│   │   │   ├── base.ts
│   │   │   └── optii.ts
│   │   └── pos/
│   │       ├── base.ts
│   │       └── micros.ts
│   │
│   ├── services/               # Business logic services
│   │   ├── conversation.ts     # Conversation management
│   │   ├── guest.ts            # Guest profile service
│   │   ├── task.ts             # Task management
│   │   ├── routing.ts          # Message/task routing
│   │   ├── notification.ts     # Staff notifications
│   │   └── automation.ts       # Scheduled automations
│   │
│   ├── db/                     # Database layer
│   │   ├── index.ts            # Database client
│   │   ├── schema.ts           # Drizzle/Prisma schema
│   │   ├── migrations/         # Database migrations
│   │   │   ├── 001_initial.ts
│   │   │   └── ...
│   │   └── repositories/       # Data access
│   │       ├── guest.ts
│   │       ├── conversation.ts
│   │       ├── task.ts
│   │       └── ...
│   │
│   ├── queue/                  # Job queue
│   │   ├── index.ts
│   │   ├── workers/            # Queue workers
│   │   │   ├── message-worker.ts
│   │   │   ├── sync-worker.ts
│   │   │   └── notification-worker.ts
│   │   └── jobs/               # Job definitions
│   │
│   ├── config/                 # Configuration
│   │   ├── index.ts            # Config loader
│   │   ├── schema.ts           # Config validation
│   │   └── defaults.ts         # Default values
│   │
│   ├── errors/                 # Custom errors
│   │   ├── index.ts
│   │   ├── base.ts
│   │   ├── validation.ts
│   │   └── http.ts
│   │
│   ├── utils/                  # Utilities
│   │   ├── logger.ts           # Logging
│   │   ├── metrics.ts          # Metrics collection
│   │   ├── crypto.ts           # Encryption helpers
│   │   └── phone.ts            # Phone number utilities
│   │
│   └── types/                  # TypeScript types
│       ├── index.ts
│       ├── guest.ts
│       ├── conversation.ts
│       ├── channel.ts
│       └── ...
│
├── tests/                      # Test files
│   ├── setup.ts                # Test setup
│   ├── helpers/                # Test helpers
│   ├── fixtures/               # Test fixtures
│   ├── unit/                   # Unit tests (mirrors src/)
│   │   ├── services/
│   │   ├── ai/
│   │   └── ...
│   ├── integration/            # Integration tests
│   │   ├── channels/
│   │   └── integrations/
│   └── e2e/                    # End-to-end tests
│       ├── guest-flow.test.ts
│       └── staff-flow.test.ts
│
├── .env.example                # Environment template
├── .gitignore
├── .prettierrc
├── CLAUDE.md                   # Claude Code context
├── CHANGELOG.md
├── LICENSE
├── README.md
├── package.json
├── pnpm-workspace.yaml         # pnpm workspace config
├── tsconfig.json               # TypeScript config
├── tsconfig.build.json         # Build TypeScript config
└── vitest.config.ts            # Vitest configuration
```

---

## Module Descriptions

### `src/gateway/`
Central HTTP/WebSocket server. Entry point for all external requests.

| File | Purpose |
|------|---------|
| `server.ts` | Hono app setup, middleware registration |
| `router.ts` | API route definitions |
| `middleware/auth.ts` | JWT authentication |
| `middleware/rate-limit.ts` | Rate limiting |
| `handlers/conversations.ts` | Conversation API handlers |
| `websocket/connection.ts` | WebSocket connection management |

### `src/channels/`
Adapters for external messaging platforms.

| Module | Platform | Library |
|--------|----------|---------|
| `whatsapp/` | WhatsApp Business | Meta Cloud API |
| `sms/` | SMS/MMS | Twilio |
| `email/` | Email | Nodemailer + IMAP |
| `webchat/` | Web Chat | WebSocket |

### `src/ai/`
AI engine for message understanding and response generation.

| Module | Purpose |
|--------|---------|
| `providers/` | LLM provider abstractions |
| `intent/` | Intent classification |
| `skills/` | Executable actions |
| `memory/` | Conversation context |
| `rag/` | Knowledge retrieval |

### `src/integrations/`
Adapters for hotel operational systems.

| Module | Systems |
|--------|---------|
| `pms/` | Opera, Mews, Cloudbeds |
| `housekeeping/` | Optii, Flexkeeping |
| `pos/` | Micros, Toast |

### `src/services/`
Core business logic, independent of transport.

| Service | Responsibility |
|---------|----------------|
| `conversation.ts` | Manage conversation lifecycle |
| `guest.ts` | Guest profiles and preferences |
| `task.ts` | Task creation and tracking |
| `routing.ts` | Route messages to AI or staff |
| `notification.ts` | Send staff notifications |
| `automation.ts` | Scheduled messaging |

### `src/db/`
Database access layer.

| Component | Purpose |
|-----------|---------|
| `schema.ts` | Table definitions |
| `migrations/` | Schema migrations |
| `repositories/` | Data access patterns |

---

## Import Aliases

Configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@packages/*": ["packages/*"],
      "@tests/*": ["tests/*"]
    }
  }
}
```

Usage:
```typescript
import { GuestService } from '@/services/guest';
import { Guest } from '@/types';
import { logger } from '@/utils/logger';
```

---

## Workspace Configuration

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## Related

- [Tech Stack](tech-stack.md) - Technology choices
- [Local Development](../05-operations/local-development.md) - Setup guide
- [CLAUDE.md](../../CLAUDE.md) - Project context
