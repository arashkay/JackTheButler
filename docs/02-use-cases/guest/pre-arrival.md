# Use Case: Pre-Arrival Messaging

## Summary

| Attribute | Value |
|-----------|-------|
| ID | G-01 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat, Email |
| Priority | P0 |
| Dependencies | PMS Integration, Guest Profile |

---

## Description

Pre-arrival messaging covers all guest communication between booking confirmation and physical arrival at the property. This is a critical window for setting expectations, gathering preferences, and beginning the personalized service experience.

Jack initiates contact at configurable intervals before arrival and responds to guest-initiated inquiries. The goal is to make guests feel welcomed and prepared while capturing information that enables better service during their stay.

---

## User Stories

- As a guest, I want to receive a welcome message before my trip so that I know the hotel is expecting me
- As a guest, I want to request early check-in so that I can drop my bags after a morning flight
- As a guest, I want to ask about parking options so that I can plan my arrival
- As a guest, I want to share my preferences so that the hotel can prepare for my needs
- As a guest, I want to modify my reservation dates so that I don't have to call the hotel

---

## Flows

### Flow 1: Proactive Welcome Message

**Trigger**: 3 days before arrival (configurable)

```
Jack: Hi Sarah! This is Jack from The Grand Hotel. We're looking
      forward to welcoming you on Friday, March 15th for 3 nights.

      A few things to help you prepare:
      • Check-in: 3:00 PM | Check-out: 11:00 AM
      • Address: 123 Main Street (map link)

      Is there anything I can help you arrange before your arrival?

Guest: Yes, is early check-in possible? My flight lands at 10am

Jack: Let me check availability for early check-in on March 15th...

      Great news! I can confirm early check-in at 12:00 PM for you
      at no additional charge. I've noted this on your reservation.

      Would you like me to arrange airport transportation as well?

Guest: No thanks, I'm renting a car. Where do I park?

Jack: Perfect! We have complimentary self-parking in our garage.
      Enter from Oak Street and take your ticket - I'll validate
      it at check-in.

      Anything else I can help with before Friday?

Guest: That's all, thanks!

Jack: Wonderful! I'll send you a message on Friday morning with
      any updates. Safe travels, and see you soon!
```

### Flow 2: Guest-Initiated Inquiry

**Trigger**: Guest messages Jack before arrival

```
Guest: Hi, I have a reservation next week. Is the pool heated?

Jack: Hi! Let me look up your reservation...

      Welcome, Michael! I see you're arriving Tuesday, March 19th
      for 2 nights.

      Yes, our rooftop pool is heated to 82°F and open daily
      7:00 AM - 10:00 PM. Towels are provided poolside.

      Would you like me to reserve poolside loungers for any
      specific time?
```

### Flow 3: Special Request

**Trigger**: Guest has specific needs

```
Guest: We're celebrating our anniversary. Can you do anything special?

Jack: How wonderful - congratulations! 🎉

      I'd be happy to arrange something special. A few options:

      • Champagne & chocolate strawberries in room ($65)
      • Upgrade to a suite (checking availability...)
      • Dinner reservation at our rooftop restaurant
      • Rose petal turndown service (complimentary)

      What sounds good to you?

Guest: The turndown service sounds lovely, and can you book dinner
       for Saturday at 7pm?

Jack: Perfect choices! I've arranged:

      ✓ Rose petal turndown service for Saturday evening
      ✓ Dinner reservation: Skyline Restaurant, Sat 7:00 PM,
        table for 2 (I've noted it's your anniversary)

      Is there anything else I can arrange to make your
      celebration special?
```

### Flow 4: Reservation Modification

**Trigger**: Guest wants to change dates

```
Guest: I need to extend my stay by one night

Jack: Of course! You're currently booked March 15-18.
      Let me check availability for March 19th...

      Good news - I can extend your stay through March 19th
      in the same room. The additional night is $189 + tax.

      Would you like me to update your reservation?

Guest: Yes please

Jack: Done! Your reservation is now confirmed for March 15-19
      (4 nights). I've sent an updated confirmation to your email.

      Is there anything else I can help with?
```

---

## Alternative Paths

### A1: Early Check-in Not Available
```
Jack: I've checked our availability for early check-in on March 15th.
      Unfortunately, we're fully committed until 2:00 PM that day.

      I can offer:
      • Luggage storage upon arrival (complimentary)
      • Access to our lobby lounge and restaurant
      • Text notification the moment your room is ready

      Would any of these help?
```

### A2: Cannot Identify Guest
```
Guest: What time is checkout?

Jack: Hi there! I'd be happy to help.

      Could you share your reservation confirmation number or
      the email address used for booking? This helps me pull up
      your specific details.
```

### A3: Request Outside Jack's Authority
```
Guest: I want to cancel my reservation

Jack: I understand you'd like to cancel your reservation for
      March 15-18.

      To ensure this is handled correctly, including any
      applicable refund, I'm connecting you with our
      reservations team. They'll respond within the hour
      during business hours.

      Is there anything else I can help with in the meantime?

[Escalates to reservations staff with context]
```

---

## Examples

### Example: Returning Guest
```
Guest: Arriving Friday, same as usual

Jack: Welcome back, Dr. Chen! I see your reservation for
      this Friday, March 15th.

      I've already noted your preferences from your last stay:
      • High floor, away from elevator
      • Extra firm pillows
      • Morning newspaper (WSJ)

      All set! Anything you'd like to change or add this time?
```

### Example: Multi-Language
```
Guest: Hola, llego el viernes

Jack: ¡Hola! Bienvenido al Grand Hotel.

      Veo su reservación para el viernes 15 de marzo por
      3 noches. El check-in es a las 3:00 PM.

      ¿Hay algo que pueda ayudarle a organizar antes de
      su llegada?
```

---

## Acceptance Criteria

- [ ] Proactive welcome message sent at configured interval before arrival
- [ ] Guest correctly identified from phone number or email
- [ ] Reservation details accurately retrieved from PMS
- [ ] Early check-in requests checked against housekeeping schedule
- [ ] Preferences stored in guest profile for future stays
- [ ] Reservation modifications synced back to PMS
- [ ] Escalation to human for cancellations and complex changes
- [ ] Multi-language support based on guest preference or detection
- [ ] Conversation history available to front desk at arrival

---

## Metrics

| Metric | Target |
|--------|--------|
| Response time | < 30 seconds |
| Early check-in fulfillment rate | > 60% |
| Pre-arrival engagement rate | > 50% of guests |
| Escalation rate | < 15% |

---

## Related

- [During Stay: Check-in](during-stay.md#check-in) - Continuation of guest journey
- [Spec: Guest Memory](../../04-specs/features/guest-memory.md) - Preference storage
- [Integration: PMS](../../04-specs/integrations/pms-integration.md) - Reservation data
- [Architecture: Channel Adapters](../../03-architecture/c4-components/channel-adapters.md)
