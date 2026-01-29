# Phase 10.1: Core Structure

**Version:** 1.1.0-alpha.1
**Codename:** Kernel Foundation
**Focus:** Create `src/core/` directory and move kernel logic
**Depends on:** Phase 9 (Launch) complete

---

## Goal

Establish clear separation between **kernel** (business logic) and **extensions** (adapters). After this phase, all core orchestration logic lives in `src/core/`.

---

## What You Can Test

After completing this phase, verify the following:

### 1. Development Server Works
```bash
pnpm dev
# Expected: Server starts on port 3000
```

### 2. All Tests Pass
```bash
pnpm test
# Expected: 142+ tests pass, 0 failures
```

### 3. API Health Check
```bash
curl http://localhost:3000/health
# Expected: { "status": "healthy", "version": "1.1.0-alpha.1" }
```

### 4. WebSocket Echo Still Works
Connect to `ws://localhost:3000/ws` and send a message. Should receive echo response.

### 5. Dashboard Loads
Open `http://localhost:3001` - Dashboard should load without errors.

---

## Tasks

### Create Core Directory Structure

- [ ] Create `src/core/` directory
- [ ] Create `src/core/interfaces/` subdirectory

### Create Abstract Interfaces

These define what extensions must implement (no specific implementations):

- [ ] `src/core/interfaces/channel.ts` - ChannelAdapter interface
  ```typescript
  export interface ChannelAdapter {
    readonly id: string;
    send(message: OutboundMessage): Promise<SendResult>;
    parseIncoming(payload: unknown): InboundMessage | null;
    verifySignature?(payload: unknown, signature: string): boolean;
  }
  ```

- [ ] `src/core/interfaces/ai.ts` - AIProvider interface
  ```typescript
  export interface AIProvider {
    readonly id: string;
    complete(request: CompletionRequest): Promise<CompletionResponse>;
    embed?(texts: string[]): Promise<number[][]>;
    testConnection(): Promise<ConnectionTestResult>;
  }
  ```

- [ ] `src/core/interfaces/pms.ts` - PMSAdapter interface
  ```typescript
  export interface PMSAdapter {
    readonly id: string;
    fetchGuests(since?: Date): Promise<NormalizedGuest[]>;
    fetchReservations(since?: Date): Promise<NormalizedReservation[]>;
    fetchRooms(): Promise<NormalizedRoom[]>;
    testConnection(): Promise<ConnectionTestResult>;
  }
  ```

- [ ] `src/core/interfaces/index.ts` - Export all interfaces

### Move Kernel Modules

| From | To | Description |
|------|-----|-------------|
| `src/pipeline/processor.ts` | `src/core/message-processor.ts` | Main message orchestrator |
| `src/ai/escalation.ts` | `src/core/escalation-engine.ts` | Escalation decision logic |
| `src/services/guest-context.ts` | `src/core/guest-context.ts` | Guest context builder |

- [ ] Move `src/pipeline/processor.ts` → `src/core/message-processor.ts`
- [ ] Move `src/ai/escalation.ts` → `src/core/escalation-engine.ts`
- [ ] Move `src/services/guest-context.ts` → `src/core/guest-context.ts`

### Create Conversation State Machine

- [ ] Create `src/core/conversation-fsm.ts` with explicit state transitions:
  ```typescript
  // States: new → active → waiting → escalated → resolved
  export class ConversationFSM {
    transition(conversation: Conversation, event: ConversationEvent): ConversationState;
    canTransition(from: ConversationState, to: ConversationState): boolean;
  }
  ```

### Update Imports

- [ ] Update all imports in `src/` to use new paths
- [ ] Update all imports in `apps/dashboard/` if needed
- [ ] Update all imports in `tests/`

### Verify No Regressions

- [ ] Run full test suite: `pnpm test`
- [ ] Run type check: `pnpm typecheck`
- [ ] Run linter: `pnpm lint`
- [ ] Manual test: send message via WebSocket

---

## Acceptance Criteria

### Technical Criteria

- [ ] `src/core/` directory exists with:
  - `message-processor.ts`
  - `escalation-engine.ts`
  - `guest-context.ts`
  - `conversation-fsm.ts`
  - `interfaces/channel.ts`
  - `interfaces/ai.ts`
  - `interfaces/pms.ts`

- [ ] No business logic remains in:
  - `src/pipeline/` (should only have thin wrappers if anything)
  - Future `src/extensions/` (created in 10.3)

- [ ] All 142+ tests pass
- [ ] TypeScript compiles with no errors
- [ ] `pnpm dev` starts server successfully

### User-Facing Criteria

| Test | Expected Result |
|------|-----------------|
| `pnpm dev` | Server starts, logs show "Core initialized" |
| `curl /health` | Returns healthy status |
| Send WhatsApp test message | Response received (same as before) |
| Open dashboard | Loads without errors |
| Check conversations list | Shows existing conversations |

---

## Files Changed

### New Files
```
src/core/
├── message-processor.ts      # Moved from pipeline/processor.ts
├── escalation-engine.ts      # Moved from ai/escalation.ts
├── guest-context.ts          # Moved from services/guest-context.ts
├── conversation-fsm.ts       # New - explicit state machine
└── interfaces/
    ├── index.ts              # Export all interfaces
    ├── channel.ts            # ChannelAdapter interface
    ├── ai.ts                 # AIProvider interface
    └── pms.ts                # PMSAdapter interface
```

### Deleted Files
```
src/pipeline/processor.ts     # Moved to core/
src/ai/escalation.ts          # Moved to core/
src/services/guest-context.ts # Moved to core/
```

### Modified Files
```
Multiple files with import updates
```

---

## Rollback Plan

If issues arise:
1. Revert file moves using git
2. Restore original import paths
3. Tag: `git tag v1.0.0-restore` before starting

---

## Related

- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md) - See "Core Kernel Modules" section
- [Migration Analysis](../03-architecture/decisions/006-extension-architecture-migration.md) - Phase 1 details
- [Phase 10 Overview](phase-10-extensions.md)
