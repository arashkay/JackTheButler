# Phase 13: Reservation Management

**Version:** 1.4.0
**Codename:** Bookings
**Focus:** Reservation dashboard and booking management
**Depends on:** Phase 12 (Guest Management)

---

## Goal

Build a **Reservation Dashboard** that gives staff visibility into today's activity (arrivals, departures, in-house guests) and allows them to browse and manage all reservations. This is essential context for every guest interaction.

---

## Why It Matters

When a guest messages *"I'm arriving early, is my room ready?"*, staff need to instantly:

1. See their reservation details
2. Check room assignment and status
3. View special requests
4. Know their check-in status

Without this view, staff must switch to the PMS system, breaking their workflow.

---

## Features

### 13.1 Today's Dashboard

| Feature | Description |
|---------|-------------|
| **Arrivals Today** | Count and list of guests arriving today |
| **Departures Today** | Count and list of guests departing today |
| **In-House** | Current occupancy count |
| **Pending Check-ins** | Arrivals not yet checked in |
| **Late Check-outs** | Guests past expected departure |

### 13.2 Reservation List

| Feature | Description |
|---------|-------------|
| **Reservation Table** | Searchable, sortable list |
| **Search** | Search by confirmation #, guest name, room |
| **Status Filter** | Confirmed, Checked-in, Checked-out, Cancelled, No-show |
| **Date Filter** | Filter by arrival/departure date range |
| **Columns** | Confirmation #, Guest, Room, Arrival, Departure, Status |

### 13.3 Reservation Detail

| Feature | Description |
|---------|-------------|
| **Booking Info** | Confirmation #, dates, room type, room number |
| **Guest Link** | Quick link to guest profile |
| **Status Timeline** | Estimated vs actual arrival/departure |
| **Rate Info** | Rate code, total rate, balance |
| **Special Requests** | Guest requests and notes |
| **Associated Tasks** | Tasks created for this reservation |
| **Conversations** | Messages related to this stay |

### 13.4 Quick Actions

| Feature | Description |
|---------|-------------|
| **View Guest** | Navigate to guest profile |
| **View Conversation** | See messages for this reservation |
| **Create Task** | Create a task linked to this reservation |

---

## UI Design

### Navigation

Add to sidebar under Guests:
```
Home
Inbox
Tasks
Approvals
Guests
Reservations  ← NEW
```

### Reservations Dashboard (`/reservations`)

```
┌─────────────────────────────────────────────────────────────┐
│ Reservations                                    [Refresh]   │
├─────────────────────────────────────────────────────────────┤
│                        Today's Activity                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ 🛬 Arrivals │ │ 🛫 Departures│ │ 🏨 In-House │ │ ⏳ Pending│
│  │     12      │ │      8      │ │     45      │ │    5    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [Search...              ] [Status ▼] [Dates: Jan 20-27 ▼]   │
├─────────────────────────────────────────────────────────────┤
│ Conf #    │ Guest        │ Room │ Arrival  │ Departure│ Status│
│───────────┼──────────────┼──────┼──────────┼──────────┼───────│
│ ABC123    │ John Smith   │ 405  │ Jan 20   │ Jan 23   │ ✓ In  │
│ DEF456    │ Jane Doe     │ 302  │ Jan 20   │ Jan 22   │ ○ Conf│
│ GHI789    │ Bob Wilson   │ 501  │ Jan 19   │ Jan 20   │ ✓ Out │
│ ...       │              │      │          │          │       │
└─────────────────────────────────────────────────────────────┘
```

### Reservation Detail Page (`/reservations/:id`)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Reservations                                      │
├─────────────────────────────────────────────────────────────┤
│ Reservation #ABC123                    Status: Checked In   │
│                                                             │
│ Guest: John Smith →                    Room: 405 (Deluxe)   │
├─────────────────────────────────────────────────────────────┤
│ [Details] [Timeline] [Requests] [Tasks] [Messages]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Booking Details              Timeline                      │
│  ┌──────────────────────┐    ┌────────────────────────────┐│
│  │ Arrival:  Jan 20     │    │ Estimated: 3:00 PM         ││
│  │ Departure: Jan 23    │    │ Actual:    2:45 PM ✓       ││
│  │ Nights:   3          │    │                            ││
│  │ Room Type: Deluxe    │    │ Checkout:  11:00 AM        ││
│  │ Rate: $299/night     │    │ (in 2 days)                ││
│  │ Total: $897          │    └────────────────────────────┘│
│  │ Balance: $0          │                                  │
│  └──────────────────────┘                                  │
│                                                             │
│  Special Requests                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • High floor requested                              │   │
│  │ • Extra pillows                                     │   │
│  │ • Late checkout if available                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Reservation List & CRUD

```
GET    /api/v1/reservations              # List reservations
GET    /api/v1/reservations/:id          # Get reservation detail
GET    /api/v1/reservations/today        # Today's activity summary
```

### Query Parameters for List

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search confirmation #, guest name |
| `status` | string | Filter by status |
| `arrivalFrom` | date | Arrival date range start |
| `arrivalTo` | date | Arrival date range end |
| `departureFrom` | date | Departure date range start |
| `departureTo` | date | Departure date range end |
| `roomNumber` | string | Filter by room |
| `guestId` | string | Filter by guest |
| `limit` | number | Pagination limit |
| `offset` | number | Pagination offset |

### Today's Activity Response

```json
{
  "arrivals": {
    "count": 12,
    "pending": 5,
    "checkedIn": 7
  },
  "departures": {
    "count": 8,
    "checkedOut": 6,
    "late": 2
  },
  "inHouse": 45,
  "occupancyRate": 75
}
```

---

## Files to Create

### API Routes

```
src/gateway/routes/reservations.ts    # Reservation API endpoints
```

### Dashboard Pages

```
apps/dashboard/src/pages/reservations/
├── index.ts                          # Exports
├── Reservations.tsx                  # Reservation list with today's dashboard
└── ReservationDetail.tsx             # Reservation detail page
```

### Components

```
apps/dashboard/src/components/
├── TodayStats.tsx                    # Today's activity cards
├── ReservationCard.tsx               # Reservation summary card
└── StatusBadge.tsx                   # Reservation status badge
```

---

## Files to Modify

### Navigation

```
apps/dashboard/src/components/layout/Layout.tsx
  - Add "Reservations" to main navigation items
```

### Routes

```
apps/dashboard/src/App.tsx
  - Add /reservations route
  - Add /reservations/:id route
```

---

## Implementation Order

1. **API**: Create `reservations.ts` routes with list, get, today endpoints
2. **Today's Dashboard**: Build stats cards component
3. **Reservation List**: Build table with filters
4. **Reservation Detail**: Build detail page with tabs
5. **Navigation**: Add to sidebar
6. **Links**: Connect to Guest profiles

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Today's view load time | < 2 seconds |
| Reservation lookup | < 3 seconds by any field |
| Context switching | Zero - all info in one place |

---

## Future Enhancements

| Feature | Description |
|---------|-------------|
| **Room Blocking** | Visual room availability grid |
| **PMS Sync Status** | Show last sync time, manual refresh |
| **Check-in Actions** | Trigger check-in from dashboard (if PMS supports) |
| **Upsell Tracking** | Track upgrade offers and conversions |

---

## Related Documents

- [Phase 12: Guest Management](phase-12-guests.md)
- [Database Schema](../../src/db/schema.ts) - reservations table
