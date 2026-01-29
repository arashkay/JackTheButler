# ADR-006: Extension Architecture

## Status

Proposed

## Vision: Progressive Autonomy

Jack's goal is to **progressively automate hotel operations**, moving from assisted to fully autonomous handling of guest requests. Over time, Jack should replace most repetitive staff tasks, allowing humans to focus on complex situations and high-touch guest interactions.

### Autonomy Levels

| Level | Name | Description | Staff Role | Example |
|-------|------|-------------|------------|---------|
| **L0** | Manual | Jack notifies, staff executes | Staff does everything | "New message from guest" → Staff reads and responds |
| **L1** | Assisted | Jack drafts, staff approves | Staff reviews and clicks send | Jack drafts response → Staff approves → Sent |
| **L2** | Supervised | Jack executes, staff monitors | Staff reviews after the fact | Jack responds automatically, staff reviews daily log |
| **L3** | Autonomous | Jack handles end-to-end | Staff handles exceptions only | Jack responds, creates task, tracks completion, follows up |
| **L4** | Proactive | Jack anticipates needs | Staff sets policies | Jack notices pattern, takes preventive action before guest asks |

### Target Autonomy

| Version | Target Level | Description |
|---------|--------------|-------------|
| **v1.0** | **L2 - Supervised** | Jack handles routine requests automatically. Staff monitors logs and handles escalations. |
| **v2.0** | **L3 - Autonomous** | Jack handles end-to-end including task tracking, follow-ups, and recovery. Staff handles exceptions. |
| **Future** | **L4 - Proactive** | Jack anticipates guest needs, prevents issues, optimizes operations. Staff sets policies. |

### Autonomy by Use Case

| Use Case | v1.0 (L2) | Future (L3/L4) | Enabler |
|----------|-----------|----------------|---------|
| Answer FAQ (wifi, hours, amenities) | ✅ Auto | ✅ Auto | Knowledge base |
| Housekeeping request (towels, cleaning) | ✅ Auto-create task | ✅ Auto + track completion | Housekeeping integration |
| Room temperature complaint | ⚠️ Create maintenance task | ✅ Auto-adjust + verify | IoT integration |
| Restaurant reservation | ⚠️ Create task for staff | ✅ Auto-book + confirm | F&B reservation integration |
| Book spa appointment | ⚠️ Create task for staff | ✅ Auto-book + confirm | Spa integration |
| Order room service | ⚠️ Forward to kitchen | ✅ Auto-order + track | POS integration |
| Handle complaint | ⚠️ Escalate to staff | ✅ Auto-resolve + follow-up | Sentiment + rules |
| Billing dispute | ❌ Escalate always | ⚠️ Auto-investigate, staff approves | PMS + approval workflow |
| Issue refund/compensation | ❌ Staff only | ⚠️ Auto within limits, staff approves above | Configurable limits |
| Post-stay review recovery | ❌ Staff drafts | ✅ Auto-draft + send offers | Reputation + Marketing |

Legend: ✅ Autonomous | ⚠️ Supervised/Partial | ❌ Manual/Escalate

### Configurable Approval Settings

Hotels can configure which actions require approval in settings:

```typescript
// Example: Hotel-configurable autonomy settings
interface AutonomySettings {
  // Global default level
  defaultLevel: 'L1' | 'L2' | 'L3';

  // Per-action overrides
  actions: {
    // Financial actions
    issueRefund: {
      level: 'L1',                    // Always require approval
      maxAutoAmount: 0,               // Or: auto-approve up to $X
    },
    offerDiscount: {
      level: 'L2',
      maxAutoPercent: 10,             // Auto-approve up to 10% discount
    },

    // Service actions
    housekeepingRequest: { level: 'L3' },    // Fully autonomous
    maintenanceRequest: { level: 'L2' },     // Auto-create, staff monitors
    roomUpgrade: { level: 'L1' },            // Staff approves

    // Communication actions
    respondToGuest: { level: 'L2' },         // Auto-respond, staff monitors
    sendMarketingOffer: { level: 'L1' },     // Staff approves
    postReviewResponse: { level: 'L1' },     // Staff approves public responses
  },

  // VIP overrides (more cautious with VIPs)
  vipOverrides: {
    escalateComplaints: true,
    requireApprovalForOffers: true,
  },

  // Confidence thresholds
  confidenceThresholds: {
    autoExecute: 0.9,      // >= 90% confidence: auto-execute
    suggestToStaff: 0.7,   // 70-90%: suggest to staff
    escalate: 0.7,         // < 70%: escalate for human decision
  },
}
```

### What Enables Higher Autonomy?

| Requirement | Why It Matters | v1.0 | Future |
|-------------|----------------|------|--------|
| **More integrations** | Can't auto-book spa if not connected | Basic | Full ecosystem |
| **Richer guest context** | Better decisions with full history | PMS only | PMS + CRM + history |
| **Confidence scoring** | Know when to act vs. ask | Basic | ML-enhanced |
| **Approval workflows** | Staff approves high-risk actions | Simple queue | Tiered approvals |
| **Feedback loops** | Learn from staff corrections | Logging | Active learning |
| **Audit trails** | Accountability for actions | Full logging | Analytics + insights |

---

## Context

Jack The Butler needs to integrate with the full hotel technology ecosystem to serve guests and staff effectively. Currently we support:
- **AI Providers**: Anthropic, OpenAI, Ollama
- **Channels**: WhatsApp, SMS, Email, WebChat
- **PMS**: Mews, Opera, Cloudbeds (+ mock)

But hotels need many more integrations to handle the complete guest journey.

---

## Extension Categories

### Complete Integration Map

| Priority | Category | Purpose | Sample Providers | Business Impact |
|----------|----------|---------|------------------|-----------------|
| **P0** | **AI** | Response generation, intent classification | Anthropic, OpenAI, Ollama, Google Gemini | Core functionality - system doesn't work without it |
| **P0** | **Channels** | Guest communication | WhatsApp, SMS (Twilio), Email, WebChat, Telegram, Messenger | Core functionality - how guests reach us |
| **P0** | **PMS** | Guest profiles, reservations, room status | Mews, Opera Cloud, Cloudbeds, Protel, RoomRaccoon | Core functionality - guest context for personalization |
| **P1** | **Housekeeping** | Room cleaning, amenity requests, room status | Flexkeeping, Optii, Knowcross, Quore, Lodgistics | High volume - most common guest requests |
| **P1** | **Reputation** | Review monitoring, response management | Google Business, TripAdvisor, Booking.com, Expedia, Yelp | Revenue protection - bad reviews cost bookings |
| **P1** | **Surveys** | Guest feedback, NPS, issue detection | Medallia, TrustYou, Revinate, GuestRevu, Typeform | Proactive - catch issues before public reviews |
| **P2** | **POS** | Restaurant, bar, room charges | Lightspeed, Toast, Oracle MICROS, Infrasys, Square | Common requests - "charge to room", dining reservations |
| **P2** | **Maintenance** | Work orders, repairs, preventive maintenance | Quore, Flexkeeping, UpKeep, Fiix, MaintainX | Issue resolution - fix problems fast |
| **P2** | **Transport** | Rides, airport transfers, car rental | Uber for Business, Lyft, Blacklane, hotel fleet | Guest convenience - high-value service |
| **P2** | **CRM** | Guest history, preferences, segmentation | Revinate, Cendyn, Salesforce, HubSpot, Profitroom | Personalization - know your guest |
| **P2** | **Marketing** | Campaigns, offers, recovery outreach | Mailchimp, Klaviyo, ActiveCampaign, Revinate | Revenue - upsells, recovery, remarketing |
| **P2** | **Loyalty** | Points, tiers, rewards, offers | Custom, Loyalty Lion, Oracle Loyalty, stay[n]touch | Retention - repeat bookings |
| **P3** | **Experiences** | Tours, activities, local recommendations | Viator, GetYourGuide, Peek, FareHarbor, Rezdy | Concierge - enhance guest experience |
| **P3** | **Spa & Wellness** | Spa bookings, gym, fitness classes | Book4Time, SpaSoft, Zenoti, Mindbody, Booker | Upsell - revenue from amenities |
| **P3** | **F&B Reservations** | Restaurant table bookings | OpenTable, Resy, SevenRooms, Yelp Reservations | Convenience - on-site dining |
| **P3** | **Meetings & Events** | Meeting rooms, AV, catering | Cvent, Social Tables, EventBooking, Tripleseat | Group business - corporate clients |
| **P3** | **Payments** | Payment processing, invoicing | Stripe, Adyen, Worldpay, Square | Transactions - charges, refunds |
| **P4** | **IoT - Locks** | Mobile key, room access | ASSA ABLOY, Salto, Dormakaba, OpenKey, FLEXIPASS | Modern experience - keyless entry |
| **P4** | **IoT - Room Controls** | Temperature, lighting, curtains | Inncom, Crestron, Control4, Honeywell, Schneider | Guest comfort - room environment |
| **P4** | **IoT - Entertainment** | TV casting, streaming, content | Enseo, SONIFI, Google Cast, Apple AirPlay | In-room experience |
| **P4** | **Energy Management** | HVAC optimization, sustainability | Verdant, EcoStruxure, Honeywell, Schneider | Cost savings - energy efficiency |
| **P4** | **Access Control** | Staff areas, parking, elevators | Kisi, Brivo, OpenPath, SALTO | Security & operations |
| **P4** | **Digital Signage** | Welcome boards, wayfinding | Four Winds, Scala, Novisign | Guest experience - navigation |
| **P4** | **Lost & Found** | Track lost items | Bouncie, Chargerback, ReclaimHub | Service recovery |

### Priority Definitions

| Priority | Meaning | When to Implement |
|----------|---------|-------------------|
| **P0** | Core - system doesn't work without it | MVP, already done |
| **P1** | Critical - major business impact, high request volume | Phase 1 after launch |
| **P2** | Important - significant value, common use cases | Phase 2 |
| **P3** | Valuable - enhances experience, specific hotel types | Phase 3 |
| **P4** | Nice-to-have - advanced features, hardware-dependent | Future / on-demand |

---

## Use Cases by Guest Journey

### 1. Pre-Arrival (Booking → Check-in)

| Use Case | Guest/Staff Action | Integrations Used |
|----------|-------------------|-------------------|
| **Pre-arrival message** | Guest receives WhatsApp: "We're excited to welcome you tomorrow! Any special requests?" | Channels, PMS |
| **Room preference** | Guest replies: "Can I have a high floor away from elevator?" | Channels, PMS, CRM |
| **Early check-in request** | "Is early check-in available? My flight lands at 9am" | Channels, PMS, Housekeeping |
| **Transport booking** | "Can you arrange airport pickup?" | Channels, Transport |
| **Restaurant reservation** | "Please book dinner for 2 at 7pm on arrival day" | Channels, F&B Reservations |
| **Spa pre-booking** | "I'd like to book a massage for Saturday afternoon" | Channels, Spa |
| **VIP recognition** | Staff alerted: "Gold member arriving, upgrade if available" | PMS, CRM, Loyalty |

### 2. Arrival (Check-in Day)

| Use Case | Guest/Staff Action | Integrations Used |
|----------|-------------------|-------------------|
| **Mobile check-in** | Guest checks in via app, receives room number | PMS, IoT - Locks |
| **Digital key** | Room key sent to phone, no front desk needed | IoT - Locks, Channels |
| **Welcome message** | "Welcome! Your room 412 is ready. WiFi: HotelGuest / pass123" | Channels, PMS |
| **Upgrade offer** | "Suite available for $50 more tonight. Interested?" | Channels, PMS, Marketing |
| **Loyalty recognition** | "Welcome back Mr. Smith! As a Gold member, enjoy free breakfast" | PMS, Loyalty, CRM |
| **Wayfinding** | "How do I get to my room?" → Digital signage shows route | Channels, Digital Signage |

### 3. During Stay (Daily Requests)

| Use Case | Guest/Staff Action | Integrations Used |
|----------|-------------------|-------------------|
| **Extra towels** | "Can I get more towels?" → Task created for housekeeping | Channels, Housekeeping |
| **Room cleaning** | "Please clean my room now" → Room marked for service | Channels, Housekeeping, PMS |
| **Temperature complaint** | "Room is too cold" → Jack adjusts or creates maintenance task | Channels, IoT - Room Controls, Maintenance |
| **Broken AC** | "AC isn't working" → Urgent maintenance ticket created | Channels, Maintenance |
| **Room service order** | "I'd like to order a burger and fries" → Sent to kitchen | Channels, POS |
| **Restaurant booking** | "Book me a table for dinner tonight" | Channels, F&B Reservations |
| **Spa appointment** | "Any availability for massage tomorrow?" | Channels, Spa |
| **Local recommendations** | "Best pizza near the hotel?" | Channels, AI (knowledge base) |
| **Tour booking** | "I want to book the city tour for tomorrow" | Channels, Experiences |
| **Taxi request** | "I need a car to downtown in 30 minutes" | Channels, Transport |
| **Complaint escalation** | "I've asked 3 times for towels!" → Escalate to manager | Channels, AI, Housekeeping |
| **Charge inquiry** | "What's the $45 charge on my bill?" | Channels, PMS, POS |
| **Lost item report** | "I lost my sunglasses at the pool" | Channels, Lost & Found |
| **Event inquiry** | "Where is the Johnson wedding?" | Channels, Meetings & Events |
| **TV help** | "How do I cast Netflix to the TV?" | Channels, IoT - Entertainment |
| **WiFi issues** | "WiFi isn't working" → Troubleshoot or escalate | Channels, Maintenance |

### 4. Departure (Check-out Day)

| Use Case | Guest/Staff Action | Integrations Used |
|----------|-------------------|-------------------|
| **Late checkout request** | "Can I check out at 2pm?" | Channels, PMS, Housekeeping |
| **Express checkout** | "Check me out, email the receipt" | Channels, PMS, Payments |
| **Bill review** | "Can you send me the final bill?" | Channels, PMS |
| **Dispute charge** | "I didn't order that minibar item" | Channels, PMS, POS |
| **Feedback prompt** | "How was your stay? Any issues we should know about?" | Channels, Surveys |
| **Transport to airport** | "I need a taxi at 10am for the airport" | Channels, Transport |
| **Lost item (post-checkout)** | "I think I left my charger in the room" | Channels, Housekeeping, Lost & Found |

### 5. Post-Stay (After Checkout)

| Use Case | Guest/Staff Action | Integrations Used |
|----------|-------------------|-------------------|
| **Thank you message** | "Thank you for staying! We hope to see you again" | Channels, Marketing |
| **Feedback survey** | Guest receives NPS survey, rates 6/10 | Surveys, CRM |
| **Low score alert** | Staff notified: "John Doe rated 6/10 - AC issue mentioned" | Surveys, CRM |
| **Recovery outreach** | Manager sends personal apology + offer | Channels, Marketing, Loyalty |
| **Bad review detected** | Google review: 2 stars, mentions AC | Reputation |
| **Review response** | Jack drafts response, manager approves and posts | Reputation, AI |
| **Private recovery** | Email to guest: "We're sorry, here's 20% off next stay" | Channels, Marketing, Loyalty |
| **Review updated** | Guest updates to 4 stars after resolution | Reputation, CRM |
| **Loyalty enrollment** | "Join our loyalty program for exclusive benefits" | Channels, Loyalty, Marketing |
| **Remarketing** | 3 months later: "We miss you! Special rate for your return" | Marketing, CRM |
| **Anniversary offer** | 1 year later: "It's been a year! Come back with 25% off" | Marketing, CRM, Loyalty |

---

## Extension Folder Structure

```
extensions/
├── _shared/                       # Shared utilities
│   ├── types.ts                   # Common interfaces
│   └── testing.ts                 # Test helpers
│
├── ai/                            # P0 - AI Providers
│   ├── types.ts
│   ├── anthropic/
│   ├── openai/
│   ├── ollama/
│   └── google/
│
├── channels/                      # P0 - Communication
│   ├── types.ts
│   ├── whatsapp/
│   ├── sms/
│   ├── email/
│   ├── webchat/
│   ├── telegram/
│   └── messenger/
│
├── pms/                           # P0 - Property Management
│   ├── types.ts
│   ├── mews/
│   ├── opera/
│   ├── cloudbeds/
│   └── protel/
│
├── housekeeping/                  # P1 - Room Operations
│   ├── types.ts
│   ├── flexkeeping/
│   ├── optii/
│   └── knowcross/
│
├── reputation/                    # P1 - Review Management
│   ├── types.ts
│   ├── google-business/
│   ├── tripadvisor/
│   ├── booking/
│   └── expedia/
│
├── surveys/                       # P1 - Feedback
│   ├── types.ts
│   ├── medallia/
│   ├── trustyou/
│   └── typeform/
│
├── pos/                           # P2 - Point of Sale
│   ├── types.ts
│   ├── lightspeed/
│   ├── toast/
│   └── micros/
│
├── maintenance/                   # P2 - Work Orders
│   ├── types.ts
│   ├── quore/
│   └── upkeep/
│
├── transport/                     # P2 - Rides & Transfers
│   ├── types.ts
│   ├── uber/
│   └── blacklane/
│
├── crm/                           # P2 - Guest Intelligence
│   ├── types.ts
│   ├── revinate/
│   └── salesforce/
│
├── marketing/                     # P2 - Campaigns & Outreach
│   ├── types.ts
│   ├── mailchimp/
│   ├── klaviyo/
│   └── activecampaign/
│
├── loyalty/                       # P2 - Points & Rewards
│   ├── types.ts
│   ├── internal/                  # Built-in simple loyalty
│   └── oracle/
│
├── experiences/                   # P3 - Tours & Activities
│   ├── types.ts
│   ├── viator/
│   └── getyourguide/
│
├── spa/                           # P3 - Wellness
│   ├── types.ts
│   ├── book4time/
│   └── zenoti/
│
├── restaurants/                   # P3 - Dining Reservations
│   ├── types.ts
│   ├── opentable/
│   ├── resy/
│   └── sevenrooms/
│
├── events/                        # P3 - Meetings & Events
│   ├── types.ts
│   ├── cvent/
│   └── tripleseat/
│
├── payments/                      # P3 - Payment Processing
│   ├── types.ts
│   ├── stripe/
│   └── adyen/
│
├── iot/                           # P4 - Hardware Integrations
│   ├── locks/
│   │   ├── types.ts
│   │   ├── assa-abloy/
│   │   ├── salto/
│   │   └── dormakaba/
│   ├── room-controls/
│   │   ├── types.ts
│   │   ├── inncom/
│   │   └── crestron/
│   ├── entertainment/
│   │   ├── types.ts
│   │   ├── enseo/
│   │   └── sonifi/
│   └── energy/
│       ├── types.ts
│       └── verdant/
│
└── misc/                          # P4 - Other
    ├── lost-found/
    ├── signage/
    └── parking/
```

---

## Kernel vs Extensions Architecture

### The Core Principle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Extensions are ADAPTERS (how to talk to external systems)                 │
│   Core is the KERNEL (what should happen, regardless of which adapter)      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

Whether the hotel uses **Mews or Cloudbeds** → Jack's logic is the same
Whether the guest uses **WhatsApp or Email** → Jack's logic is the same
Whether AI is **Claude or OpenAI** → Jack's logic is the same

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JACK THE BUTLER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         CORE KERNEL                                  │   │
│  │                   (The Brain - Business Logic)                       │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Message    │  │ Conversation │  │     Task     │              │   │
│  │  │  Processor   │  │    State     │  │    Router    │              │   │
│  │  │              │  │   Machine    │  │              │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Escalation  │  │    Guest     │  │   Recovery   │              │   │
│  │  │    Engine    │  │   Context    │  │    Engine    │              │   │
│  │  │              │  │   Builder    │  │  (reviews)   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ calls                                  │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      EXTENSION MANAGER                               │   │
│  │              (Registry of all available adapters)                    │   │
│  │                                                                      │   │
│  │   channels.get('whatsapp')  →  WhatsAppAdapter                      │   │
│  │   ai.get('anthropic')       →  AnthropicProvider                    │   │
│  │   pms.get('mews')           →  MewsAdapter                          │   │
│  │   housekeeping.get('optii') →  OptiiAdapter                         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ uses                                   │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         EXTENSIONS                                   │   │
│  │                  (Adapters to external systems)                      │   │
│  │                                                                      │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Channel │ │   AI    │ │   PMS   │ │Housekpg │ │   POS   │  ...  │   │
│  │  │ Adapters│ │Providers│ │ Adapters│ │ Adapters│ │ Adapters│       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                            DATABASE                                         │
│         (Conversations, Messages, Tasks, Guests, Config)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Kernel Modules

The kernel contains **pure business logic** with no knowledge of specific integrations:

| Module | Responsibility | Code |
|--------|---------------|------|
| **MessageProcessor** | Orchestrates the full message flow (receive → understand → act → respond) | `core/message-processor.ts` |
| **ConversationStateMachine** | Manages conversation lifecycle: `new → active → waiting → escalated → resolved` | `core/conversation-fsm.ts` |
| **TaskRouter** | Maps intents to departments, creates and assigns tasks | `core/task-router.ts` |
| **EscalationEngine** | Decides when to involve humans (sentiment, VIP, repeated issues, explicit request) | `core/escalation-engine.ts` |
| **GuestContextBuilder** | Assembles complete guest profile from PMS, CRM, conversation history | `core/guest-context.ts` |
| **RecoveryEngine** | Handles post-stay review detection and recovery workflow | `core/recovery-engine.ts` |
| **AutomationEngine** | Triggers scheduled and event-based automations | `core/automation-engine.ts` |

### Kernel Code Example

```typescript
// src/core/message-processor.ts
// This code has NO knowledge of WhatsApp, Mews, Claude, etc.

export class MessageProcessor {
  constructor(
    private channels: ChannelManager,      // Abstract - could be any channel
    private ai: AIEngine,                  // Abstract - could be any AI
    private pms: PMSManager,               // Abstract - could be any PMS
    private conversations: ConversationService,
    private tasks: TaskService,
    private escalation: EscalationEngine,
  ) {}

  async handleIncomingMessage(channelId: string, rawPayload: unknown): Promise<void> {
    // 1. NORMALIZE - Channel adapter converts to standard format
    const channel = this.channels.get(channelId);
    const message = await channel.parseIncoming(rawPayload);

    // 2. IDENTIFY - Find or create guest & conversation
    const guest = await this.pms.findGuestByPhone(message.senderPhone);
    const conversation = await this.conversations.findOrCreate(guest, channelId);

    // 3. ENRICH - Add context (reservation, history, preferences)
    const context = await this.buildContext(guest, conversation);

    // 4. UNDERSTAND - AI classifies intent
    const intent = await this.ai.classifyIntent(message.text, context);

    // 5. DECIDE - What action to take?
    const action = this.decideAction(intent, context);

    // 6. EXECUTE - Perform the action
    await this.executeAction(action, context);

    // 7. RESPOND - Generate and send response
    const response = await this.ai.generateResponse(message, context, action);
    await channel.send(message.senderId, response);
  }

  private decideAction(intent: Intent, context: Context): Action {
    // THIS IS THE KERNEL LOGIC - same regardless of integrations

    switch (intent.category) {
      case 'housekeeping.request':
        return { type: 'CREATE_TASK', department: 'housekeeping', ... };

      case 'complaint':
        if (intent.sentiment === 'angry' || context.guest.isVIP) {
          return { type: 'ESCALATE', reason: 'negative_sentiment', ... };
        }
        return { type: 'CREATE_TASK', priority: 'high', ... };

      case 'billing.inquiry':
        return { type: 'FETCH_FOLIO', ... };

      case 'restaurant.reservation':
        return { type: 'BOOK_RESTAURANT', ... };

      default:
        return { type: 'AI_RESPONSE_ONLY' };
    }
  }
}
```

### Message Flow Example

Guest sends WhatsApp: "Can I get extra towels please?"

```
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 1. CHANNEL ADAPTER (WhatsApp)                                         │
│    - Receives webhook from Meta                                       │
│    - Verifies signature                                               │
│    - Converts to normalized Message { sender, text, channel, ... }    │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 2. MESSAGE PROCESSOR (Core Kernel)                                    │
│    - Finds guest by phone number (via PMS adapter)                    │
│    - Finds/creates conversation                                       │
│    - Loads context (room 412, checked in yesterday, gold member)      │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 3. AI ENGINE (via AI adapter - could be Claude, GPT, etc.)            │
│    - Classifies intent: housekeeping.amenity.towels                   │
│    - Extracts entities: { item: "towels", quantity: "extra" }         │
│    - Sentiment: neutral                                               │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 4. TASK ROUTER (Core Kernel)                                          │
│    - Intent → Department mapping: housekeeping.* → Housekeeping       │
│    - Priority: normal (not VIP complaint)                             │
│    - Creates task in database                                         │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 5. HOUSEKEEPING ADAPTER (if configured - e.g., Optii)                 │
│    - Syncs task to external housekeeping system                       │
│    - OR: Task stays in Jack's internal task list for staff dashboard  │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 6. AI ENGINE (response generation)                                    │
│    - Generates: "Of course! Extra towels will be delivered to         │
│      room 412 shortly. Is there anything else I can help with?"       │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 7. CHANNEL ADAPTER (WhatsApp)                                         │
│    - Converts response to WhatsApp format                             │
│    - Sends via Meta API                                               │
└───────────────────────────────────────────────────────────────────────┘
                │
                ▼
        Guest receives reply
```

### Graceful Degradation

The kernel works even with **minimal integrations**:

| Configuration | Behavior |
|---------------|----------|
| **No PMS configured** | Guest identified by phone only, no reservation context |
| **No Housekeeping system** | Tasks stored in Jack's database, staff uses Jack's dashboard |
| **No external AI** | Could fall back to rule-based responses (degraded mode) |
| **Only email channel** | Works the same, just slower response expectation |
| **No CRM** | Less personalization, but still functional |

The kernel **gracefully degrades** when extensions aren't available, always providing the best possible experience with available integrations.

### Final Folder Structure

```
src/
├── core/                          # THE KERNEL - Pure business logic
│   ├── message-processor.ts       # Main orchestrator
│   ├── conversation-fsm.ts        # State machine
│   ├── task-router.ts             # Intent → Department → Task
│   ├── escalation-engine.ts       # When to involve humans
│   ├── guest-context.ts           # Build guest profile
│   ├── recovery-engine.ts         # Post-stay review recovery
│   ├── automation-engine.ts       # Scheduled/event automations
│   └── interfaces/                # Abstract interfaces for extensions
│       ├── channel.ts             # ChannelAdapter interface
│       ├── ai.ts                  # AIProvider interface
│       ├── pms.ts                 # PMSAdapter interface
│       ├── housekeeping.ts        # HousekeepingAdapter interface
│       └── ...                    # Other extension interfaces
│
├── services/                      # State management (database operations)
│   ├── conversation.ts            # Conversation CRUD
│   ├── task.ts                    # Task CRUD
│   ├── guest.ts                   # Guest CRUD
│   ├── message.ts                 # Message CRUD
│   └── ...
│
├── extensions/                    # ADAPTERS - Talk to external systems
│   ├── manager.ts                 # Loads & manages all extensions
│   ├── ai/                        # AI providers
│   ├── channels/                  # Communication channels
│   ├── pms/                       # Property management systems
│   ├── housekeeping/              # Housekeeping systems
│   ├── pos/                       # Point of sale
│   ├── maintenance/               # Work order systems
│   ├── transport/                 # Rides & transfers
│   ├── crm/                       # Guest intelligence
│   ├── marketing/                 # Campaigns & outreach
│   ├── loyalty/                   # Points & rewards
│   ├── reputation/                # Review monitoring
│   ├── surveys/                   # Feedback collection
│   ├── experiences/               # Tours & activities
│   ├── spa/                       # Wellness bookings
│   ├── restaurants/               # Dining reservations
│   ├── events/                    # Meetings & events
│   ├── payments/                  # Payment processing
│   ├── iot/                       # Hardware (locks, room controls, etc.)
│   └── misc/                      # Other (lost & found, signage, etc.)
│
├── gateway/                       # HTTP server, webhooks, WebSocket
├── db/                            # Database schema, migrations
└── apps/
    └── dashboard/                 # Staff web UI
```

---

## Current Problems

1. **Code Duplication**: Channel logic split between two locations
   - `src/channels/` — adapter implementations
   - `src/integrations/` — config schemas and registry

2. **Monolithic Registry**: Adding a new integration requires editing `registry.ts` (600+ lines)

3. **No Clear Boundaries**: Core orchestration logic (`MessageProcessor`, `AIResponder`) is mixed with integration-specific code

4. **Testing Complexity**: Hard to test integrations in isolation

### Requirements

- Adding a new channel (e.g., Telegram) should not require changes to core code
- Each integration should be self-contained (code + config + routes + tests)
- Core logic (message flow, conversation state, task routing) stays stable
- Easy to enable/disable integrations per deployment

## Decision

Restructure the codebase into **Core** and **Extensions**:

```
src/
├── core/                          # Orchestration - rarely changes
│   ├── message-processor.ts       # receive → classify → respond → send
│   ├── conversation-fsm.ts        # State machine: new → active → escalated → resolved
│   ├── task-router.ts             # Routes tasks to departments
│   └── escalation-engine.ts       # Decides when to escalate
│
├── services/                      # Business logic services
│   ├── conversation.ts
│   ├── task.ts
│   ├── guest.ts
│   └── auth.ts
│
├── extensions/                    # All external integrations
│   ├── _shared/                   # Shared utilities for extensions
│   │   ├── types.ts               # Common interfaces
│   │   └── testing.ts             # Test helpers
│   │
│   ├── ai/
│   │   ├── types.ts               # AIProvider interface
│   │   ├── anthropic/
│   │   │   ├── provider.ts
│   │   │   └── manifest.ts        # { id, name, configSchema, ... }
│   │   ├── openai/
│   │   └── ollama/
│   │
│   ├── channels/
│   │   ├── types.ts               # ChannelAdapter interface
│   │   ├── whatsapp/
│   │   │   ├── adapter.ts         # Send/receive implementation
│   │   │   ├── webhook.ts         # Hono routes for /webhooks/whatsapp
│   │   │   ├── manifest.ts        # Config schema + metadata
│   │   │   └── whatsapp.test.ts   # Co-located tests
│   │   ├── sms/
│   │   ├── email/
│   │   └── webchat/
│   │
│   └── pms/
│       ├── types.ts               # PMSAdapter interface
│       ├── mews/
│       ├── opera/
│       └── cloudbeds/
│
├── gateway/                       # HTTP/WS server (loads extensions dynamically)
└── db/                            # Database layer
```

### Extension Manifest

Each extension exports a manifest describing itself:

```typescript
// extensions/channels/whatsapp/manifest.ts
import type { ChannelManifest } from '../types.js';

export const manifest: ChannelManifest = {
  id: 'whatsapp',
  name: 'WhatsApp Business',
  category: 'channel',

  // Provider options (for channels with multiple providers)
  providers: [
    {
      id: 'meta',
      name: 'Meta Business API',
      configSchema: [
        { key: 'accessToken', type: 'password', required: true },
        { key: 'phoneNumberId', type: 'text', required: true },
        { key: 'verifyToken', type: 'text', required: true },
        { key: 'appSecret', type: 'password', required: false },
      ],
    },
  ],

  // Factory function to create the adapter
  createAdapter: (config) => new WhatsAppAdapter(config),

  // Webhook routes (optional)
  getRoutes: () => whatsappWebhookRoutes,
};
```

### Extension Loader

Gateway discovers and loads extensions at startup:

```typescript
// gateway/extension-loader.ts
export async function loadExtensions(): Promise<ExtensionRegistry> {
  const registry = new ExtensionRegistry();

  // Load channel extensions
  const channelManifests = await import.meta.glob('../extensions/channels/*/manifest.ts');
  for (const [path, loader] of Object.entries(channelManifests)) {
    const { manifest } = await loader();
    registry.registerChannel(manifest);
  }

  // Load AI extensions
  const aiManifests = await import.meta.glob('../extensions/ai/*/manifest.ts');
  for (const [path, loader] of Object.entries(aiManifests)) {
    const { manifest } = await loader();
    registry.registerAI(manifest);
  }

  // Load PMS extensions
  const pmsManifests = await import.meta.glob('../extensions/pms/*/manifest.ts');
  for (const [path, loader] of Object.entries(pmsManifests)) {
    const { manifest } = await loader();
    registry.registerPMS(manifest);
  }

  return registry;
}
```

### Core Interfaces

Extensions must implement these interfaces:

```typescript
// extensions/channels/types.ts
interface ChannelAdapter {
  readonly id: string;

  /** Send a message through this channel */
  send(message: OutboundMessage): Promise<SendResult>;

  /** Parse incoming webhook payload into normalized message */
  parseIncoming(payload: unknown): InboundMessage | null;

  /** Verify webhook signature (optional) */
  verifySignature?(payload: unknown, signature: string): boolean;
}

interface ChannelManifest {
  id: string;
  name: string;
  category: 'channel';
  providers: ProviderDefinition[];
  createAdapter: (config: Record<string, unknown>) => ChannelAdapter;
  getRoutes?: () => Hono;
}

// extensions/ai/types.ts
interface AIProvider {
  readonly id: string;

  complete(request: CompletionRequest): Promise<CompletionResponse>;
  embed?(texts: string[]): Promise<number[][]>;
  testConnection(): Promise<ConnectionTestResult>;
}

// extensions/pms/types.ts
interface PMSAdapter {
  readonly id: string;

  fetchGuests(since?: Date): Promise<NormalizedGuest[]>;
  fetchReservations(since?: Date): Promise<NormalizedReservation[]>;
  fetchRooms(): Promise<NormalizedRoom[]>;
  testConnection(): Promise<ConnectionTestResult>;
}
```

### Core Message Processor

Core orchestrates without knowing about specific integrations:

```typescript
// core/message-processor.ts
export class MessageProcessor {
  constructor(
    private channelManager: ChannelManager,  // Manages all channel adapters
    private aiEngine: AIEngine,              // Manages all AI providers
    private conversationService: ConversationService,
    private escalationEngine: EscalationEngine,
  ) {}

  async process(channelId: string, payload: unknown): Promise<void> {
    // 1. Get channel adapter (doesn't know it's WhatsApp vs SMS)
    const channel = this.channelManager.get(channelId);
    const message = channel.parseIncoming(payload);
    if (!message) return;

    // 2. Find or create conversation
    const conversation = await this.conversationService.findOrCreate({
      channel: channelId,
      externalId: message.senderId,
    });

    // 3. Store message
    await this.conversationService.addMessage(conversation.id, message);

    // 4. Check escalation
    if (await this.escalationEngine.shouldEscalate(conversation, message)) {
      await this.conversationService.escalate(conversation.id);
      return;
    }

    // 5. Generate AI response (provider-agnostic)
    const response = await this.aiEngine.generateResponse(message, conversation);

    // 6. Send response through same channel
    await channel.send({
      recipientId: message.senderId,
      content: response.content,
    });

    // 7. Store response
    await this.conversationService.addMessage(conversation.id, {
      role: 'assistant',
      content: response.content,
    });
  }
}
```

## Consequences

### Positive

- **Progressive autonomy**: More integrations = more tasks Jack can handle autonomously
- **Isolation**: Each extension is self-contained with its own tests
- **Discoverability**: New extensions auto-registered via manifest pattern
- **Maintainability**: Changes to WhatsApp don't affect SMS code
- **Testability**: Mock entire extensions easily
- **Onboarding**: Clear structure for contributors adding new integrations
- **Deployment flexibility**: Disable extensions via config, not code changes
- **Hotel control**: Configurable autonomy levels per action type

### Negative

- **Migration effort**: Significant refactor of existing code
- **Learning curve**: New pattern for existing developers
- **Indirection**: One more layer to understand
- **Build complexity**: Dynamic imports may complicate bundling

### Risks

- Over-engineering for current scale — mitigate by keeping interfaces minimal
- Performance overhead from dynamic loading — mitigate by loading once at startup

## Alternatives Considered

### Option A: Keep Current Structure

Continue with `src/channels/` + `src/integrations/core/registry.ts`.

- **Pros**: No migration, works today
- **Cons**: Doesn't scale, registry file keeps growing, duplication

### Option B: Fully Dynamic Plugins

Load extensions as separate npm packages or from a plugins folder.

- **Pros**: Maximum flexibility, could add plugins at runtime
- **Cons**: Complex dependency management, versioning issues, overkill for self-hosted

### Option C: Monorepo Packages

Split into `packages/core`, `packages/channel-whatsapp`, etc.

- **Pros**: True isolation, independent versioning
- **Cons**: Heavy infrastructure, pnpm workspaces complexity, doesn't match self-hosted model

## Migration Path

1. **Phase 1**: Create `extensions/` structure, move AI providers first (smallest)
2. **Phase 2**: Move channels, consolidate adapters + manifests
3. **Phase 3**: Move PMS adapters
4. **Phase 4**: Refactor core to use extension loader
5. **Phase 5**: Remove old `src/integrations/core/registry.ts`

## Open Questions

- [ ] Should extensions be lazy-loaded or all loaded at startup?
- [ ] How to handle extension-specific database migrations?
- [ ] Should the manifest include version info for compatibility checks?
- [ ] Do we need a formal extension API version?

## Decided

- [x] **Target autonomy level**: L2 (Supervised) for v1.0, extensible to L3/L4
- [x] **Approval settings**: Configurable per-hotel, per-action (not hardcoded)
- [x] **Financial actions**: Hotels decide approval thresholds in settings

## References

- [ADR-002: AI Provider Abstraction](002-ai-provider-abstraction.md)
- [ADR-004: PMS Integration Pattern](004-pms-integration-pattern.md)
- [Current Registry](../../../src/integrations/core/registry.ts)
