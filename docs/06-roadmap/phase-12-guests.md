# Phase 12: Guest Management

**Version:** 1.3.0
**Codename:** Profiles
**Focus:** Guest directory and profile management
**Depends on:** Phase 11 (Tools)

---

## Goal

Build a **Guest Management** interface that allows staff to view, search, and manage guest profiles. This enables personalized service by giving staff instant access to guest history, preferences, and VIP status.

---

## Why It Matters

When Jack (AI) or staff interact with a guest, they need instant context:

> *"This is a VIP, 12th stay, prefers high floor, feather pillows, and had a noise complaint last time."*

Without guest profiles visible in the dashboard, staff operate blind. This phase surfaces all guest data for better service.

---

## Features

### 12.1 Guest List Page

| Feature | Description |
|---------|-------------|
| **Guest Table** | Searchable, sortable list of all guests |
| **Search** | Search by name, email, phone |
| **Quick Filters** | Filter by VIP status, loyalty tier, tags |
| **Columns** | Name, email, phone, VIP, loyalty tier, stay count, last stay |
| **Pagination** | Handle large guest databases |
| **Export** | Export filtered list to CSV |

### 12.2 Guest Profile Page

| Feature | Description |
|---------|-------------|
| **Profile Header** | Name, VIP badge, loyalty tier, photo placeholder |
| **Contact Info** | Email, phone, language preference |
| **Stay Statistics** | Total stays, total revenue, last stay date |
| **Preferences** | View/edit guest preferences (JSON array made editable) |
| **Notes** | Staff notes about the guest |
| **Tags** | Categorization tags (e.g., "business traveler", "family") |

### 12.3 Guest History

| Feature | Description |
|---------|-------------|
| **Reservation History** | List of past and upcoming reservations |
| **Conversation History** | Link to all conversations with this guest |
| **Task History** | Tasks created for this guest |

### 12.4 Guest Actions

| Feature | Description |
|---------|-------------|
| **Add Guest** | Manually create a new guest profile |
| **Edit Guest** | Update guest information |
| **Merge Guests** | Combine duplicate profiles (future) |
| **Archive Guest** | Soft-delete inactive guests (future) |

---

## UI Design

### Navigation

Add to sidebar under main navigation:
```
Home
Inbox
Tasks
Approvals
Guests        ← NEW
```

### Guest List Page (`/guests`)

```
┌─────────────────────────────────────────────────────────────┐
│ Guests                                        [+ Add Guest] │
├─────────────────────────────────────────────────────────────┤
│ [Search...                    ]  [VIP ▼] [Loyalty ▼] [Tags] │
├─────────────────────────────────────────────────────────────┤
│ Stats: 1,234 guests | 45 VIP | 230 repeat guests            │
├─────────────────────────────────────────────────────────────┤
│ Name          │ Email           │ VIP │ Stays │ Last Stay   │
│───────────────┼─────────────────┼─────┼───────┼─────────────│
│ John Smith    │ john@email.com  │ ⭐  │ 12    │ Jan 15, 2025│
│ Jane Doe      │ jane@email.com  │     │ 3     │ Dec 20, 2024│
│ ...           │                 │     │       │             │
└─────────────────────────────────────────────────────────────┘
```

### Guest Profile Page (`/guests/:id`)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Guests                                            │
├─────────────────────────────────────────────────────────────┤
│ ┌─────┐  John Smith                           [Edit] [···]  │
│ │     │  ⭐ VIP  •  Gold Member  •  English                  │
│ └─────┘  john@email.com  •  +1 555-123-4567                 │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Reservations] [Conversations] [Tasks]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stay Statistics          Preferences                       │
│  ┌──────────────────┐     ┌────────────────────────────┐   │
│  │ 12 total stays   │     │ • High floor preferred     │   │
│  │ $15,420 revenue  │     │ • Feather pillows          │   │
│  │ Last: Jan 15     │     │ • Late checkout when avail │   │
│  └──────────────────┘     └────────────────────────────┘   │
│                                                             │
│  Notes                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Regular business traveler. Had noise complaint in    │   │
│  │ room 405 - avoid that room in future.               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tags: [business] [frequent] [noise-sensitive]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Guest List & CRUD

```
GET    /api/v1/guests              # List guests (with filters)
GET    /api/v1/guests/:id          # Get guest profile
POST   /api/v1/guests              # Create guest
PUT    /api/v1/guests/:id          # Update guest
DELETE /api/v1/guests/:id          # Archive guest
```

### Query Parameters for List

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search name, email, phone |
| `vipStatus` | string | Filter by VIP status |
| `loyaltyTier` | string | Filter by loyalty tier |
| `tags` | string[] | Filter by tags |
| `limit` | number | Pagination limit |
| `offset` | number | Pagination offset |
| `sort` | string | Sort field (name, lastStay, stayCount) |
| `order` | string | Sort order (asc, desc) |

### Guest Statistics

```
GET /api/v1/guests/stats           # Aggregate stats
```

Returns:
```json
{
  "total": 1234,
  "vip": 45,
  "repeatGuests": 230,
  "newThisMonth": 67
}
```

---

## Files to Create

### API Routes

```
src/gateway/routes/guests.ts       # Guest API endpoints
```

### Dashboard Pages

```
apps/dashboard/src/pages/guests/
├── index.ts                       # Exports
├── Guests.tsx                     # Guest list page
├── GuestProfile.tsx               # Guest detail page
└── GuestForm.tsx                  # Add/edit form (modal or page)
```

### Components

```
apps/dashboard/src/components/
├── GuestCard.tsx                  # Guest summary card
├── GuestStats.tsx                 # Stats bar for guest list
└── PreferencesEditor.tsx          # Edit preferences UI
```

---

## Files to Modify

### Navigation

```
apps/dashboard/src/components/layout/Layout.tsx
  - Add "Guests" to main navigation items
```

### Routes

```
apps/dashboard/src/App.tsx
  - Add /guests route
  - Add /guests/:id route
```

---

## Implementation Order

1. **API**: Create `guests.ts` routes with list, get, create, update endpoints
2. **Guest List**: Build `Guests.tsx` with table, search, filters
3. **Guest Profile**: Build `GuestProfile.tsx` with tabs
4. **Guest Form**: Build add/edit functionality
5. **Navigation**: Add to sidebar
6. **Stats**: Add guest statistics bar

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Guest lookup time | < 3 seconds to find any guest |
| Profile completeness | All guest data visible on one page |
| Edit capability | Staff can update preferences and notes |

---

## Related Documents

- [Phase 13: Reservations](phase-13-reservations.md)
- [Database Schema](../../src/db/schema.ts) - guests table
