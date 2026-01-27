# Glossary

Common terminology used throughout Jack The Butler documentation.

---

## Core Concepts

### Jack
**J**oint **A**I **C**ontrol **K**ernel - The central orchestration layer that connects communication channels, hotel systems, and AI capabilities.

### Gateway
The WebSocket-based control plane that manages connections between channels, the AI engine, and hotel system integrations. The heart of Jack's architecture.

### Channel
A communication medium through which guests or staff interact with Jack. Examples: WhatsApp, SMS, web chat, voice, email.

### Channel Adapter
A component that translates between a specific channel's protocol/API and Jack's internal message format.

### Conversation
A continuous thread of communication between a guest and Jack, potentially spanning multiple channels and sessions.

### Thread
A focused sub-conversation within a larger conversation, typically around a specific request or topic.

---

## Guest Domain

### Guest Profile
The persistent record of a guest including identity, contact information, preferences, and interaction history.

### Preference
A learned or stated guest attribute that informs personalization. Examples: room temperature, pillow type, dietary restrictions.

### Stay
A single visit to a property, from check-in to check-out. A guest may have multiple stays over time.

### Reservation
A booking record in the PMS, associated with a future or current stay.

### Request
A guest ask that requires action. Classified by type (service, information, complaint, etc.) and urgency.

---

## Staff Domain

### Agent (Human)
A hotel staff member who interacts with Jack to handle guest requests. Not to be confused with AI agents.

### Assignment
The routing of a request or conversation to a specific human agent or department.

### Escalation
The transfer of a conversation from autonomous AI handling to human agent involvement.

### Handoff
The transition of a conversation between agents, including context transfer.

### Queue
A prioritized list of conversations or requests awaiting agent attention.

---

## Hotel Systems

### PMS (Property Management System)
The core hotel software managing reservations, room inventory, guest records, and billing. Examples: Opera, Mews, Cloudbeds.

### POS (Point of Sale)
Systems handling transactions for restaurants, bars, spa, and other hotel outlets.

### CRS (Central Reservation System)
System managing room inventory and rates across distribution channels.

### Housekeeping System
Software tracking room cleaning status, task assignments, and inventory.

### Maintenance System
Work order management for repairs and preventive maintenance.

---

## AI & Automation

### Intent
The classified purpose of a guest message. Examples: `request.service.towels`, `inquiry.amenity.pool`, `complaint.room.noise`.

### Entity
A specific piece of information extracted from a message. Examples: room number, date, quantity.

### Skill
A defined capability Jack can execute, potentially involving multiple steps and system integrations.

### Automation Rule
A configured trigger-action pair that executes without AI reasoning. Example: "If checkout tomorrow, send reminder at 8am."

### Confidence Score
A measure (0-1) of how certain Jack is about intent classification or response appropriateness.

### Escalation Threshold
The confidence level below which Jack routes to human agents rather than responding autonomously.

---

## Technical Terms

### Webhook
An HTTP callback that notifies Jack of events from external systems.

### Message Broker
The internal system (e.g., Redis) that queues and routes messages between components.

### State Machine
The model tracking conversation state and valid transitions.

### RAG (Retrieval-Augmented Generation)
The technique of enhancing AI responses with retrieved hotel-specific knowledge (policies, FAQs, etc.).

### Embedding
A vector representation of text used for semantic search and similarity matching.

---

## Metrics

### TTFR (Time to First Response)
Duration from guest message receipt to Jack's first reply.

### Resolution Rate
Percentage of requests fully handled without human intervention.

### Escalation Rate
Percentage of conversations that require human agent involvement.

### CSAT (Customer Satisfaction)
Guest rating of their interaction with Jack.

### NPS (Net Promoter Score)
Likelihood of guest recommending the hotel, potentially influenced by Jack interactions.

---

## Abbreviations

| Abbreviation | Meaning |
|--------------|---------|
| AI | Artificial Intelligence |
| API | Application Programming Interface |
| CRM | Customer Relationship Management |
| ETA | Estimated Time of Arrival |
| FAQ | Frequently Asked Questions |
| GDPR | General Data Protection Regulation |
| HTTP | Hypertext Transfer Protocol |
| JSON | JavaScript Object Notation |
| JWT | JSON Web Token |
| LLM | Large Language Model |
| MFA | Multi-Factor Authentication |
| MVP | Minimum Viable Product |
| NLP | Natural Language Processing |
| OTA | Online Travel Agency |
| PCI | Payment Card Industry |
| REST | Representational State Transfer |
| SDK | Software Development Kit |
| SLA | Service Level Agreement |
| SSO | Single Sign-On |
| TTS | Text-to-Speech |
| UI | User Interface |
| UX | User Experience |
| WS | WebSocket |

---

## Related

- [Overview](overview.md)
- [Architecture](../03-architecture/)
