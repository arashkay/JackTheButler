# Use Case: During Stay

All guest interactions while checked in at the property.

---

## Check-In

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-02 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat |
| Priority | P0 |

### Description

Jack assists with the arrival and check-in process, providing room readiness updates, directions, and immediate orientation information.

### User Stories

- As a guest, I want to know when my room is ready so I don't wait unnecessarily in the lobby
- As a guest, I want to get my room number via message so I can go directly to my room
- As a guest, I want to know essential info (WiFi, breakfast) right after check-in

### Happy Path

```
[Room becomes ready in PMS]

Jack: Great news, Sarah! Your room is ready. 🎉

      Room 412, 4th floor
      WiFi: GrandHotel_Guest | Password: Welcome2024

      Take elevators past the lobby bar, turn right.

      Breakfast is 6:30-10:30 AM in The Garden restaurant (lobby level).

      Need anything else as you settle in?

Guest: Where's the ice machine?

Jack: The ice machine is in the alcove next to the elevators on
      your floor (4th). There's also a vending area there with
      snacks and drinks.
```

### Alternative: Mobile Check-In

```
Guest: Can I check in on my phone? I don't want to wait in line

Jack: Absolutely! Here's your mobile check-in link:
      [link]

      Complete the form, and I'll text you your room number
      and digital key as soon as your room is ready.

      You can head straight to your room - no front desk needed!
```

---

## Service Requests

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-03 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat |
| Priority | P0 |

### Description

Guests request items or services to be delivered to their room. Jack creates tasks for the appropriate department and confirms completion.

### User Stories

- As a guest, I want to request extra towels without calling the front desk
- As a guest, I want to know when my request will be fulfilled
- As a guest, I want to request multiple items in one message

### Common Requests

| Request Type | Department | Typical SLA |
|--------------|------------|-------------|
| Towels, pillows, linens | Housekeeping | 15 min |
| Toiletries | Housekeeping | 15 min |
| Iron/ironing board | Housekeeping | 15 min |
| Extra hangers | Housekeeping | 15 min |
| Crib, rollaway bed | Housekeeping | 30 min |
| Coffee maker supplies | Housekeeping | 15 min |

### Happy Path

```
Guest: Can I get some extra towels and a few more hangers?

Jack: Of course! I'm sending to room 412:
      • Extra towels (bath and hand)
      • Additional hangers (6)

      These should arrive within 15 minutes. I'll confirm
      when they're delivered.

      Anything else you need?

[15 minutes later, housekeeping marks complete]

Jack: Your towels and hangers have been delivered to room 412.
      Let me know if you need anything else!
```

### Alternative: Item Not Available

```
Guest: Do you have a humidifier I can use?

Jack: Let me check if we have a humidifier available...

      I'm sorry, our humidifiers are currently all in use.
      I've added you to the waitlist and will let you know
      as soon as one becomes available.

      In the meantime, running a hot shower with the bathroom
      door open can help add moisture to the air. Would you
      like me to bring up some extra water bottles?
```

---

## Information Inquiries

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-04 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat, Email |
| Priority | P0 |

### Description

Guests ask questions about hotel amenities, policies, hours, and services. Jack provides instant answers from the hotel knowledge base.

### User Stories

- As a guest, I want quick answers to common questions without calling
- As a guest, I want accurate information about hours and availability
- As a guest, I want to know what's included in my stay

### Common Inquiries

| Category | Example Questions |
|----------|-------------------|
| WiFi | Password, network name, connection issues |
| Dining | Restaurant hours, menus, reservations |
| Amenities | Pool, gym, spa, business center hours |
| Policies | Parking, pets, smoking, visitors |
| Location | Directions, nearby attractions, transport |

### Happy Path

```
Guest: What are the gym hours?

Jack: Our fitness center is open 24/7 for hotel guests!

      Located on the 2nd floor, accessible with your room key.

      Equipment includes:
      • Treadmills and ellipticals
      • Free weights and machines
      • Yoga mats and stretching area

      Complimentary water and towels provided.
```

### Complex Inquiry

```
Guest: I'm vegan - what can I eat at breakfast?

Jack: Great question! At our breakfast buffet (The Garden,
      6:30-10:30 AM), vegan options include:

      • Fresh fruit and berries
      • Oatmeal with almond milk
      • Avocado toast on sourdough
      • Roasted potatoes
      • Sautéed vegetables

      Our chef can also prepare made-to-order items.
      Just let them know you're vegan and they'll
      accommodate you.

      Would you like me to note this preference for
      your stay?
```

---

## Issues and Complaints

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-05 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat |
| Priority | P0 |

### Description

Guest reports problems with their room, service, or experience. Jack triages urgency, creates maintenance/service tickets, and escalates to management when appropriate.

### User Stories

- As a guest, I want to report problems easily
- As a guest, I want acknowledgment that my issue is being addressed
- As a guest, I want timely resolution or alternatives

### Severity Classification

| Severity | Examples | Response |
|----------|----------|----------|
| **Critical** | No hot water, AC broken (extreme weather), safety issue | Immediate escalation + room move offer |
| **High** | TV not working, noisy neighbors, cleanliness issue | 30-min resolution target |
| **Medium** | Light bulb out, minor maintenance | Same-day resolution |
| **Low** | Preference not met, minor inconvenience | Acknowledge + address |

### Happy Path (High Severity)

```
Guest: The AC is barely working and it's really hot in here

Jack: I'm sorry about that - I know that's uncomfortable.
      Let me help right away.

      I'm creating an urgent maintenance request for room 412.
      A technician will be there within 20 minutes.

      While you wait, would you like me to:
      • Send up a portable fan immediately?
      • Check if we can move you to another room?

Guest: A fan would help for now

Jack: Done - a fan is on its way to room 412 now.

      I'll follow up once maintenance has looked at your AC.
      My apologies again for the inconvenience.

[After maintenance visit]

Jack: Update on your AC: Our technician has fixed the issue -
      the filter was clogged. It should cool down properly now.

      Is the temperature improving? Let me know if you need
      anything else.
```

### Complaint Requiring Escalation

```
Guest: I'm very upset. I specifically requested a quiet room
       and I've been next to a loud group all night.

Jack: I sincerely apologize for the disruption to your sleep.
      That's not the experience we want for you.

      I'm immediately connecting you with our duty manager
      who can:
      • Move you to a guaranteed quiet room
      • Discuss appropriate compensation

      They'll contact you within 10 minutes. In the meantime,
      is there anything I can do right now to help?

[Escalates to duty manager with full context]
```

---

## Dining

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-06 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat |
| Priority | P1 |

### Description

Guest orders room service or makes restaurant reservations. Jack takes orders, confirms details, and coordinates with F&B outlets.

### Happy Path (Room Service)

```
Guest: Can I order room service?

Jack: Of course! Here's our room service menu:
      [link to digital menu]

      Or just tell me what you'd like and I'll place the order.

      Kitchen is open until 11 PM tonight.

Guest: Club sandwich and a beer

Jack: Got it! For room 412:
      • Classic Club Sandwich - $18
      • Beer - which would you prefer?
        - Local IPA ($8)
        - Imported Lager ($7)
        - Light Beer ($6)

Guest: The IPA

Jack: Perfect! Your order:
      • Classic Club Sandwich - $18
      • Local IPA - $8
      • Subtotal: $26 + tax and gratuity

      Estimated delivery: 30-40 minutes
      Charge to room 412?

Guest: Yes

Jack: Order confirmed! ✓

      Your club sandwich and IPA will arrive in about 35 minutes.
      I'll let you know when it's on the way.
```

### Restaurant Reservation

```
Guest: Can you book dinner for tonight?

Jack: Happy to help! For our Skyline Restaurant tonight:

      • How many guests?
      • Preferred time?
      • Any dietary requirements?

Guest: 2 people, around 7, no allergies

Jack: Checking availability for 2 at 7 PM tonight...

      I have these options:
      • 6:45 PM - Window table available
      • 7:00 PM - Standard seating
      • 7:30 PM - Patio seating (weather permitting)

      Which would you prefer?

Guest: 6:45 window table

Jack: Excellent choice! Confirmed:

      🍽 Skyline Restaurant
      📅 Tonight, 6:45 PM
      👥 2 guests
      🪟 Window table

      The restaurant is on the 12th floor. Smart casual dress.
      See you there!
```

---

## Concierge

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-07 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat |
| Priority | P1 |

### Description

Jack provides local recommendations, makes external reservations, and arranges transportation and activities.

### Happy Path

```
Guest: What's good for dinner nearby? Not hotel restaurant.

Jack: Great question! A few favorites within walking distance:

      🍝 **Lucia's** (Italian, 5 min walk)
      Handmade pasta, cozy atmosphere. ~$40/person

      🍣 **Koi** (Japanese, 8 min walk)
      Excellent sushi, trendy vibe. ~$60/person

      🥩 **The Butcher Block** (Steakhouse, 3 min walk)
      Classic steaks, great wine list. ~$80/person

      Would you like me to make a reservation at any of these?

Guest: Lucia's sounds good, for 2 at 8

Jack: Calling Lucia's now...

      Confirmed! Reservation at Lucia's:
      📅 Tonight, 8:00 PM
      👥 2 guests
      📍 247 Oak Street (5 min walk - turn left from hotel entrance)

      They're known for the truffle pasta - highly recommend!
```

### Transportation

```
Guest: I need a car to the airport tomorrow at 6am

Jack: I'll arrange airport transportation for tomorrow.

      For your 6:00 AM pickup from hotel to Airport:

      🚗 **Private sedan**: $65
      🚐 **Shared shuttle**: $25/person

      Which would you prefer?

Guest: Private sedan

Jack: Confirmed! Airport transfer:

      📅 Tomorrow, 6:00 AM
      📍 Pickup at hotel main entrance
      🚗 Private sedan to Airport
      💰 $65 (charged to room)

      Driver will have a sign with your name. I'll send a
      reminder tonight and confirm the driver details in
      the morning.
```

---

## Check-Out

### Summary

| Attribute | Value |
|-----------|-------|
| ID | G-08 |
| Actor | Guest |
| Channels | WhatsApp, SMS, Web Chat |
| Priority | P0 |

### Description

Jack assists with departure, including late check-out requests, folio review, and express check-out.

### Proactive Check-Out Reminder

```
[Morning of check-out, 8 AM]

Jack: Good morning, Sarah! A reminder that check-out is
      at 11:00 AM today.

      Quick options:
      • 📱 Express check-out (I'll email your receipt)
      • 🕐 Late check-out (let me check availability)
      • 📋 Review your folio

      How can I help with your departure?
```

### Late Check-Out Request

```
Guest: Is late checkout possible?

Jack: Let me check availability...

      I can offer:
      • 12:00 PM - complimentary
      • 2:00 PM - $50
      • 4:00 PM - $95 (half-day rate)

      Which works for you?

Guest: Noon is perfect

Jack: Done! Your check-out is now 12:00 PM.

      Would you like me to arrange luggage storage if you
      want to explore after?
```

### Express Check-Out

```
Guest: I'll do express checkout

Jack: Perfect! Processing express check-out for room 412...

      Your final folio:
      ━━━━━━━━━━━━━━━━━━━━━━
      Room (3 nights)      $567.00
      Room Service          $26.00
      Parking               $45.00
      ━━━━━━━━━━━━━━━━━━━━━━
      Subtotal            $638.00
      Tax                  $76.56
      ━━━━━━━━━━━━━━━━━━━━━━
      Total               $714.56
      ━━━━━━━━━━━━━━━━━━━━━━

      Charged to Visa ending 4242.

      Detailed receipt sent to sarah@email.com.

      Just leave your keys in the room - you're all set!
      Thank you for staying with us. Safe travels! ✈️
```

---

## Acceptance Criteria (All During-Stay Use Cases)

- [ ] Requests processed within 30 seconds
- [ ] Tasks created in appropriate department systems
- [ ] Completion confirmations sent to guest
- [ ] Escalation triggers for severity/complexity
- [ ] Guest preferences captured for future stays
- [ ] All interactions logged to conversation history
- [ ] Staff can view and take over any conversation

---

## Related

- [Pre-Arrival](pre-arrival.md) - Guest journey context
- [Post-Stay](post-stay.md) - Continuation after departure
- [Staff: Task Management](../staff/task-management.md) - How requests are fulfilled
- [Spec: Task Routing](../../04-specs/features/task-routing.md)
