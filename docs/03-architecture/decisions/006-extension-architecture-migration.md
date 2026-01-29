# ADR-006 Migration Analysis

## Current State vs Target State

### Executive Summary

**Good news:** The current codebase is ~60% aligned with ADR-006. The core abstractions exist, but they're scattered across folders. The migration is mostly **reorganization** rather than rewriting.

**Key gaps:**
1. No `src/core/` folder - kernel logic is scattered
2. No Task Router - AI doesn't auto-create tasks from intents
3. No manifest-based extension loading
4. No configurable autonomy settings
5. No Recovery Engine for reviews

---

## Current Architecture Map

```
CURRENT STRUCTURE                          TARGET STRUCTURE (ADR-006)
──────────────────                         ────────────────────────────

src/
├── pipeline/                              ├── core/
│   ├── processor.ts      ──────────────►  │   ├── message-processor.ts
│   └── responder.ts                       │   ├── conversation-fsm.ts (NEW)
│                                          │   ├── task-router.ts (NEW)
├── ai/                                    │   ├── escalation-engine.ts
│   ├── escalation.ts     ──────────────►  │   ├── guest-context.ts
│   ├── providers/        ──────────────►  │   ├── recovery-engine.ts (NEW)
│   ├── intent/                            │   └── interfaces/
│   ├── knowledge/                         │
│   └── responder.ts                       │
│                                          │
├── services/             ──────────────►  ├── services/ (mostly same)
│   ├── conversation.ts                    │
│   ├── task.ts                            │
│   ├── guest.ts                           │
│   └── ...                                │
│                                          │
├── channels/             ─┐               ├── extensions/
│   ├── whatsapp/          │               │   ├── manager.ts (NEW)
│   ├── sms/               ├─────────────► │   ├── ai/
│   ├── email/             │               │   │   ├── anthropic/
│   └── webchat/           │               │   │   ├── openai/
│                          │               │   │   └── ollama/
├── integrations/         ─┘               │   ├── channels/
│   ├── core/registry.ts   (DELETE)        │   │   ├── whatsapp/
│   ├── ai/                                │   │   ├── sms/
│   ├── channels/                          │   │   └── email/
│   └── pms/                               │   ├── pms/
│                                          │   └── ... (future extensions)
├── automation/           ──────────────►  │
│   └── index.ts                           │   (stays, integrates with core)
│                                          │
├── gateway/              ──────────────►  ├── gateway/ (mostly same)
└── db/                   ──────────────►  └── db/ (mostly same)
```

---

## Component-by-Component Analysis

### 1. Message Processor ✅ Exists (needs enhancement)

**Current:** `src/pipeline/processor.ts`
**Target:** `src/core/message-processor.ts`

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Receive message | ✅ | ✅ | - |
| Identify guest | ✅ | ✅ | - |
| Load context | ✅ | ✅ | - |
| Classify intent | ✅ (via responder) | ✅ | - |
| **Route to task** | ❌ | ✅ | **Missing** |
| Check escalation | ✅ | ✅ | - |
| Generate response | ✅ | ✅ | - |
| Send response | ✅ (returns, caller sends) | ✅ | Minor |
| **Track task completion** | ❌ | ✅ | **Missing** |

**Migration:** Move to `src/core/`, add task routing logic.

---

### 2. Escalation Engine ✅ Exists

**Current:** `src/ai/escalation.ts`
**Target:** `src/core/escalation-engine.ts`

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Sentiment analysis | ✅ | ✅ | - |
| Repetition detection | ✅ | ✅ | - |
| VIP handling | ✅ | ✅ | - |
| Explicit request detection | ✅ | ✅ | - |
| Confidence threshold | ✅ (hardcoded) | ✅ (configurable) | Config |
| **Configurable per-hotel** | ❌ | ✅ | **Missing** |

**Migration:** Move to `src/core/`, make thresholds configurable.

---

### 3. Task Router ❌ Missing

**Current:** Does not exist
**Target:** `src/core/task-router.ts`

This is a **new component** that:
- Takes classified intent (e.g., `housekeeping.amenity.towels`)
- Maps to department and task type
- Creates task automatically
- Returns task info to include in response

```typescript
// NEEDS TO BE CREATED
interface TaskRouter {
  route(intent: ClassifiedIntent, context: GuestContext): Promise<RoutingDecision>;
}

interface RoutingDecision {
  shouldCreateTask: boolean;
  department?: string;
  taskType?: string;
  priority?: 'urgent' | 'high' | 'standard' | 'low';
  autoAssign?: boolean;
}
```

---

### 4. Conversation State Machine ⚠️ Partial

**Current:** States exist in DB, but no formal FSM
**Target:** `src/core/conversation-fsm.ts`

| State Transition | Current | Target |
|-----------------|---------|--------|
| new → active | ✅ Implicit | ✅ Explicit |
| active → escalated | ✅ | ✅ |
| active → waiting | ❌ | ✅ |
| waiting → active | ❌ | ✅ |
| * → resolved | ✅ Implicit | ✅ Explicit |

**Migration:** Create explicit FSM with transition rules.

---

### 5. Guest Context Builder ✅ Exists

**Current:** `src/services/guest-context.ts`
**Target:** `src/core/guest-context.ts`

Works well. Just move to `src/core/`.

---

### 6. Automation Engine ✅ Exists

**Current:** `src/automation/index.ts`
**Target:** `src/core/automation-engine.ts`

Works well. Integrate with core events.

---

### 7. Recovery Engine ❌ Missing

**Current:** Does not exist
**Target:** `src/core/recovery-engine.ts`

This is a **new component** for post-stay flow:
- Detect bad reviews (via reputation extension)
- Match to guest
- Trigger recovery workflow
- Track resolution

---

### 8. AI Providers ✅ Exists (needs reorganization)

**Current:** Split between `src/ai/providers/` and `src/integrations/ai/`
**Target:** `src/extensions/ai/`

| Provider | Current Location | Migration |
|----------|-----------------|-----------|
| Anthropic | `src/integrations/ai/providers/anthropic.ts` | → `src/extensions/ai/anthropic/` |
| OpenAI | `src/integrations/ai/providers/openai.ts` | → `src/extensions/ai/openai/` |
| Ollama | `src/integrations/ai/providers/ollama.ts` | → `src/extensions/ai/ollama/` |

**Also:** Add `manifest.ts` to each with config schema.

---

### 9. Channel Adapters ⚠️ Duplicated

**Current:**
- `src/channels/whatsapp/` (adapter code)
- `src/integrations/channels/whatsapp/` (status tracking)
- `src/integrations/core/registry.ts` (config schema)

**Target:** `src/extensions/channels/whatsapp/` (everything in one place)

| Channel | Adapter | Config Schema | Webhook | Status |
|---------|---------|---------------|---------|--------|
| WhatsApp | `src/channels/whatsapp/` | `registry.ts` | `routes/webhooks/whatsapp.ts` | Split |
| SMS | `src/channels/sms/` | `registry.ts` | `routes/webhooks/sms.ts` | Split |
| Email | `src/channels/email/` | `registry.ts` | - | Split |
| WebChat | `src/channels/webchat/` | `registry.ts` | WebSocket | Split |

**Migration:** Consolidate each channel into self-contained extension folder.

---

### 10. PMS Adapters ✅ Good structure

**Current:** `src/integrations/pms/`
**Target:** `src/extensions/pms/`

Already well-organized with adapter interface. Just move and add manifest.

---

### 11. Extension Registry ❌ Needs replacement

**Current:** `src/integrations/core/registry.ts` (600+ lines, hardcoded)
**Target:** Dynamic manifest-based loading

```typescript
// CURRENT: Hardcoded
const aiIntegration: IntegrationDefinition = {
  id: 'ai',
  providers: [
    { id: 'anthropic', configSchema: [...] },
    { id: 'openai', configSchema: [...] },
  ],
};

// TARGET: Each extension has its own manifest
// src/extensions/ai/anthropic/manifest.ts
export const manifest: AIProviderManifest = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  configSchema: [...],
  createProvider: (config) => new AnthropicProvider(config),
};
```

---

### 12. Autonomy Settings ❌ Missing

**Current:** Hardcoded thresholds in various places
**Target:** Configurable per-hotel settings

```typescript
// NEEDS TO BE CREATED: src/core/autonomy.ts
interface AutonomySettings {
  defaultLevel: 'L1' | 'L2' | 'L3';
  actions: {
    [actionType: string]: {
      level: 'L0' | 'L1' | 'L2' | 'L3';
      maxAutoAmount?: number;
      requiresApproval?: boolean;
    };
  };
  confidenceThresholds: {
    autoExecute: number;
    suggestToStaff: number;
  };
}
```

---

## Migration Phases

### Phase 1: Create Core Structure (Low Risk)

1. Create `src/core/` folder
2. Create `src/core/interfaces/` with abstract types
3. Move `src/pipeline/processor.ts` → `src/core/message-processor.ts`
4. Move `src/ai/escalation.ts` → `src/core/escalation-engine.ts`
5. Move `src/services/guest-context.ts` → `src/core/guest-context.ts`
6. Update imports throughout codebase

**Estimated effort:** 1-2 days
**Risk:** Low (just moving files)

---

### Phase 2: Add Task Router (Medium Risk)

1. Create `src/core/task-router.ts`
2. Define intent → department mapping
3. Integrate into message processor
4. Update AI responder to use task info in responses

**Estimated effort:** 2-3 days
**Risk:** Medium (new feature, needs testing)

---

### Phase 3: Consolidate Extensions (Medium Risk)

1. Create `src/extensions/` folder
2. Create `src/extensions/manager.ts` for loading
3. Migrate AI providers:
   - `src/extensions/ai/anthropic/`
   - `src/extensions/ai/openai/`
   - `src/extensions/ai/ollama/`
4. Migrate channels:
   - `src/extensions/channels/whatsapp/`
   - `src/extensions/channels/sms/`
   - `src/extensions/channels/email/`
   - `src/extensions/channels/webchat/`
5. Migrate PMS:
   - `src/extensions/pms/mews/`
   - `src/extensions/pms/cloudbeds/`
   - `src/extensions/pms/mock/`
6. Add manifest.ts to each extension
7. Delete old `src/integrations/core/registry.ts`
8. Update all imports

**Estimated effort:** 3-5 days
**Risk:** Medium (lots of file moves, import updates)

---

### Phase 4: Add Autonomy Settings (Low Risk)

1. Create `src/core/autonomy.ts`
2. Add autonomy settings to database schema
3. Add API endpoint for hotel to configure
4. Integrate with message processor decisions
5. Add to dashboard UI

**Estimated effort:** 2-3 days
**Risk:** Low (additive, doesn't break existing)

---

### Phase 5: Add Recovery Engine (Low Risk)

1. Create `src/core/recovery-engine.ts`
2. Define recovery workflow
3. Integrate with reputation extensions (future)
4. Add to automation triggers

**Estimated effort:** 2-3 days
**Risk:** Low (new feature, can be added incrementally)

---

## What Stays the Same

These components are already good and need minimal changes:

| Component | Location | Change |
|-----------|----------|--------|
| Database schema | `src/db/schema.ts` | Add autonomy settings table |
| Services | `src/services/` | Keep as-is |
| Gateway/Routes | `src/gateway/` | Minor updates for extension routes |
| Events system | `src/events/` | Keep as-is |
| Utils | `src/utils/` | Keep as-is |
| Dashboard | `apps/dashboard/` | Add autonomy settings UI |

---

## Summary

| Category | Current | Target | Gap | Effort |
|----------|---------|--------|-----|--------|
| Core kernel | Scattered | `src/core/` | Reorganize | 2 days |
| Task Router | Missing | `src/core/task-router.ts` | New | 3 days |
| Escalation | Exists | Move + config | Minor | 1 day |
| Extensions | Duplicated | `src/extensions/` | Consolidate | 4 days |
| Manifests | Hardcoded | Per-extension | New pattern | 2 days |
| Autonomy | Missing | Configurable | New | 3 days |
| Recovery | Missing | New engine | New | 3 days |

**Total estimated effort:** 2-3 weeks for full migration

**Recommended approach:** Do Phase 1-3 first (core + task router + extensions), then Phase 4-5 can be added incrementally.
