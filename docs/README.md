# Jack The Butler Documentation

> **Jack** - Joint AI Control Kernel
> An intelligent AI assistant platform for the hospitality industry

**Website**: [JackTheButler.com](https://jackthebutler.com)

---

## Quick Navigation

| Section | Description | Audience |
|---------|-------------|----------|
| [Vision](01-vision/) | Project goals, principles, and scope | Everyone |
| [Use Cases](02-use-cases/) | What Jack does for guests, staff, and operations | Product, Design, Dev |
| [Architecture](03-architecture/) | How Jack is built | Engineering |
| [Specifications](04-specs/) | Detailed technical specs and APIs | Engineering |
| [Operations](05-operations/) | Deployment and runbooks | DevOps, SRE |

---

## What is Jack?

Jack The Butler is a self-hosted AI assistant platform designed specifically for hotels and hospitality businesses. Inspired by the [Clawdbot](https://github.com/clawdbot/clawdbot) architecture, Jack acts as a central orchestration hub that connects:

- **Guest communication channels** (WhatsApp, SMS, web chat, voice)
- **Staff interfaces** (mobile app, dashboard, internal messaging)
- **Hotel systems** (PMS, POS, housekeeping, maintenance)

Jack handles routine guest requests autonomously while intelligently routing complex issues to the right staff members with full context.

---

## Core Principles

1. **Guest-first** - Every feature decision prioritizes guest experience
2. **Privacy by design** - Guest data stays within hotel control
3. **AI assists, humans decide** - Escalation paths for edge cases
4. **Channel agnostic** - Meet guests where they are
5. **Hospitality native** - Built for hotels, not adapted from generic tools

---

## Documentation Structure

```
docs/
├── 01-vision/           # Why we're building Jack
│   ├── overview.md
│   ├── goals-and-non-goals.md
│   └── glossary.md
│
├── 02-use-cases/        # What Jack does
│   ├── guest/           # Guest-facing use cases
│   ├── staff/           # Staff-facing use cases
│   └── operations/      # Automated operations
│
├── 03-architecture/     # How Jack is built
│   ├── c4-components/   # Component deep-dives
│   └── decisions/       # Architecture Decision Records
│
├── 04-specs/            # Technical specifications
│   ├── api/             # API documentation
│   ├── integrations/    # System integrations
│   └── features/        # Feature specifications
│
└── 05-operations/       # Running Jack
    └── runbooks/        # Operational procedures
```

---

## Getting Started

- **New to Jack?** Start with the [Vision Overview](01-vision/overview.md)
- **Product/Design?** Explore [Use Cases](02-use-cases/)
- **Engineering?** Review the [Architecture](03-architecture/)
- **Integrating a system?** Check [Integrations](04-specs/integrations/)

---

## Contributing to Docs

1. Follow the templates in each section
2. Keep documents focused and linkable
3. Update the relevant `index.md` when adding new docs
4. Diagrams use Mermaid syntax for version control

---

## Status

| Section | Status |
|---------|--------|
| Vision | Draft |
| Use Cases | Draft |
| Architecture | Draft |
| Specs | Planned |
| Operations | Planned |
