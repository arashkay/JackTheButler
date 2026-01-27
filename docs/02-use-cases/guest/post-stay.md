# Use Case: Post-Stay

Guest interactions after check-out.

---

## Post-Stay Follow-Up

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-09 |
| Actor | Guest / System |
| Channels | WhatsApp, SMS, Email |
| Priority | P2 |

### Description

Jack follows up with guests after departure to thank them, collect feedback, and maintain the relationship for future stays.

### User Stories

- As a hotel, I want to thank guests after their stay
- As a hotel, I want to collect feedback while the experience is fresh
- As a guest, I want an easy way to share feedback or concerns

### Proactive Follow-Up Flow

**Trigger**: 24 hours after check-out

```
Jack: Hi Sarah! Thank you for staying with us at The Grand Hotel.

      We hope you had a wonderful visit. If you have a moment,
      we'd love your feedback:

      How was your stay? (1-5 stars)
      ⭐ ⭐ ⭐ ⭐ ⭐

Guest: ⭐⭐⭐⭐ (4 stars)

Jack: Thank you for the 4-star rating! We're glad you had a
      good experience.

      Is there anything we could have done better?

Guest: Everything was great except the noise from the street
       in the mornings

Jack: Thank you for sharing that. I've noted the street noise
      feedback for our team. For your next visit, I'll flag
      your profile for a room on a higher floor or courtyard
      side.

      We'd be honored to welcome you back. If you enjoyed your
      stay, a review on TripAdvisor or Google helps us greatly:
      [Review links]

      Safe travels, and hope to see you again!
```

### Recovery Flow (Low Rating)

```
Guest: ⭐⭐ (2 stars)

Jack: I'm sorry your stay didn't meet expectations. Your
      feedback is important to us.

      Would you be willing to share what went wrong? I'll
      make sure our management team sees this personally.

Guest: The room wasn't clean when I arrived and nobody seemed
       to care when I complained

Jack: I sincerely apologize for that experience. Cleanliness
      is fundamental and we failed you.

      I'm escalating this directly to our General Manager,
      who will reach out to you personally within 24 hours
      to discuss how we can make this right.

      Thank you for giving us the opportunity to address this.

[Escalates to GM with full conversation history and severity flag]
```

---

## Lost and Found

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-10 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat, Email |
| Priority | P2 |

### Description

Guest realizes they left an item at the hotel after departure. Jack initiates a search, coordinates with housekeeping, and arranges return shipping if found.

### User Stories

- As a guest, I want to report a forgotten item easily
- As a guest, I want to know if my item was found
- As a guest, I want my item shipped back to me

### Happy Path

```
Guest: I think I left my phone charger in the room

Jack: I'm sorry to hear that! Let me help you find it.

      You were in room 412, checked out yesterday.

      Can you describe the charger?
      • Brand/type (iPhone, Samsung, etc.)
      • Color
      • Any distinguishing features

Guest: It's a white Apple charger with a long cable

Jack: Thank you! I've submitted a lost item search for:
      • White Apple charger with long cable
      • Room 412
      • Left around March 18

      Our housekeeping team will check the room and lost &
      found inventory. I'll update you within 24 hours.

[Next day]

Jack: Good news! We found your Apple charger.

      Would you like to:
      1. Pick it up on your next visit (we'll hold it 90 days)
      2. Have it shipped to you

Guest: Please ship it

Jack: Happy to! I'll need:
      • Shipping address
      • Preferred carrier (FedEx/UPS/USPS)

      Shipping cost will be charged to the card on file.
      Typically $8-15 depending on destination.

Guest: 123 Oak Street, Chicago IL 60601. FedEx is fine.

Jack: Got it! Shipping your charger via FedEx to:
      123 Oak Street
      Chicago, IL 60601

      Estimated delivery: 2-3 business days
      Cost: $12.50 (charged to Visa ending 4242)

      I'll send you the tracking number once it ships.
      Is there anything else I can help with?
```

### Item Not Found

```
[After 48-hour search]

Jack: Update on your lost item search:

      Unfortunately, we weren't able to locate the Apple
      charger in room 412 or our lost & found inventory.

      Housekeeping has thoroughly checked:
      ✓ The room (including under furniture)
      ✓ Lost & found storage
      ✓ Laundry collection

      I'm sorry we couldn't find it. If you think of any
      other details about where it might have been left,
      please let me know and I'll search again.

      Is there anything else I can help with?
```

---

## Future Booking Inquiry

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-11 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Email |
| Priority | P3 |

### Description

Past guests reach out about future stays. Jack assists with availability and preferences but directs to booking channels for new reservations (per non-goals).

### Flow

```
Guest: Hi! I stayed with you last month and want to come
       back in June

Jack: Welcome back! Great to hear from you, Sarah.

      I'd be happy to help you plan your return visit.
      What dates are you considering in June?

Guest: June 15-18

Jack: Let me check... We have availability June 15-18!

      Based on your last stay, I'd recommend:
      • Deluxe King (same room type) - from $189/night
      • Junior Suite (upgrade) - from $259/night

      Both can have your preferences (high floor, firm pillows)
      noted on the reservation.

      To book, you can:
      • Visit JackTheButler.com/book
      • Call reservations at (555) 123-4567
      • Reply with your email and I'll send booking link

      Would you like me to send the link?
```

---

## Acceptance Criteria

### Post-Stay Follow-Up
- [ ] Follow-up sent 24 hours after check-out (configurable)
- [ ] Rating captured and stored with stay record
- [ ] Low ratings (1-2 stars) escalate to management
- [ ] Feedback tagged to relevant departments
- [ ] Opt-out honored for future follow-ups

### Lost and Found
- [ ] Lost item report creates task for housekeeping
- [ ] Guest notified of search outcome within 48 hours
- [ ] Shipping arranged with tracking
- [ ] Payment processed securely
- [ ] Item retention policy communicated (90 days default)

---

## Related

- [During Stay: Check-out](during-stay.md#check-out) - Guest journey context
- [Operations: Review Monitoring](../operations/automation.md#reviews)
- [Spec: Guest Profile](../../04-specs/features/guest-memory.md)
