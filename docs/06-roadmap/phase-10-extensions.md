# Phase 10: Extension Architecture

**Version:** 1.1.0
**Codename:** Kernel
**Focus:** Core/Extension separation, Task Router, Autonomy
**Milestone:** Jack handles requests end-to-end (L2 autonomy)

---

## Overview

Phase 10 restructures Jack for **progressive autonomy**. The goal is to move from "AI that answers questions" to "AI that handles requests end-to-end."

### Key Outcomes

1. Clear separation between **Kernel** (business logic) and **Extensions** (adapters)
2. **Task Router** automatically creates tasks from guest intents
3. **Configurable autonomy** settings per hotel
4. **Manifest-based extensions** for easy addition of new integrations
5. Foundation for L3/L4 autonomy in future versions

---

## Sub-Phases

| Phase | Version | Focus | Key Deliverable |
|-------|---------|-------|-----------------|
| [**10.1: Core Structure**](phase-10-1-core-structure.md) | 1.1.0-alpha.1 | Create `src/core/` | Kernel modules moved |
| [**10.2: Task Router**](phase-10-2-task-router.md) | 1.1.0-alpha.2 | Auto-create tasks from intents | Tasks created automatically |
| [**10.3: Extension Consolidation**](phase-10-3-extension-consolidation.md) | 1.1.0-alpha.3 | Manifest-based extensions | Self-contained integrations |
| [**10.4: Autonomy Settings**](phase-10-4-autonomy-settings.md) | 1.1.0-beta.1 | Configurable autonomy | Hotel controls automation level |
| [**10.5: Recovery Engine**](phase-10-5-recovery-engine.md) | 1.1.0 / 1.2.0 | Review recovery workflow | Bad reviews trigger recovery |

---

## User-Visible Milestones

### After Phase 10.1
- `pnpm dev` works as before
- All tests pass
- No visible changes (internal restructuring)

### After Phase 10.2
- Guest says "I need towels" → Task auto-created
- Dashboard shows task with "Auto-created" badge
- AI response includes: "I've arranged for towels to be delivered"

### After Phase 10.3
- Dashboard → Integrations shows all extensions with status
- Each extension has its own configuration form
- Adding new integrations is easier (for developers)

### After Phase 10.4
- Dashboard → Settings → Autonomy allows configuration
- Staff can set what requires approval vs. auto-execute
- Approval queue shows pending items for L1 actions

### After Phase 10.5 (Not Implemented)
- Low NPS survey triggers recovery case
- Dashboard → Recovery shows cases
- Staff can send recovery offers to unhappy guests

---

## Dependencies

```
Phase 10.1 (Core Structure)
    │
    ├──► Phase 10.2 (Task Router)
    │        │
    │        ▼
    │    Phase 10.4 (Autonomy Settings)
    │
    └──► Phase 10.3 (Extension Consolidation)
              │
              ▼
         Phase 10.5 (Recovery Engine)
```

**Note:** Phase 10.2 and 10.3 can run in parallel after 10.1 completes.

---

## Success Criteria

### 1.1.0-alpha (Phases 10.1-10.3)

| Criteria | Test |
|----------|------|
| Core separation | `src/core/` contains kernel modules |
| Task routing | Guest request creates task automatically |
| Extension consolidation | Each extension self-contained in one folder |
| No regressions | All 142+ tests pass |
| Dashboard works | All pages load without errors |

### 1.1.0-beta (Phase 10.4)

| Criteria | Test |
|----------|------|
| Autonomy settings | Dashboard → Settings → Autonomy works |
| L2 default | Routine requests handled automatically |
| L1 approval | Sensitive actions queue for approval |
| Approval queue | Staff can approve/reject pending items |

### 1.1.0 (All Phases)

| Criteria | Test |
|----------|------|
| L2 autonomy | Jack handles routine requests end-to-end |
| Recovery engine | Low scores trigger recovery workflow |
| Full documentation | All ADRs and specs updated |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing integrations | Medium | High | Comprehensive tests, gradual migration |
| Import path issues | High | Low | IDE refactoring tools, grep verification |
| Performance regression | Low | Medium | Benchmark before/after |
| Dashboard breaks | Medium | Medium | Test each extension in UI |

---

## Post-1.1.0 Roadmap Preview

| Version | Focus | Key Features |
|---------|-------|--------------|
| **1.2.0** | P1 Extensions | Housekeeping, Reputation, Surveys integrations |
| **1.3.0** | L3 Autonomy | End-to-end task handling, follow-ups |
| **1.4.0** | P2 Extensions | POS, Transport, CRM integrations |
| **2.0.0** | L4 Autonomy | Proactive actions, predictive service |

---

## Related Documents

- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md)
- [ADR-006 Migration Analysis](../03-architecture/decisions/006-extension-architecture-migration.md)
- [Phase 9: Launch](phase-9-launch.md)

### Sub-Phase Documents

- [Phase 10.1: Core Structure](phase-10-1-core-structure.md)
- [Phase 10.2: Task Router](phase-10-2-task-router.md)
- [Phase 10.3: Extension Consolidation](phase-10-3-extension-consolidation.md)
- [Phase 10.4: Autonomy Settings](phase-10-4-autonomy-settings.md)
- [Phase 10.5: Recovery Engine](phase-10-5-recovery-engine.md)
