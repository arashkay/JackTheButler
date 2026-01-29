# Phase 10.4: Autonomy Settings

**Version:** 1.1.0-beta.1
**Codename:** Configurable Control
**Focus:** Hotel-configurable autonomy levels
**Depends on:** Phase 10.2 (Task Router)

---

## Goal

Allow each hotel to configure **how autonomous** Jack should be. Some hotels want full automation; others want staff approval for everything. This phase adds the settings UI and integrates autonomy checks into the core.

---

## What You Can Test

After completing this phase, test these scenarios:

### 1. View Autonomy Settings
Dashboard → Settings → Autonomy:
- See current autonomy level (L1/L2/L3)
- See per-action settings
- See confidence thresholds

### 2. Change Autonomy Level
Set autonomy to L1 (Assisted):
```
Guest sends: "I need towels"
Expected:
- Task created in PENDING state
- Staff sees approval request in dashboard
- Message NOT sent until staff approves
```

Set autonomy to L2 (Supervised):
```
Guest sends: "I need towels"
Expected:
- Task created automatically
- Response sent immediately
- Staff can review in activity log
```

### 3. Per-Action Override
Set "Maintenance Requests" to require approval:
```
Guest sends: "AC is broken"
Expected:
- Task created in PENDING state
- Staff must approve before maintenance is notified
- Guest receives: "I'm checking on that for you"
```

### 4. Confidence Threshold
Set auto-execute threshold to 0.95:
```
Guest sends: "somethingg confusinggg"
Expected:
- Low confidence detected
- Escalated to staff instead of auto-responding
```

### 5. VIP Override
Enable "Always escalate VIP complaints":
```
VIP guest sends: "This is unacceptable!"
Expected:
- Escalated to manager immediately
- No auto-response sent
```

---

## Tasks

### Create Autonomy Module

- [ ] Create `src/core/autonomy.ts`:
  ```typescript
  export interface AutonomySettings {
    defaultLevel: 'L1' | 'L2' | 'L3';

    actions: {
      respondToGuest: ActionConfig;
      createHousekeepingTask: ActionConfig;
      createMaintenanceTask: ActionConfig;
      createConciergeTask: ActionConfig;
      issueRefund: ActionConfig;
      offerDiscount: ActionConfig;
      sendMarketingMessage: ActionConfig;
    };

    confidenceThresholds: {
      autoExecute: number;      // >= this: auto-execute
      suggestToStaff: number;   // >= this: suggest
      escalate: number;         // < this: escalate
    };

    vipOverrides: {
      alwaysEscalateComplaints: boolean;
      requireApprovalForOffers: boolean;
      elevateTaskPriority: boolean;
    };
  }

  export interface ActionConfig {
    level: 'L1' | 'L2' | 'L3';
    requiresReview: boolean;
    maxAutoAmount?: number;     // For financial actions
    maxAutoPercent?: number;    // For discounts
  }
  ```

- [ ] Create `AutonomyEngine` class:
  ```typescript
  export class AutonomyEngine {
    canAutoExecute(action: ActionType, context: GuestContext): boolean;
    getRequiredApproval(action: ActionType, context: GuestContext): ApprovalType;
    getEffectiveLevel(action: ActionType, context: GuestContext): AutonomyLevel;
  }
  ```

### Database Changes

- [ ] Create `autonomy_settings` table:
  ```sql
  CREATE TABLE autonomy_settings (
    id TEXT PRIMARY KEY DEFAULT (uuid()),
    hotel_id TEXT NOT NULL REFERENCES hotels(id),
    settings JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] Create migration: `migrations/XXXX_add_autonomy_settings.ts`
- [ ] Add default L2 settings seed data

### API Endpoints

- [ ] `GET /api/v1/settings/autonomy` - Get current settings
- [ ] `PUT /api/v1/settings/autonomy` - Update settings
- [ ] `GET /api/v1/settings/autonomy/defaults` - Get default settings
- [ ] `POST /api/v1/settings/autonomy/reset` - Reset to defaults

### Integrate with Core

- [ ] Update `src/core/message-processor.ts`:
  - Check autonomy before sending response
  - Queue for approval if L1

- [ ] Update `src/core/task-router.ts`:
  - Check autonomy before auto-creating task
  - Set task status based on autonomy level

- [ ] Update `src/core/escalation-engine.ts`:
  - Use confidence thresholds from settings
  - Apply VIP overrides

### Approval Queue System

- [ ] Create `src/core/approval-queue.ts`:
  ```typescript
  export class ApprovalQueue {
    queueForApproval(item: ApprovalItem): Promise<string>;
    approve(itemId: string, staffId: string): Promise<void>;
    reject(itemId: string, staffId: string, reason: string): Promise<void>;
    getPending(): Promise<ApprovalItem[]>;
  }
  ```

- [ ] Create `approval_queue` table:
  ```sql
  CREATE TABLE approval_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,           -- 'response', 'task', 'offer'
    action_data JSONB NOT NULL,
    conversation_id TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP,
    decided_at TIMESTAMP,
    decided_by TEXT
  );
  ```

---

## Dashboard UI

### Autonomy Settings Page

**Location:** Settings → Autonomy

#### Global Settings Section
```
┌─────────────────────────────────────────────────────────────┐
│ Global Autonomy Level                                        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                         │
│ │   L1    │ │   L2    │ │   L3    │                         │
│ │Assisted │ │Supervised│ │Autonomous│                       │
│ └─────────┘ └────✓────┘ └─────────┘                         │
│                                                              │
│ L2 - Jack executes automatically, staff monitors            │
└─────────────────────────────────────────────────────────────┘
```

#### Per-Action Settings Section
```
┌─────────────────────────────────────────────────────────────┐
│ Action Settings                                              │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Respond to Guests                              [L2 ▼]   │ │
│ │ □ Require review before sending                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Create Housekeeping Tasks                      [L3 ▼]   │ │
│ │ □ Require review before creating                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Create Maintenance Tasks                       [L2 ▼]   │ │
│ │ ☑ Require review before creating                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Issue Refunds                                  [L1 ▼]   │ │
│ │ Maximum auto-approve amount: $[0      ]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Confidence Thresholds Section
```
┌─────────────────────────────────────────────────────────────┐
│ Confidence Thresholds                                        │
│                                                              │
│ Auto-execute when confidence ≥ [0.90] (90%)                 │
│ ├──────────────────────●─────┤                              │
│                                                              │
│ Suggest to staff when confidence ≥ [0.70] (70%)             │
│ ├────────────●───────────────┤                              │
│                                                              │
│ Escalate when confidence < [0.50] (50%)                     │
│ ├────●───────────────────────┤                              │
└─────────────────────────────────────────────────────────────┘
```

#### VIP Settings Section
```
┌─────────────────────────────────────────────────────────────┐
│ VIP Guest Settings                                           │
│                                                              │
│ ☑ Always escalate complaints from VIP guests                │
│ ☑ Require approval before sending offers to VIP guests      │
│ ☑ Elevate task priority for VIP guests                      │
└─────────────────────────────────────────────────────────────┘
```

### Approval Queue Page

**Location:** Dashboard → Approvals (new menu item)

```
┌─────────────────────────────────────────────────────────────┐
│ Pending Approvals (3)                                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🗨️ Response to John Smith (Room 412)          2 min ago │ │
│ │ "Of course! I'll have housekeeping bring extra towels"  │ │
│ │ [Approve ✓] [Edit & Approve ✎] [Reject ✗]               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔧 Maintenance Task for Jane Doe (Room 508)    5 min ago│ │
│ │ "AC not working - room temperature complaint"           │ │
│ │ [Approve ✓] [Reject ✗]                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Technical Criteria

- [ ] `src/core/autonomy.ts` exists with AutonomySettings and AutonomyEngine
- [ ] `autonomy_settings` table in database
- [ ] `approval_queue` table in database
- [ ] API endpoints for settings CRUD
- [ ] Core modules check autonomy before actions
- [ ] Default L2 settings applied on fresh install
- [ ] All tests pass

### User-Facing Criteria

| Test | Expected Result |
|------|-----------------|
| View Settings → Autonomy | Shows current settings |
| Change to L1 | All actions require approval |
| Change to L2 | Actions execute, staff monitors |
| Set action to require review | That action queues for approval |
| Set confidence to 0.99 | Low-confidence messages escalate |
| Enable VIP escalate | VIP complaints go to manager |
| Approve queued response | Response sent to guest |
| Reject queued response | Response discarded, staff can reply manually |

---

## Test Cases

```typescript
describe('AutonomyEngine', () => {
  it('allows auto-execute at L2 for housekeeping', () => {
    const settings = defaultL2Settings();
    const engine = new AutonomyEngine(settings);

    expect(engine.canAutoExecute('createHousekeepingTask', guestContext)).toBe(true);
  });

  it('requires approval at L1', () => {
    const settings = { ...defaultL2Settings(), defaultLevel: 'L1' };
    const engine = new AutonomyEngine(settings);

    expect(engine.canAutoExecute('respondToGuest', guestContext)).toBe(false);
    expect(engine.getRequiredApproval('respondToGuest', guestContext)).toBe('staff');
  });

  it('escalates VIP complaints when enabled', () => {
    const settings = {
      ...defaultL2Settings(),
      vipOverrides: { alwaysEscalateComplaints: true }
    };
    const engine = new AutonomyEngine(settings);
    const vipContext = { ...guestContext, guest: { isVIP: true } };

    expect(engine.canAutoExecute('respondToGuest', vipContext)).toBe(false);
  });

  it('respects per-action overrides', () => {
    const settings = {
      ...defaultL2Settings(),
      actions: {
        ...defaultL2Settings().actions,
        createMaintenanceTask: { level: 'L1', requiresReview: true }
      }
    };
    const engine = new AutonomyEngine(settings);

    expect(engine.canAutoExecute('createMaintenanceTask', guestContext)).toBe(false);
  });
});
```

---

## Files Changed

### New Files
```
src/core/autonomy.ts              # AutonomySettings, AutonomyEngine
src/core/approval-queue.ts        # Approval queue system
src/db/schema/autonomy.ts         # Database schema
migrations/XXXX_autonomy.ts       # Migration
tests/core/autonomy.test.ts       # Tests

apps/dashboard/src/pages/settings/autonomy.tsx    # Settings page
apps/dashboard/src/pages/approvals/index.tsx      # Approvals queue
apps/dashboard/src/components/approval-card.tsx   # Approval card component
```

### Modified Files
```
src/core/message-processor.ts     # Autonomy checks
src/core/task-router.ts           # Autonomy checks
src/core/escalation-engine.ts     # Confidence thresholds
src/gateway/routes/settings.ts    # New endpoints
apps/dashboard/src/App.tsx        # New routes
apps/dashboard/src/components/sidebar.tsx  # New menu item
```

---

## Default Settings (L2)

```typescript
const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
  defaultLevel: 'L2',

  actions: {
    respondToGuest: { level: 'L2', requiresReview: false },
    createHousekeepingTask: { level: 'L3', requiresReview: false },
    createMaintenanceTask: { level: 'L2', requiresReview: false },
    createConciergeTask: { level: 'L2', requiresReview: false },
    issueRefund: { level: 'L1', requiresReview: true, maxAutoAmount: 0 },
    offerDiscount: { level: 'L1', requiresReview: true, maxAutoPercent: 0 },
    sendMarketingMessage: { level: 'L1', requiresReview: true },
  },

  confidenceThresholds: {
    autoExecute: 0.90,
    suggestToStaff: 0.70,
    escalate: 0.50,
  },

  vipOverrides: {
    alwaysEscalateComplaints: true,
    requireApprovalForOffers: true,
    elevateTaskPriority: true,
  },
};
```

---

## Related

- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md) - Autonomy levels section
- [Phase 10.2: Task Router](phase-10-2-task-router.md) - Prerequisite
- [Phase 10.5: Recovery Engine](phase-10-5-recovery-engine.md) - Uses autonomy
