# Phase 15.2: Channel Provider Consolidation

**Focus:** Merge duplicate channel code into `extensions/channels/`
**Risk:** Medium
**Depends on:** Phase 15.1
**Status:** ✓ COMPLETE (2026-02-01)

> **Note:** WhatsApp and SMS now use extension registry pattern. Email and WebChat remain in channels/ as they have no duplicates.

---

## Goal

Eliminate duplicate channel provider code. After this phase, all channel providers live in `extensions/channels/` only.

---

## Current State (Duplicated)

```
src/channels/                    ← OLD (to delete)
├── whatsapp/
│   ├── api.ts                   ← Duplicate of extensions/channels/whatsapp/meta.ts
│   ├── parser.ts
│   └── security.ts
├── sms/
│   └── api.ts                   ← Duplicate of extensions/channels/sms/twilio.ts
├── email/
│   ├── sender.ts                ← Duplicate of extensions/channels/email/smtp.ts
│   └── ...
└── webchat/

src/extensions/channels/         ← KEEP (consolidate here)
├── whatsapp/meta.ts
├── sms/twilio.ts
└── email/smtp.ts
```

---

## Tasks

### 1. Merge WhatsApp

- [ ] Compare `channels/whatsapp/api.ts` with `extensions/channels/whatsapp/meta.ts`
- [ ] Move parser logic: `channels/whatsapp/parser.ts` → `extensions/channels/whatsapp/`
- [ ] Move security logic: `channels/whatsapp/security.ts` → `extensions/channels/whatsapp/`
- [ ] Update `extensions/channels/whatsapp/` to include all functionality

### 2. Merge SMS

- [ ] Compare `channels/sms/api.ts` with `extensions/channels/sms/twilio.ts`
- [ ] Move security logic to `extensions/channels/sms/`
- [ ] Update `extensions/channels/sms/` to include all functionality

### 3. Merge Email

- [ ] Compare `channels/email/sender.ts` with `extensions/channels/email/smtp.ts`
- [ ] Move templates: `channels/email/templates.ts` → `extensions/channels/email/`
- [ ] Move parser: `channels/email/parser.ts` → `extensions/channels/email/`
- [ ] Update `extensions/channels/email/` to include all functionality

### 4. Handle Webchat

- [ ] Move `channels/webchat/` logic to `gateway/websocket.ts` or create `extensions/channels/webchat/`

### 5. Update Imports

- [ ] Find all files importing from `@/channels/`
  ```bash
  grep -r "@/channels" src/
  ```
- [ ] Update imports to use `@/extensions/channels/`

### 6. Update Gateway Webhooks

- [ ] Update `gateway/routes/webhooks/whatsapp.ts` to use `extensions/channels/whatsapp/`
- [ ] Update `gateway/routes/webhooks/sms.ts` to use `extensions/channels/sms/`

### 7. Delete Old Channels

- [ ] Delete `src/channels/` folder entirely

---

## Verification

```bash
# 1. No imports from old location
grep -r "@/channels/" src/
# Expected: no results

# 2. TypeScript compiles
pnpm typecheck

# 3. Tests pass
pnpm test

# 4. WhatsApp webhook works
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"entry":[]}'

# 5. SMS webhook works
curl -X POST http://localhost:3000/webhooks/sms \
  -d "Body=Hello&From=+1234567890"
```

---

## Files Changed

| Action | File |
|--------|------|
| Modify | `src/extensions/channels/whatsapp/` - add parser, security |
| Modify | `src/extensions/channels/sms/` - add security |
| Modify | `src/extensions/channels/email/` - add templates, parser |
| Modify | `src/gateway/routes/webhooks/*.ts` - update imports |
| Delete | `src/channels/` (entire folder) |

---

## Acceptance Criteria

- [ ] All channel provider code in `extensions/channels/` only
- [ ] `src/channels/` folder deleted
- [ ] All webhooks work as before
- [ ] All tests pass
