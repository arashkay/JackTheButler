# Phase 7: Integration

**Version:** 0.8.0
**Codename:** Integration
**Goal:** PMS sync and guest profile enrichment

---

## Overview

Phase 7 connects Jack to hotel operations. After this phase:

1. Guest data synced from PMS
2. Reservations linked to conversations
3. Room numbers available for context
4. Guest preferences from PMS
5. **AI knows who the guest is and their stay details**

---

## Prerequisites

- Phase 6 complete (Dashboard working)
- PMS API credentials (Mews, Opera, Cloudbeds, or similar)

---

## Deliverables

### 0.8.0-alpha.1: PMS Adapter Interface

**Files to create:**

```
src/integrations/
├── index.ts                  # Integration exports
├── types.ts                  # Common integration types
└── pms/
    ├── index.ts              # PMS adapter factory
    ├── types.ts              # PMS data types
    ├── adapter.ts            # Base adapter interface
    └── providers/
        ├── mews.ts           # Mews adapter
        ├── cloudbeds.ts      # Cloudbeds adapter
        └── mock.ts           # Mock adapter for testing
```

**PMS adapter interface:**

```typescript
// src/integrations/pms/adapter.ts
export interface PMSAdapter {
  readonly provider: string;

  // Reservations
  getReservations(params: ReservationQuery): Promise<Reservation[]>;
  getReservation(id: string): Promise<Reservation | null>;

  // Guests
  getGuest(id: string): Promise<PMSGuest | null>;
  searchGuests(query: string): Promise<PMSGuest[]>;

  // Room status
  getRoomStatus(roomNumber: string): Promise<RoomStatus>;

  // Webhooks (if supported)
  handleWebhook?(payload: unknown): Promise<WebhookResult>;
}
```

**Mock adapter for development:**

```typescript
// src/integrations/pms/providers/mock.ts
export class MockPMSAdapter implements PMSAdapter {
  readonly provider = 'mock';

  private reservations = new Map<string, Reservation>();
  private guests = new Map<string, PMSGuest>();

  async getReservations(params: ReservationQuery): Promise<Reservation[]> {
    return Array.from(this.reservations.values())
      .filter(r => {
        if (params.arrivalFrom && r.arrivalDate < params.arrivalFrom) return false;
        if (params.arrivalTo && r.arrivalDate > params.arrivalTo) return false;
        return true;
      });
  }

  // Seed with test data
  seed(data: { reservations: Reservation[]; guests: PMSGuest[] }) {
    data.reservations.forEach(r => this.reservations.set(r.id, r));
    data.guests.forEach(g => this.guests.set(g.id, g));
  }
}
```

**Acceptance criteria:**
- [ ] Adapter interface defined
- [ ] Mock adapter works for testing
- [ ] At least one real adapter (Mews or Cloudbeds)
- [ ] Adapter selected by config

---

### 0.8.0-alpha.2: Sync Service

**Files to create:**

```
src/services/
└── pms-sync.ts               # PMS synchronization service
src/jobs/
├── index.ts                  # Job scheduler
└── pms-sync-job.ts           # Periodic sync job
```

**Sync service:**

```typescript
// src/services/pms-sync.ts
export class PMSSyncService {
  constructor(
    private pmsAdapter: PMSAdapter,
    private guestService: GuestService,
    private reservationService: ReservationService
  ) {}

  async syncReservations(since?: Date): Promise<SyncResult> {
    const log = createLogger('pms-sync');
    const result: SyncResult = { created: 0, updated: 0, errors: 0 };

    // 1. Get reservations from PMS
    const pmsReservations = await this.pmsAdapter.getReservations({
      modifiedSince: since || new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    log.info({ count: pmsReservations.length }, 'Fetched PMS reservations');

    // 2. Process each reservation
    for (const pmsRes of pmsReservations) {
      try {
        // Upsert guest
        const guest = await this.guestService.upsertFromPMS(pmsRes.guest);

        // Upsert reservation
        const existing = await this.reservationService.findByConfirmation(
          pmsRes.confirmationNumber
        );

        if (existing) {
          await this.reservationService.updateFromPMS(existing.id, pmsRes);
          result.updated++;
        } else {
          await this.reservationService.createFromPMS(pmsRes, guest.id);
          result.created++;
        }
      } catch (err) {
        log.error({ err, reservation: pmsRes.confirmationNumber }, 'Sync error');
        result.errors++;
      }
    }

    return result;
  }
}
```

**Periodic sync job:**

```typescript
// src/jobs/pms-sync-job.ts
export function startPMSSyncJob(syncService: PMSSyncService) {
  const log = createLogger('pms-sync-job');
  let lastSync = new Date();

  setInterval(async () => {
    log.info('Starting PMS sync');
    const result = await syncService.syncReservations(lastSync);
    log.info(result, 'PMS sync complete');
    lastSync = new Date();
  }, 5 * 60 * 1000); // Every 5 minutes
}
```

**Acceptance criteria:**
- [ ] Reservations sync from PMS
- [ ] Guests created/updated from PMS data
- [ ] Sync runs periodically
- [ ] Errors don't crash the job

---

### 0.8.0-alpha.3: Guest Matching

**Enhance guest identification:**

```typescript
// src/services/guest.ts
export class GuestService {
  async matchWithReservation(
    channelId: string,
    channel: ChannelType
  ): Promise<{ guest: Guest; reservation?: Reservation } | null> {

    // 1. Find guest by phone
    const guest = await this.findByPhone(channelId);
    if (!guest) return null;

    // 2. Find active/upcoming reservation
    const reservation = await this.reservationService.findActiveForGuest(guest.id);

    // 3. Enrich guest with PMS data if reservation found
    if (reservation?.externalId) {
      const pmsGuest = await this.pmsAdapter.getGuest(reservation.externalGuestId);
      if (pmsGuest) {
        await this.enrichFromPMS(guest.id, pmsGuest);
      }
    }

    return { guest, reservation };
  }
}
```

**Use in message processor:**

```typescript
// In MessageProcessor
async process(inbound: InboundMessage): Promise<OutboundMessage> {
  // Match guest and reservation
  const match = await this.guestService.matchWithReservation(
    inbound.channelId,
    inbound.channel
  );

  const conversation = await this.conversationService.findOrCreate(
    inbound.channel,
    inbound.channelId,
    match?.guest.id,
    match?.reservation?.id  // Link reservation
  );

  // Include context in AI prompt
  const context = {
    guest: match?.guest,
    reservation: match?.reservation,
    roomNumber: match?.reservation?.roomNumber,
  };

  // ... generate response with context
}
```

**Acceptance criteria:**
- [ ] Guests matched to reservations
- [ ] Room number available in context
- [ ] Guest preferences available
- [ ] AI responses use guest context

---

### 0.8.0-alpha.4: Context-Aware Responses

**Enhance AI prompts with context:**

```typescript
// src/ai/prompts/system.ts
export function buildSystemPrompt(context: ConversationContext): string {
  let prompt = BUTLER_BASE_PROMPT;

  if (context.guest) {
    prompt += `\n\n## Guest Information
- Name: ${context.guest.firstName} ${context.guest.lastName}
- Language: ${context.guest.language || 'English'}
- Loyalty Tier: ${context.guest.loyaltyTier || 'Standard'}
`;
  }

  if (context.reservation) {
    prompt += `\n## Current Stay
- Room: ${context.reservation.roomNumber || 'Not assigned'}
- Check-in: ${context.reservation.arrivalDate}
- Check-out: ${context.reservation.departureDate}
- Room Type: ${context.reservation.roomType}
`;
  }

  if (context.guest?.preferences?.length) {
    prompt += `\n## Guest Preferences
${context.guest.preferences.map(p => `- ${p.category}: ${p.value}`).join('\n')}
`;
  }

  return prompt;
}
```

**Acceptance criteria:**
- [ ] AI knows guest name
- [ ] AI knows room number
- [ ] AI knows check-in/out dates
- [ ] Responses personalized

---

### 0.8.0-alpha.5: Dashboard Guest View

**Add guest information to dashboard:**

```typescript
// apps/dashboard/src/components/GuestPanel.tsx
export function GuestPanel({ guestId }: { guestId: string }) {
  const { data: guest } = useQuery({
    queryKey: ['guests', guestId],
    queryFn: () => api.get(`/guests/${guestId}`).then(r => r.data),
  });

  const { data: reservations } = useQuery({
    queryKey: ['guests', guestId, 'reservations'],
    queryFn: () => api.get(`/guests/${guestId}/reservations`).then(r => r.data),
  });

  return (
    <aside className="w-72 border-l p-4">
      <h3 className="font-semibold">{guest?.firstName} {guest?.lastName}</h3>

      {reservations?.[0] && (
        <div className="mt-4">
          <h4 className="text-sm font-medium">Current Stay</h4>
          <dl className="text-sm">
            <dt>Room</dt>
            <dd>{reservations[0].roomNumber}</dd>
            <dt>Check-out</dt>
            <dd>{formatDate(reservations[0].departureDate)}</dd>
          </dl>
        </div>
      )}

      {guest?.preferences?.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium">Preferences</h4>
          <ul className="text-sm">
            {guest.preferences.map(p => (
              <li key={p.key}>{p.category}: {p.value}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
```

**Acceptance criteria:**
- [ ] Guest info visible in conversation view
- [ ] Reservation details shown
- [ ] Preferences displayed
- [ ] Staff has full context

---

## Testing Checkpoint

### Manual Tests

1. Seed PMS with test reservation
2. Run sync job
3. Verify guest/reservation in database
4. Send WhatsApp message from test phone
5. Verify conversation linked to reservation
6. Check AI response uses guest name/room
7. View guest panel in dashboard

### Stakeholder Demo

**Demo script:**
1. Show PMS with test reservation
2. Show sync job running
3. Send WhatsApp message
4. "Hi, I'd like late checkout" → AI responds with room number
5. Show dashboard with guest context
6. Show AI using guest preferences

**Key message:** "Jack now knows who guests are and their stay details."

---

## Exit Criteria

Phase 7 is complete when:

1. **PMS data syncs** periodically
2. **Guests matched** to reservations
3. **Room numbers** in conversation context
4. **AI uses** guest information
5. **Dashboard shows** guest details

---

## Dependencies

**Add to package.json (varies by PMS):**

```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

---

## Next Phase

After Phase 7, proceed to [Phase 8: Polish](phase-8-polish.md) for multi-channel and automation.

---

## Checklist for Claude Code

```markdown
## Phase 7 Implementation Checklist

### 0.8.0-alpha.1: PMS Adapter
- [ ] Create src/integrations/pms/adapter.ts
- [ ] Create mock adapter
- [ ] Create at least one real adapter
- [ ] Add PMS config options
- [ ] Verify: Can fetch reservations

### 0.8.0-alpha.2: Sync Service
- [ ] Create src/services/pms-sync.ts
- [ ] Implement reservation sync
- [ ] Implement guest upsert
- [ ] Create sync job
- [ ] Verify: Periodic sync works

### 0.8.0-alpha.3: Guest Matching
- [ ] Implement matchWithReservation
- [ ] Link conversations to reservations
- [ ] Pass context to AI
- [ ] Verify: Conversations have reservation

### 0.8.0-alpha.4: Context-Aware AI
- [ ] Update system prompt builder
- [ ] Include guest name
- [ ] Include room number
- [ ] Include preferences
- [ ] Verify: AI uses context

### 0.8.0-alpha.5: Dashboard Updates
- [ ] Create GuestPanel component
- [ ] Show reservation details
- [ ] Show preferences
- [ ] Verify: Staff sees full context

### Phase 7 Complete
- [ ] All checks above pass
- [ ] AI knows guest name and room
- [ ] Commit: "Phase 7: PMS integration complete"
- [ ] Tag: v0.8.0
```
