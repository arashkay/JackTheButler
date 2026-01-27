# Phase 0: Skeleton

**Version:** 0.1.0
**Codename:** Skeleton
**Goal:** Project structure and build system working

---

## Overview

Phase 0 establishes the project foundation. No features, just structure. The goal is to have a project that:

1. Compiles without errors
2. Runs `pnpm dev` successfully
3. Has the folder structure in place
4. Has all tooling configured

---

## Deliverables

### 0.1.0-alpha.1: Project Initialization

**Files to create:**

```
jack/
├── package.json              # pnpm workspace root
├── pnpm-workspace.yaml       # Workspace configuration
├── tsconfig.json             # Root TypeScript config
├── .gitignore                # Git ignore patterns
├── .env.example              # Environment template
├── README.md                 # Project readme
└── src/
    └── index.ts              # Entry point (console.log only)
```

**package.json essentials:**

```json
{
  "name": "jack-the-butler",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "oxlint src/",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=22"
  }
}
```

**Acceptance criteria:**
- [ ] `pnpm install` completes without errors
- [ ] `pnpm dev` starts and shows "Jack The Butler starting..."
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes

---

### 0.1.0-alpha.2: Folder Structure

**Create all source directories (empty index.ts files):**

```
src/
├── index.ts                  # Entry point
├── gateway/
│   └── index.ts              # export {} placeholder
├── channels/
│   └── index.ts
├── ai/
│   └── index.ts
├── integrations/
│   └── index.ts
├── services/
│   └── index.ts
├── db/
│   └── index.ts
├── config/
│   └── index.ts
├── utils/
│   └── index.ts
└── types/
    └── index.ts
```

**Acceptance criteria:**
- [ ] All folders exist with placeholder exports
- [ ] Import from each folder works without errors
- [ ] No circular dependency warnings

---

### 0.1.0-alpha.3: Development Tooling

**Configure tooling:**

```
jack/
├── tsconfig.json             # TypeScript strict mode
├── .prettierrc               # Prettier config
├── oxlint.json               # Linter config (or use defaults)
├── vitest.config.ts          # Test runner config
└── .vscode/
    ├── settings.json         # Editor settings
    └── extensions.json       # Recommended extensions
```

**tsconfig.json key settings:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Acceptance criteria:**
- [ ] `pnpm lint` runs oxlint
- [ ] `pnpm format` formats code
- [ ] `pnpm test` runs (with no tests yet)
- [ ] Path aliases work (`@/utils/logger`)

---

### 0.1.0-alpha.4: Docker Setup

**Create Docker configuration:**

```
jack/
├── Dockerfile                # Production image
├── docker-compose.yml        # Local development
└── .dockerignore             # Build exclusions
```

**Dockerfile (minimal):**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
VOLUME /app/data
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Acceptance criteria:**
- [ ] `docker build -t jack .` succeeds
- [ ] `docker run jack` shows startup message
- [ ] Container exits cleanly

---

## Testing Checkpoint

### Manual Tests

```bash
# Test 1: Fresh install
rm -rf node_modules pnpm-lock.yaml
pnpm install
# Expected: Completes without errors

# Test 2: Development mode
pnpm dev
# Expected: Shows "Jack The Butler starting..."

# Test 3: Build
pnpm build
# Expected: Creates dist/ folder

# Test 4: Production run
pnpm start
# Expected: Same output as dev

# Test 5: Docker
docker build -t jack .
docker run --rm jack
# Expected: Shows startup message
```

### Automated Tests (None Yet)

No automated tests in Phase 0. Test infrastructure is set up but empty.

---

## Exit Criteria

Phase 0 is complete when:

1. **Repository is initialized** with proper structure
2. **All tooling works** (TypeScript, linting, formatting)
3. **pnpm dev runs** without errors
4. **Docker builds** without errors
5. **No features implemented** - just structure

---

## What NOT to Do

- Do NOT add any business logic
- Do NOT add database code
- Do NOT add HTTP server code
- Do NOT add tests (setup only)
- Do NOT add dependencies beyond dev tools

---

## Dependencies

**Required packages (minimal):**

```json
{
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "oxlint": "^0.15.0",
    "prettier": "^3.4.0",
    "@types/node": "^22.10.0"
  }
}
```

---

## Next Phase

After Phase 0, proceed to [Phase 1: Foundation](phase-1-foundation.md) to add database and configuration.

---

## Checklist for Claude Code

```markdown
## Phase 0 Implementation Checklist

### 0.1.0-alpha.1: Project Init
- [ ] Create package.json with scripts
- [ ] Create pnpm-workspace.yaml
- [ ] Create tsconfig.json with strict mode
- [ ] Create .gitignore
- [ ] Create .env.example
- [ ] Create src/index.ts with startup log
- [ ] Verify: pnpm install works
- [ ] Verify: pnpm dev shows startup message

### 0.1.0-alpha.2: Folder Structure
- [ ] Create src/gateway/index.ts
- [ ] Create src/channels/index.ts
- [ ] Create src/ai/index.ts
- [ ] Create src/integrations/index.ts
- [ ] Create src/services/index.ts
- [ ] Create src/db/index.ts
- [ ] Create src/config/index.ts
- [ ] Create src/utils/index.ts
- [ ] Create src/types/index.ts
- [ ] Verify: All imports work

### 0.1.0-alpha.3: Tooling
- [ ] Configure .prettierrc
- [ ] Configure oxlint.json (or use defaults)
- [ ] Configure vitest.config.ts
- [ ] Create .vscode/settings.json
- [ ] Verify: pnpm lint passes
- [ ] Verify: pnpm format works
- [ ] Verify: pnpm typecheck passes

### 0.1.0-alpha.4: Docker
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Create .dockerignore
- [ ] Verify: docker build succeeds
- [ ] Verify: docker run shows startup

### Phase 0 Complete
- [ ] All checks above pass
- [ ] Commit: "Phase 0: Project skeleton complete"
- [ ] Tag: v0.1.0
```
