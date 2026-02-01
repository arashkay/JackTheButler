# Phase 15.4: Cleanup

**Focus:** Final cleanup and verification
**Risk:** Low
**Depends on:** Phase 15.3
**Status:** ✓ COMPLETE (2026-02-01)

---

## Goal

Remove any remaining duplicate/unused code and verify the architecture is clean.

---

## Tasks

### 1. Verify No Duplicates

- [ ] Check no duplicate AI provider code:
  ```bash
  find src -name "*.ts" | xargs grep -l "class.*Provider.*implements.*AIProvider" | wc -l
  # Expected: 3 (one per provider in extensions/ai/)
  ```

- [ ] Check no duplicate channel code:
  ```bash
  find src -name "*.ts" | xargs grep -l "class.*Provider.*implements.*ChannelProvider" | wc -l
  # Expected: 4 (one per channel in extensions/channels/)
  ```

### 2. Clean Up ai/ Folder

After orchestrators are created, `src/ai/` should only contain:

- [ ] `src/ai/cache.ts` - Keep (caching logic)
- [ ] `src/ai/intent/` - Keep (intent classification)
- [ ] `src/ai/knowledge/` - Keep (knowledge retrieval)
- [ ] `src/ai/types.ts` - Keep (type definitions)
- [ ] Delete `src/ai/providers/` - Already done in 15.1
- [ ] Delete `src/ai/responder.ts` - Already done in 15.3
- [ ] Delete `src/ai/escalation.ts` - Move to core if needed

### 3. Verify Folder Structure

Final structure should be:

```
src/
├── core/                    # Domain logic ✓
├── db/                      # Database ✓
├── extensions/              # ALL providers ✓
│   ├── ai/
│   ├── channels/
│   └── pms/
├── gateway/                 # HTTP/WebSocket ✓
├── orchestrators/           # Business logic ✓ (NEW)
├── services/                # State management ✓
├── types/                   # TypeScript types ✓
├── utils/                   # Utilities ✓
├── config/                  # Configuration ✓
├── errors/                  # Error classes ✓
└── events/                  # Event system ✓
```

Folders that should NOT exist:
- [ ] `src/ai/providers/` - Deleted
- [ ] `src/channels/` - Deleted
- [ ] `src/pipeline/` - Deleted

### 4. Update Documentation

- [ ] Update `CLAUDE.md` with new folder structure
- [ ] Update `docs/conversation.md` with new structure
- [ ] Update any architecture docs

### 5. Final Verification

```bash
# Full test suite
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Start and test manually
pnpm dev
```

---

## Final Checklist

| Check | Status |
|-------|--------|
| No `src/ai/providers/` folder | [ ] |
| No `src/channels/` folder | [ ] |
| No `src/pipeline/` folder | [ ] |
| `src/orchestrators/` exists with 3 files | [ ] |
| All providers in `src/extensions/` | [ ] |
| All tests pass | [ ] |
| TypeScript compiles | [ ] |
| Documentation updated | [ ] |

---

## Architecture Summary (After Phase 15)

```
Request → Gateway → Orchestrator → Provider → External Service
                         ↓
                       Core
                    (task routing,
                     escalation)
```

| Component | Location | Purpose |
|-----------|----------|---------|
| Entry points | `gateway/` | HTTP, WebSocket, Webhooks |
| Business logic | `orchestrators/` | Workflow coordination |
| Domain logic | `core/` | Task routing, escalation |
| External services | `extensions/` | AI, Channels, PMS |
| State | `services/` | Database access |
