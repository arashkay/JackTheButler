# Phase 15.1: AI Provider Consolidation

**Focus:** Merge duplicate AI providers into `extensions/ai/`
**Risk:** Low
**Depends on:** Phase 14
**Status:** ✓ COMPLETE (2026-02-01)

---

## Goal

Eliminate duplicate AI provider code. After this phase, all AI providers live in `extensions/ai/` only.

---

## Current State (Duplicated)

```
src/ai/providers/           ← OLD (to delete)
├── claude.ts
├── openai.ts
└── ollama.ts

src/extensions/ai/providers/ ← KEEP (consolidate here)
├── anthropic.ts
├── openai.ts
└── ollama.ts
```

---

## Tasks

### 1. Compare and Merge

- [ ] Compare `ai/providers/claude.ts` with `extensions/ai/providers/anthropic.ts`
  - Ensure all features from both are in the final version
  - Keep the better implementation

- [ ] Compare `ai/providers/openai.ts` with `extensions/ai/providers/openai.ts`
  - Merge any missing functionality

- [ ] Compare `ai/providers/ollama.ts` with `extensions/ai/providers/ollama.ts`
  - Merge any missing functionality

### 2. Update Imports

- [ ] Find all files importing from `@/ai/providers/`
  ```bash
  grep -r "@/ai/providers" src/
  ```
- [ ] Update imports to use `@/extensions/ai/providers/`

### 3. Update ai/responder.ts

- [ ] Change `ai/responder.ts` to import from `extensions/ai/`
- [ ] Test AI responses still work

### 4. Delete Old Providers

- [ ] Delete `src/ai/providers/claude.ts`
- [ ] Delete `src/ai/providers/openai.ts`
- [ ] Delete `src/ai/providers/ollama.ts`
- [ ] Delete `src/ai/providers/` folder

---

## Verification

```bash
# 1. No imports from old location
grep -r "@/ai/providers" src/
# Expected: no results

# 2. TypeScript compiles
pnpm typecheck

# 3. Tests pass
pnpm test

# 4. AI still works
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

---

## Files Changed

| Action | File |
|--------|------|
| Modify | `src/ai/responder.ts` - update imports |
| Modify | `src/extensions/ai/providers/anthropic.ts` - merge features |
| Delete | `src/ai/providers/claude.ts` |
| Delete | `src/ai/providers/openai.ts` |
| Delete | `src/ai/providers/ollama.ts` |

---

## Acceptance Criteria

- [ ] All AI provider code in `extensions/ai/` only
- [ ] No files in `src/ai/providers/`
- [ ] All tests pass
- [ ] AI responses work as before
