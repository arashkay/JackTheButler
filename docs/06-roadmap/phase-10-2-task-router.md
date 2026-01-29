# Phase 10.2: Task Router

**Version:** 1.1.0-alpha.2
**Codename:** Smart Routing
**Focus:** Automatic task creation from guest intents
**Depends on:** Phase 10.1 (Core Structure)

---

## Goal

When a guest sends a request like "I need more towels," Jack should **automatically create a task** for the Housekeeping department. This is the key enabler for L2 autonomy.

---

## What You Can Test

After completing this phase, test these scenarios:

### 1. Housekeeping Request Creates Task
```
Guest sends: "Can I get extra towels please?"
Expected:
- AI responds: "Of course! Extra towels will be delivered to room 412 shortly."
- Task created in Housekeeping queue
- Dashboard shows new task
```

### 2. Maintenance Request Creates Urgent Task
```
Guest sends: "The AC is broken and it's really hot"
Expected:
- AI responds: "I'm sorry for the discomfort. I've created an urgent maintenance request."
- High-priority task created for Maintenance
- Dashboard shows urgent task with red indicator
```

### 3. Info Request Does NOT Create Task
```
Guest sends: "What time is checkout?"
Expected:
- AI responds: "Check-out time is 11:00 AM."
- NO task created (information only)
```

### 4. Dashboard Shows Task Origin
Open dashboard → Tasks → New task should show:
- "Auto-created from guest request"
- Link to original conversation
- Guest name and room number

---

## Tasks

### Create Task Router Module

- [ ] Create `src/core/task-router.ts`
- [ ] Define intent-to-department mapping:

```typescript
const INTENT_DEPARTMENT_MAP: Record<string, DepartmentConfig> = {
  'housekeeping.cleaning': { department: 'housekeeping', priority: 'standard' },
  'housekeeping.amenity': { department: 'housekeeping', priority: 'standard' },
  'housekeeping.turndown': { department: 'housekeeping', priority: 'low' },

  'maintenance.repair': { department: 'maintenance', priority: 'high' },
  'maintenance.hvac': { department: 'maintenance', priority: 'urgent' },
  'maintenance.plumbing': { department: 'maintenance', priority: 'high' },

  'concierge.restaurant': { department: 'concierge', priority: 'standard' },
  'concierge.transport': { department: 'concierge', priority: 'standard' },
  'concierge.tickets': { department: 'concierge', priority: 'low' },

  'dining.roomservice': { department: 'fnb', priority: 'standard' },
  'dining.reservation': { department: 'fnb', priority: 'standard' },

  'billing.inquiry': { department: 'frontdesk', priority: 'standard' },
  'billing.dispute': { department: 'frontdesk', priority: 'high' },

  'complaint.*': { department: 'duty_manager', priority: 'high' },
};
```

### Implement TaskRouter Class

- [ ] Create `TaskRouter` class with methods:
  ```typescript
  export class TaskRouter {
    shouldCreateTask(intent: ClassifiedIntent): boolean;
    route(intent: ClassifiedIntent, context: GuestContext): RoutingDecision;
    createTask(decision: RoutingDecision, conversation: Conversation): Promise<Task>;
  }
  ```

- [ ] Add `RoutingDecision` type:
  ```typescript
  interface RoutingDecision {
    shouldCreateTask: boolean;
    department?: string;
    taskType?: string;
    priority: 'urgent' | 'high' | 'standard' | 'low';
    autoAssign?: boolean;
    details?: Record<string, unknown>;
  }
  ```

### Integrate with Message Processor

- [ ] Update `src/core/message-processor.ts` to call TaskRouter after intent classification
- [ ] Pass task info to AI responder for inclusion in response
- [ ] Store task reference in conversation metadata

### Update AI Response Generation

- [ ] Modify AI prompts to include task confirmation when task is created
- [ ] Examples:
  - "I've arranged for towels to be delivered to your room."
  - "I've created an urgent maintenance request for your AC issue."
  - "I've forwarded your request to our concierge team."

### Dashboard Updates

- [ ] Add "Source" column to Tasks list showing "Auto" or "Manual"
- [ ] Add link from task to originating conversation
- [ ] Add filter: "Show auto-created tasks"
- [ ] Task detail page shows conversation excerpt

---

## Database Changes

- [ ] Add column to `tasks` table:
  ```sql
  ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'manual';
  -- Values: 'manual', 'auto', 'automation'

  ALTER TABLE tasks ADD COLUMN conversation_id TEXT REFERENCES conversations(id);
  ```

- [ ] Create migration file: `migrations/XXXX_add_task_source.ts`

---

## Acceptance Criteria

### Technical Criteria

- [ ] `src/core/task-router.ts` exists and exports `TaskRouter` class
- [ ] TaskRouter integrated into MessageProcessor
- [ ] Tasks created with `source: 'auto'` and linked to conversation
- [ ] All existing tests pass
- [ ] New tests for TaskRouter pass (aim for 90%+ coverage)

### User-Facing Criteria

| Scenario | Action | Expected Result |
|----------|--------|-----------------|
| Towel request | Send "I need towels" | Task appears in Housekeeping queue within 2 seconds |
| AC broken | Send "AC not working" | Urgent task appears in Maintenance queue |
| Checkout time | Send "What time is checkout?" | AI answers, NO task created |
| View task | Click task in dashboard | Shows "Auto-created from conversation" with link |
| Filter tasks | Click "Auto-created" filter | Shows only auto-generated tasks |

### Dashboard UI Changes

| Page | Change |
|------|--------|
| Tasks List | New "Source" column (Auto/Manual icon) |
| Tasks List | New filter dropdown: "All / Auto-created / Manual" |
| Task Detail | "Created from conversation" section with link |
| Task Detail | Conversation excerpt showing guest request |

---

## Test Cases

```typescript
describe('TaskRouter', () => {
  it('creates housekeeping task for towel request', async () => {
    const intent = { category: 'housekeeping.amenity', entities: { item: 'towels' } };
    const result = await router.route(intent, guestContext);

    expect(result.shouldCreateTask).toBe(true);
    expect(result.department).toBe('housekeeping');
    expect(result.priority).toBe('standard');
  });

  it('creates urgent maintenance task for AC issues', async () => {
    const intent = { category: 'maintenance.hvac', sentiment: 'frustrated' };
    const result = await router.route(intent, guestContext);

    expect(result.shouldCreateTask).toBe(true);
    expect(result.department).toBe('maintenance');
    expect(result.priority).toBe('urgent');
  });

  it('does not create task for info requests', async () => {
    const intent = { category: 'info.checkout_time' };
    const result = await router.route(intent, guestContext);

    expect(result.shouldCreateTask).toBe(false);
  });

  it('elevates priority for VIP guests', async () => {
    const intent = { category: 'housekeeping.amenity' };
    const vipContext = { ...guestContext, guest: { ...guestContext.guest, isVIP: true } };
    const result = await router.route(intent, vipContext);

    expect(result.priority).toBe('high'); // Elevated from 'standard'
  });
});
```

---

## Files Changed

### New Files
```
src/core/task-router.ts           # Task routing logic
src/core/types/routing.ts         # RoutingDecision, DepartmentConfig types
migrations/XXXX_add_task_source.ts # Database migration
tests/core/task-router.test.ts    # Unit tests
```

### Modified Files
```
src/core/message-processor.ts     # Integrate TaskRouter
src/ai/responder.ts               # Include task info in responses
src/db/schema.ts                  # Add task.source, task.conversation_id
apps/dashboard/src/pages/tasks/   # UI updates
```

---

## Related

- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md) - See "Task Router" section
- [Migration Analysis](../03-architecture/decisions/006-extension-architecture-migration.md) - Task Router gap
- [Phase 10.1: Core Structure](phase-10-1-core-structure.md) - Prerequisite
- [Phase 10.4: Autonomy Settings](phase-10-4-autonomy-settings.md) - Next step
