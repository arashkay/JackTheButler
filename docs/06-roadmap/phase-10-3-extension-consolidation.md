# Phase 10.3: Extension Consolidation

**Version:** 1.1.0-alpha.3
**Codename:** Unified Extensions
**Focus:** Consolidate all integrations into `src/extensions/` with manifests
**Depends on:** Phase 10.1 (Core Structure)

---

## Goal

Move all integration code (AI providers, channels, PMS) into self-contained extension folders with manifests. Delete the monolithic `registry.ts`. After this phase, adding a new integration only requires creating a new folder.

---

## What You Can Test

After completing this phase, verify the following:

### 1. All Channels Still Work
```bash
# WhatsApp
curl -X POST http://localhost:3000/webhooks/whatsapp -d '{"test": true}'

# SMS
curl -X POST http://localhost:3000/webhooks/sms -d '{"test": true}'
```

### 2. AI Provider Test
```bash
curl http://localhost:3000/api/v1/integrations/ai/test
# Expected: { "provider": "anthropic", "status": "connected" }
```

### 3. Dashboard Integration Page
Open Dashboard → Settings → Integrations:
- All configured integrations show "Connected" status
- Can toggle integrations on/off
- Configuration forms work for each provider

### 4. Extension Discovery
```bash
# In development, check logs for:
# "Loaded extensions: whatsapp, sms, email, webchat, anthropic, openai, ollama, mews, cloudbeds"
```

---

## Tasks

### Create Extensions Directory Structure

- [ ] Create `src/extensions/` directory
- [ ] Create `src/extensions/_shared/` for shared utilities
- [ ] Create `src/extensions/manager.ts` for extension loading

### Migrate AI Providers

Each AI provider becomes a self-contained folder:

- [ ] `src/extensions/ai/anthropic/`
  - [ ] `provider.ts` - AnthropicProvider class
  - [ ] `manifest.ts` - Configuration schema
  - [ ] `anthropic.test.ts` - Co-located tests

- [ ] `src/extensions/ai/openai/`
  - [ ] `provider.ts`
  - [ ] `manifest.ts`
  - [ ] `openai.test.ts`

- [ ] `src/extensions/ai/ollama/`
  - [ ] `provider.ts`
  - [ ] `manifest.ts`
  - [ ] `ollama.test.ts`

- [ ] `src/extensions/ai/types.ts` - Shared AI types

### Migrate Channel Adapters

Each channel becomes a self-contained folder:

- [ ] `src/extensions/channels/whatsapp/`
  - [ ] `adapter.ts` - WhatsAppAdapter class
  - [ ] `webhook.ts` - Hono routes for `/webhooks/whatsapp`
  - [ ] `manifest.ts` - Configuration schema
  - [ ] `whatsapp.test.ts`

- [ ] `src/extensions/channels/sms/`
  - [ ] `adapter.ts`
  - [ ] `webhook.ts`
  - [ ] `manifest.ts`
  - [ ] `sms.test.ts`

- [ ] `src/extensions/channels/email/`
  - [ ] `adapter.ts`
  - [ ] `manifest.ts`
  - [ ] `email.test.ts`

- [ ] `src/extensions/channels/webchat/`
  - [ ] `adapter.ts`
  - [ ] `manifest.ts`
  - [ ] `webchat.test.ts`

- [ ] `src/extensions/channels/types.ts` - Shared channel types

### Migrate PMS Adapters

- [ ] `src/extensions/pms/mock/`
  - [ ] `adapter.ts`
  - [ ] `manifest.ts`

- [ ] `src/extensions/pms/mews/`
  - [ ] `adapter.ts`
  - [ ] `manifest.ts`
  - [ ] `mews.test.ts`

- [ ] `src/extensions/pms/cloudbeds/`
  - [ ] `adapter.ts`
  - [ ] `manifest.ts`
  - [ ] `cloudbeds.test.ts`

- [ ] `src/extensions/pms/types.ts` - Shared PMS types

### Create Extension Manager

- [ ] Create `src/extensions/manager.ts`:
  ```typescript
  export class ExtensionManager {
    async loadAll(): Promise<void>;
    getChannel(id: string): ChannelAdapter;
    getAI(id: string): AIProvider;
    getPMS(id: string): PMSAdapter;
    listChannels(): ChannelManifest[];
    listAI(): AIManifest[];
    listPMS(): PMSManifest[];
  }
  ```

- [ ] Implement dynamic manifest loading using `import.meta.glob`
- [ ] Register webhook routes automatically from channel manifests

### Create Manifest Standard

- [ ] Define manifest interface in `src/extensions/_shared/types.ts`:
  ```typescript
  interface ExtensionManifest {
    id: string;
    name: string;
    category: 'ai' | 'channel' | 'pms';
    version: string;
    configSchema: ConfigField[];
    createInstance: (config: Record<string, unknown>) => ExtensionInstance;
    getRoutes?: () => Hono;
  }
  ```

### Delete Old Structure

After migration is complete and tested:

- [ ] Delete `src/integrations/core/registry.ts`
- [ ] Delete `src/integrations/channels/`
- [ ] Delete `src/integrations/ai/providers/`
- [ ] Delete `src/channels/` (merged into extensions)

### Update Gateway

- [ ] Update `src/gateway/index.ts` to use ExtensionManager
- [ ] Register webhook routes from extension manifests
- [ ] Update integration status endpoint

### Update Dashboard API

- [ ] Update `GET /api/v1/integrations` to use ExtensionManager
- [ ] Update `POST /api/v1/integrations/:id/configure`
- [ ] Update `POST /api/v1/integrations/:id/test`

---

## Dashboard UI Updates

### Integrations Settings Page

| Change | Description |
|--------|-------------|
| Extension cards | Show manifest info (name, version, description) |
| Dynamic forms | Generate config form from manifest.configSchema |
| Status indicator | Real-time connection status per extension |
| Enable/disable toggle | Per-extension enable state |

### New Features

- [ ] "Available Extensions" section showing unconfigured extensions
- [ ] Extension detail modal with full manifest info
- [ ] Configuration history (last changed, changed by)

---

## Acceptance Criteria

### Technical Criteria

- [ ] `src/extensions/` contains all integration code
- [ ] Each extension folder has: `adapter.ts`/`provider.ts`, `manifest.ts`, tests
- [ ] ExtensionManager loads all extensions dynamically
- [ ] Old `src/integrations/core/registry.ts` deleted
- [ ] Old `src/channels/` deleted
- [ ] All 142+ tests pass
- [ ] No TypeScript errors

### User-Facing Criteria

| Test | Expected Result |
|------|-----------------|
| Send WhatsApp message | Works as before |
| Send SMS message | Works as before |
| Dashboard → Integrations | Shows all extensions with status |
| Configure new AI provider | Form generated from manifest |
| Test connection button | Shows success/failure |
| Disable extension | Extension stops receiving requests |

---

## Extension Manifest Example

```typescript
// src/extensions/channels/whatsapp/manifest.ts
import type { ChannelManifest } from '../types.js';
import { WhatsAppAdapter } from './adapter.js';
import { whatsappRoutes } from './webhook.js';

export const manifest: ChannelManifest = {
  id: 'whatsapp',
  name: 'WhatsApp Business',
  category: 'channel',
  version: '1.0.0',
  description: 'Connect to WhatsApp Business API via Meta',

  configSchema: [
    {
      key: 'accessToken',
      label: 'Access Token',
      type: 'password',
      required: true,
      helpText: 'From Meta Business Suite'
    },
    {
      key: 'phoneNumberId',
      label: 'Phone Number ID',
      type: 'text',
      required: true
    },
    {
      key: 'verifyToken',
      label: 'Webhook Verify Token',
      type: 'text',
      required: true,
      helpText: 'Custom token for webhook verification'
    },
    {
      key: 'appSecret',
      label: 'App Secret',
      type: 'password',
      required: false,
      helpText: 'For signature verification (recommended)'
    },
  ],

  createAdapter: (config) => new WhatsAppAdapter(config),
  getRoutes: () => whatsappRoutes,
};
```

---

## Files Changed

### New Files
```
src/extensions/
├── _shared/
│   ├── types.ts                 # Manifest interfaces
│   └── testing.ts               # Test helpers
├── manager.ts                   # Extension loader
├── ai/
│   ├── types.ts
│   ├── anthropic/
│   │   ├── provider.ts
│   │   ├── manifest.ts
│   │   └── anthropic.test.ts
│   ├── openai/
│   │   └── ...
│   └── ollama/
│       └── ...
├── channels/
│   ├── types.ts
│   ├── whatsapp/
│   │   ├── adapter.ts
│   │   ├── webhook.ts
│   │   ├── manifest.ts
│   │   └── whatsapp.test.ts
│   ├── sms/
│   │   └── ...
│   ├── email/
│   │   └── ...
│   └── webchat/
│       └── ...
└── pms/
    ├── types.ts
    ├── mock/
    │   └── ...
    ├── mews/
    │   └── ...
    └── cloudbeds/
        └── ...
```

### Deleted Files
```
src/integrations/core/registry.ts     # Replaced by manager.ts
src/integrations/channels/            # Merged into extensions
src/integrations/ai/providers/        # Merged into extensions
src/channels/                         # Merged into extensions
```

### Modified Files
```
src/gateway/index.ts                  # Use ExtensionManager
src/gateway/routes/integrations.ts    # Use ExtensionManager
apps/dashboard/src/pages/settings/    # New integrations UI
```

---

## Migration Strategy

1. **Create new structure first** - Don't delete old code yet
2. **Copy, don't move** - Preserve old code during migration
3. **Update imports gradually** - One module at a time
4. **Run tests after each step** - Catch issues early
5. **Delete old code last** - Only after everything works

---

## Related

- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md) - Full architecture
- [Migration Analysis](../03-architecture/decisions/006-extension-architecture-migration.md) - Phase 3 details
- [Phase 10.1: Core Structure](phase-10-1-core-structure.md) - Prerequisite
