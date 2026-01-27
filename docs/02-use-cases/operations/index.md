# Operations Use Cases

Automated workflows and analytics for hotel operations.

---

## Overview

Operations use cases cover system-initiated actions, scheduled automations, and analytics that run without direct guest or staff interaction.

---

## Use Case Summary

| ID | Use Case | Priority | Status | Link |
|----|----------|----------|--------|------|
| O-01 | Proactive notifications | P1 | Draft | [automation.md](automation.md) |
| O-02 | Review monitoring | P2 | Planned | [automation.md](automation.md#reviews) |
| O-03 | Reporting & analytics | P2 | Planned | [analytics.md](analytics.md) |
| O-04 | No-show handling | P2 | Planned | [automation.md](automation.md#no-show) |

---

## Automation Categories

### Time-Based
Triggered by schedule or time relative to events.

| Trigger | Action |
|---------|--------|
| 3 days before arrival | Send welcome message |
| Check-in day, 8 AM | Room ready notification (if ready) |
| Day of checkout, 8 AM | Checkout reminder |
| 24 hours post-checkout | Feedback request |

### Event-Based
Triggered by system events.

| Trigger | Action |
|---------|--------|
| Room status → Ready | Notify guest if waiting |
| Task completed | Notify guest |
| Low rating received | Alert management |
| VIP check-in | Notify relevant staff |

### Condition-Based
Triggered when conditions are met.

| Condition | Action |
|-----------|--------|
| No response to escalation (15 min) | Re-escalate |
| Negative sentiment detected | Flag for review |
| Repeat complaint pattern | Alert management |

---

## Sections

- [Automation](automation.md) - Scheduled and triggered workflows
- [Analytics](analytics.md) - Reporting and insights

---

## Related

- [Guest Use Cases](../guest/) - Guest-facing automations
- [Staff Use Cases](../staff/) - Staff notifications
- [Architecture: Automation Engine](../../03-architecture/c4-components/gateway.md)
