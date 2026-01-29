# Phase 10.5: Recovery Engine

**Version:** 1.1.0 (or defer to 1.2.0)
**Codename:** Reputation Guard
**Focus:** Post-stay review recovery workflow
**Depends on:** Phase 10.3 (Extension Consolidation) - for reputation extension hooks
**Optional:** Can be deferred to v1.2.0

---

## Goal

When a guest leaves a bad review or low survey score, Jack should **automatically trigger a recovery workflow** to win them back. This includes detection, staff notification, outreach, and tracking.

---

## What You Can Test

After completing this phase, test these scenarios:

### 1. Low Survey Score Triggers Recovery
```
Guest completes post-stay survey with NPS 4 (detractor)
Expected:
- Recovery case created automatically
- Manager notified: "John Smith (Room 412) rated 4/10"
- Recovery workflow started
- Dashboard shows new recovery case
```

### 2. Bad Review Detected
```
New Google review: 2 stars, mentions "AC was broken all night"
Expected:
- Review matched to guest stay
- Recovery case created (or linked to existing)
- Suggested response drafted
- Staff can approve/edit response
```

### 3. Recovery Outreach
```
Staff clicks "Send Recovery Offer" on case
Expected:
- Personalized email sent to guest
- Offer tracked (e.g., 20% off next stay)
- Case status updated to "Outreach Sent"
```

### 4. Track Recovery Success
```
Guest books return stay using recovery offer
Expected:
- Case marked "Recovered"
- Analytics show recovery success
```

### 5. Dashboard Recovery View
Dashboard → Recovery:
- List of active recovery cases
- Filter by status: Open, Outreach Sent, Recovered, Lost
- Recovery rate metrics

---

## Tasks

### Create Recovery Engine Module

- [ ] Create `src/core/recovery-engine.ts`:
  ```typescript
  export class RecoveryEngine {
    detectTrigger(event: RecoveryTrigger): Promise<RecoveryCase | null>;
    createCase(trigger: RecoveryTrigger, guest: Guest): Promise<RecoveryCase>;
    suggestActions(recoveryCase: RecoveryCase): Promise<RecoveryAction[]>;
    executeAction(caseId: string, action: RecoveryAction): Promise<void>;
    trackOutcome(caseId: string, outcome: RecoveryOutcome): Promise<void>;
  }
  ```

- [ ] Define recovery types:
  ```typescript
  interface RecoveryTrigger {
    type: 'survey' | 'review' | 'complaint' | 'manual';
    source: string;           // 'nps_survey', 'google', 'tripadvisor', etc.
    score?: number;           // 1-10 for surveys
    rating?: number;          // 1-5 for reviews
    sentiment?: 'negative' | 'very_negative';
    guestId: string;
    reservationId?: string;
    content?: string;         // Review text or complaint
  }

  interface RecoveryCase {
    id: string;
    guestId: string;
    trigger: RecoveryTrigger;
    status: 'open' | 'outreach_sent' | 'responded' | 'recovered' | 'lost';
    assignedTo?: string;
    actions: RecoveryAction[];
    createdAt: Date;
    resolvedAt?: Date;
  }

  interface RecoveryAction {
    type: 'email' | 'call' | 'offer' | 'review_response';
    template?: string;
    offer?: RecoveryOffer;
    status: 'suggested' | 'approved' | 'sent' | 'completed';
  }

  interface RecoveryOffer {
    type: 'discount' | 'upgrade' | 'amenity' | 'points';
    value: number;
    description: string;
    validUntil: Date;
    code?: string;
  }
  ```

### Database Changes

- [ ] Create `recovery_cases` table:
  ```sql
  CREATE TABLE recovery_cases (
    id TEXT PRIMARY KEY,
    guest_id TEXT NOT NULL REFERENCES guests(id),
    reservation_id TEXT REFERENCES reservations(id),
    trigger_type TEXT NOT NULL,
    trigger_source TEXT,
    trigger_score INTEGER,
    trigger_content TEXT,
    status TEXT DEFAULT 'open',
    assigned_to TEXT REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
  );
  ```

- [ ] Create `recovery_actions` table:
  ```sql
  CREATE TABLE recovery_actions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES recovery_cases(id),
    type TEXT NOT NULL,
    template_id TEXT,
    offer_data JSONB,
    status TEXT DEFAULT 'suggested',
    executed_at TIMESTAMP,
    executed_by TEXT
  );
  ```

- [ ] Create migration: `migrations/XXXX_add_recovery_tables.ts`

### Trigger Detection

- [ ] Survey score handler:
  ```typescript
  // When survey completed with low score
  async function onSurveyCompleted(survey: SurveyResponse) {
    if (survey.nps <= 6) { // Detractor
      await recoveryEngine.detectTrigger({
        type: 'survey',
        source: 'nps_survey',
        score: survey.nps,
        guestId: survey.guestId,
        content: survey.feedback
      });
    }
  }
  ```

- [ ] Review detection hook (for future reputation extension):
  ```typescript
  interface ReputationExtension {
    onReviewDetected(review: Review): void;
  }
  ```

- [ ] Complaint escalation trigger:
  ```typescript
  // When conversation escalated due to complaint
  async function onEscalation(conversation: Conversation) {
    if (conversation.escalationReason === 'complaint') {
      await recoveryEngine.detectTrigger({
        type: 'complaint',
        source: 'conversation',
        sentiment: conversation.sentiment,
        guestId: conversation.guestId
      });
    }
  }
  ```

### Recovery Actions

- [ ] Create email templates:
  - `recovery-apology.html` - Apology with offer
  - `recovery-followup.html` - Check-in after outreach
  - `recovery-thankyou.html` - After successful recovery

- [ ] Create offer generation:
  ```typescript
  function generateOffer(trigger: RecoveryTrigger, guest: Guest): RecoveryOffer {
    // Base offer on severity and guest value
    if (trigger.score <= 4 || trigger.rating === 1) {
      return { type: 'discount', value: 25, description: '25% off next stay' };
    }
    if (guest.lifetimeValue > 5000) {
      return { type: 'upgrade', value: 1, description: 'Complimentary suite upgrade' };
    }
    return { type: 'discount', value: 15, description: '15% off next stay' };
  }
  ```

### Integrate with Automation Engine

- [ ] Add recovery automation rules:
  ```typescript
  const recoveryAutomations: AutomationRule[] = [
    {
      id: 'auto-recovery-low-nps',
      trigger: { type: 'survey_completed', condition: 'nps <= 6' },
      actions: [
        { type: 'create_recovery_case' },
        { type: 'notify_manager' },
        { type: 'suggest_recovery_actions' }
      ]
    },
    {
      id: 'recovery-followup',
      trigger: { type: 'recovery_outreach_sent', delayDays: 3 },
      actions: [
        { type: 'send_followup_email' }
      ]
    }
  ];
  ```

---

## Dashboard UI

### Recovery Cases Page

**Location:** Dashboard → Recovery (new menu item)

```
┌─────────────────────────────────────────────────────────────┐
│ Recovery Cases                                    [+ Manual]│
├─────────────────────────────────────────────────────────────┤
│ Filter: [All ▼] [Open ▼] [This Week ▼]                      │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 John Smith - NPS 4                         2 hours ago│
│ │ Room 412 | Stayed Jan 15-18 | "AC was broken"           │
│ │ Status: Open | Assigned: Unassigned                      │
│ │ Suggested: Send apology email with 20% off               │
│ │ [Assign to Me] [View Details]                            │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 Jane Doe - Google Review 2★               1 day ago   │
│ │ Room 508 | Stayed Jan 10-12 | "Noisy room"              │
│ │ Status: Outreach Sent | Assigned: Mike                   │
│ │ Waiting for response                                     │
│ │ [View Details]                                           │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 Bob Wilson - NPS 5                         3 days ago │
│ │ Room 301 | Stayed Jan 5-7 | "Room service slow"         │
│ │ Status: Recovered | Booked return stay for March        │
│ │ [View Details]                                           │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Case Detail Page

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Cases                                              │
│                                                              │
│ Recovery Case: John Smith                                    │
│ Status: 🔴 Open                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TRIGGER                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Type: Post-Stay Survey                                   │ │
│ │ Score: NPS 4 (Detractor)                                │ │
│ │ Date: January 18, 2025                                  │ │
│ │ Feedback: "The AC in my room was broken the entire      │ │
│ │ stay. I called twice but it was never fixed."           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ GUEST INFO                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name: John Smith | Email: john@example.com              │ │
│ │ Phone: +1 555-1234 | Loyalty: Gold Member               │ │
│ │ Lifetime Value: $3,450 | Stays: 5                       │ │
│ │ Last Stay: Room 412, Jan 15-18 ($680)                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ SUGGESTED ACTIONS                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ Send apology email                                    │ │
│ │   Template: recovery-apology                            │ │
│ │   [Preview] [Send]                                      │ │
│ │                                                          │ │
│ │ ☐ Offer 25% discount on next stay                       │ │
│ │   Code: RECOVERY-JS-25 | Valid: 90 days                 │ │
│ │   [Include in Email]                                    │ │
│ │                                                          │ │
│ │ ☐ Manager phone call                                    │ │
│ │   [Mark as Completed]                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ TIMELINE                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Jan 18 14:32 - Case created (Auto: Low NPS)             │ │
│ │ Jan 18 14:32 - Manager notified                         │ │
│ │ Jan 18 14:35 - Assigned to Sarah                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Mark as Recovered] [Mark as Lost] [Close Case]             │
└─────────────────────────────────────────────────────────────┘
```

### Recovery Metrics Widget (Dashboard Home)

```
┌─────────────────────────────────────────────────────────────┐
│ Recovery Performance (Last 30 Days)                         │
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │   12    │ │    8    │ │    3    │ │   67%   │            │
│ │  Cases  │ │Recovered│ │  Lost   │ │  Rate   │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                              │
│ Revenue Saved: $2,340 (estimated from recovered bookings)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Technical Criteria

- [ ] `src/core/recovery-engine.ts` exists and exports RecoveryEngine
- [ ] `recovery_cases` and `recovery_actions` tables in database
- [ ] Low NPS survey triggers recovery case creation
- [ ] Complaint escalation triggers recovery case
- [ ] Recovery actions can be suggested and executed
- [ ] Email templates for recovery outreach
- [ ] All tests pass

### User-Facing Criteria

| Test | Expected Result |
|------|-----------------|
| Submit NPS 4 survey | Recovery case appears in dashboard |
| View recovery case | Shows guest info, trigger, suggested actions |
| Send recovery email | Email sent, action logged |
| Mark case recovered | Status updates, metrics reflect |
| Dashboard → Recovery | Shows all cases with filters |
| Recovery metrics widget | Shows rate and revenue saved |

---

## Test Cases

```typescript
describe('RecoveryEngine', () => {
  it('creates case for low NPS score', async () => {
    const trigger = {
      type: 'survey',
      score: 4,
      guestId: 'guest-123'
    };

    const recoveryCase = await engine.detectTrigger(trigger);

    expect(recoveryCase).not.toBeNull();
    expect(recoveryCase.status).toBe('open');
  });

  it('suggests appropriate offer based on severity', async () => {
    const recoveryCase = await createCase({ score: 2 });

    const actions = await engine.suggestActions(recoveryCase);

    const offerAction = actions.find(a => a.type === 'offer');
    expect(offerAction.offer.value).toBeGreaterThanOrEqual(20);
  });

  it('tracks recovery when guest books again', async () => {
    const recoveryCase = await createCase({ guestId: 'guest-123' });
    await engine.executeAction(recoveryCase.id, { type: 'email' });

    // Simulate guest booking with recovery code
    await onBooking({ guestId: 'guest-123', discountCode: 'RECOVERY-123' });

    const updated = await getCase(recoveryCase.id);
    expect(updated.status).toBe('recovered');
  });
});
```

---

## Files Changed

### New Files
```
src/core/recovery-engine.ts       # Recovery logic
src/core/types/recovery.ts        # Recovery types
src/db/schema/recovery.ts         # Database schema
migrations/XXXX_recovery.ts       # Migration
tests/core/recovery.test.ts       # Tests

templates/email/recovery-apology.html
templates/email/recovery-followup.html
templates/email/recovery-thankyou.html

apps/dashboard/src/pages/recovery/index.tsx      # Cases list
apps/dashboard/src/pages/recovery/[id].tsx       # Case detail
apps/dashboard/src/components/recovery-card.tsx  # Case card
apps/dashboard/src/components/recovery-metrics.tsx # Metrics widget
```

### Modified Files
```
src/core/escalation-engine.ts     # Trigger recovery on complaint
src/events/handlers.ts            # Survey completed handler
src/automation/rules.ts           # Recovery automations
apps/dashboard/src/App.tsx        # New routes
apps/dashboard/src/components/sidebar.tsx  # New menu item
apps/dashboard/src/pages/index.tsx # Recovery widget
```

---

## Future Enhancements (v1.2.0+)

- [ ] Reputation extension integration (Google, TripAdvisor)
- [ ] AI-drafted review responses
- [ ] A/B test recovery offers
- [ ] Predictive recovery (before bad review)
- [ ] Recovery workflow automation rules
- [ ] Multi-language templates

---

## Related

- [ADR-006: Extension Architecture](../03-architecture/decisions/006-extension-architecture.md) - Recovery Engine section
- [Phase 10.3: Extension Consolidation](phase-10-3-extension-consolidation.md) - Reputation extension hooks
- [Phase 10.4: Autonomy Settings](phase-10-4-autonomy-settings.md) - Autonomy for recovery actions
