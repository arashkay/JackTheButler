# Phase 2: Gateway

**Version:** 0.3.0
**Codename:** Gateway
**Goal:** HTTP server and WebSocket responding

---

## Overview

Phase 2 establishes the API layer. After this phase:

1. HTTP endpoints respond (health, API routes)
2. WebSocket connections work
3. JWT authentication implemented
4. Request validation with Zod
5. Error handling standardized

---

## Prerequisites

- Phase 1 complete (database and logging working)

---

## Deliverables

### 0.3.0-alpha.1: HTTP Server

**Files to create:**

```
src/gateway/
├── index.ts                  # Main gateway export
├── server.ts                 # Hono app setup
├── routes/
│   ├── index.ts              # Route aggregation
│   ├── health.ts             # Health endpoints
│   └── api.ts                # API route placeholder
└── middleware/
    ├── index.ts              # Middleware exports
    ├── error-handler.ts      # Global error handling
    └── request-logger.ts     # Request logging
```

**Basic Hono server:**

```typescript
// src/gateway/server.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRoutes } from './routes/health';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', requestLogger());
app.onError(errorHandler);

// Routes
app.route('/health', healthRoutes);
app.route('/api/v1', apiRoutes);

export { app };
```

**Health endpoints:**

```typescript
// src/gateway/routes/health.ts
import { Hono } from 'hono';
import { db } from '@/db';

const health = new Hono();

health.get('/live', (c) => c.json({ status: 'ok' }));

health.get('/ready', async (c) => {
  // Check database
  try {
    await db.select().from(settings).limit(1);
    return c.json({ status: 'ready', database: 'ok' });
  } catch (error) {
    return c.json({ status: 'not ready', database: 'error' }, 503);
  }
});

export { health as healthRoutes };
```

**Acceptance criteria:**
- [ ] `GET /health/live` returns `{"status":"ok"}`
- [ ] `GET /health/ready` checks database
- [ ] Request logging shows in console
- [ ] CORS headers present

---

### 0.3.0-alpha.2: Error Handling

**Custom error classes:**

```typescript
// src/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errors?: unknown[]) {
    super(message, 'VALIDATION_ERROR', 400, { errors });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}
```

**Error handler middleware:**

```typescript
// src/gateway/middleware/error-handler.ts
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    return c.json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      }
    }, err.statusCode);
  }

  // Unknown error
  logger.error({ err }, 'Unhandled error');
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }
  }, 500);
};
```

**Acceptance criteria:**
- [ ] AppError subclasses defined
- [ ] Error handler returns structured JSON
- [ ] Unknown errors logged but not exposed
- [ ] Correct HTTP status codes

---

### 0.3.0-alpha.3: Request Validation

**Zod validator middleware:**

```typescript
// src/gateway/middleware/validator.ts
import { z } from 'zod';
import { ValidationError } from '@/errors';

export function validate<T extends z.ZodSchema>(schema: T) {
  return async (c: Context, next: Next) => {
    const body = await c.req.json().catch(() => ({}));
    const result = schema.safeParse(body);

    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.errors);
    }

    c.set('validatedBody', result.data);
    await next();
  };
}
```

**Usage example:**

```typescript
const createGuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

app.post('/api/v1/guests', validate(createGuestSchema), async (c) => {
  const data = c.get('validatedBody');
  // ... create guest
});
```

**Acceptance criteria:**
- [ ] Invalid requests return 400 with errors
- [ ] Valid requests pass through
- [ ] Error messages are helpful
- [ ] Zod errors formatted nicely

---

### 0.3.0-alpha.4: JWT Authentication

**Files to create:**

```
src/gateway/middleware/
├── auth.ts                   # JWT verification
└── rate-limit.ts             # Rate limiting
src/services/
└── auth.ts                   # Auth service (login, token generation)
```

**JWT middleware:**

```typescript
// src/gateway/middleware/auth.ts
import { jwt } from 'hono/jwt';
import { loadConfig } from '@/config';

const config = loadConfig();

export const requireAuth = jwt({
  secret: config.jwt.secret,
});

export const optionalAuth = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const payload = await verify(token, config.jwt.secret);
      c.set('user', payload);
    } catch {
      // Invalid token, continue without user
    }
  }
  await next();
};
```

**Auth service:**

```typescript
// src/services/auth.ts
import { SignJWT, jwtVerify } from 'jose';

export class AuthService {
  async login(email: string, password: string): Promise<TokenPair> {
    const staff = await db.select().from(staffTable)
      .where(eq(staffTable.email, email)).limit(1);

    if (!staff[0] || !await verifyPassword(password, staff[0].passwordHash)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    return this.generateTokens(staff[0]);
  }

  async generateTokens(staff: Staff): Promise<TokenPair> {
    const accessToken = await new SignJWT({ sub: staff.id, role: staff.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(secret);

    const refreshToken = await new SignJWT({ sub: staff.id, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    return { accessToken, refreshToken };
  }
}
```

**Acceptance criteria:**
- [ ] `POST /api/v1/auth/login` returns tokens
- [ ] Protected routes reject without token
- [ ] Protected routes accept valid token
- [ ] Token refresh works
- [ ] Invalid tokens return 401

---

### 0.3.0-alpha.5: WebSocket Server

**Files to create:**

```
src/gateway/
├── websocket.ts              # WebSocket server setup
└── handlers/
    └── ws-handler.ts         # WebSocket message handler
```

**WebSocket setup:**

```typescript
// src/gateway/websocket.ts
import { WebSocketServer } from 'ws';
import { createLogger } from '@/utils/logger';

const log = createLogger('websocket');

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    log.info('Client connected');

    ws.on('message', (data) => {
      // Parse and handle message
      const message = JSON.parse(data.toString());
      handleWsMessage(ws, message);
    });

    ws.on('close', () => {
      log.info('Client disconnected');
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  return wss;
}
```

**Acceptance criteria:**
- [ ] WebSocket connects at ws://localhost:3000/ws
- [ ] Server sends 'connected' message
- [ ] Messages can be sent/received
- [ ] Disconnection handled cleanly

---

## Testing Checkpoint

### Manual Tests

```bash
# Test 1: Health endpoints
curl http://localhost:3000/health/live
# Expected: {"status":"ok"}

curl http://localhost:3000/health/ready
# Expected: {"status":"ready","database":"ok"}

# Test 2: Authentication
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hotel.com","password":"test123"}'
# Expected: {"accessToken":"...","refreshToken":"..."}

# Test 3: Protected route
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer <token>"
# Expected: User data

# Test 4: WebSocket (use wscat)
wscat -c ws://localhost:3000/ws
# Expected: {"type":"connected",...}
```

### Automated Tests

```bash
pnpm test
# Expected: Gateway tests pass, coverage >= 60%
```

---

## Exit Criteria

Phase 2 is complete when:

1. **HTTP server responds** to health checks
2. **Error handling** returns structured JSON
3. **Validation** rejects invalid requests
4. **JWT auth** protects routes
5. **WebSocket** accepts connections

---

## Dependencies

**Add to package.json:**

```json
{
  "dependencies": {
    "hono": "^4.6.0",
    "jose": "^5.9.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.0"
  }
}
```

---

## Next Phase

After Phase 2, proceed to [Phase 3: Pipeline](phase-3-pipeline.md) to add message processing flow.

---

## Checklist for Claude Code

```markdown
## Phase 2 Implementation Checklist

### 0.3.0-alpha.1: HTTP Server
- [ ] Install hono
- [ ] Create src/gateway/server.ts
- [ ] Create src/gateway/routes/health.ts
- [ ] Create src/gateway/middleware/request-logger.ts
- [ ] Update src/index.ts to start server
- [ ] Verify: /health/live returns ok
- [ ] Verify: /health/ready checks database

### 0.3.0-alpha.2: Error Handling
- [ ] Create src/errors/index.ts
- [ ] Create AppError, NotFoundError, ValidationError
- [ ] Create src/gateway/middleware/error-handler.ts
- [ ] Verify: Errors return structured JSON
- [ ] Verify: Unknown errors don't leak details

### 0.3.0-alpha.3: Request Validation
- [ ] Create src/gateway/middleware/validator.ts
- [ ] Add validation to a test route
- [ ] Verify: Invalid body returns 400
- [ ] Verify: Valid body passes through

### 0.3.0-alpha.4: JWT Authentication
- [ ] Install jose
- [ ] Add JWT config to config schema
- [ ] Create src/gateway/middleware/auth.ts
- [ ] Create src/services/auth.ts
- [ ] Create POST /api/v1/auth/login
- [ ] Create POST /api/v1/auth/refresh
- [ ] Verify: Login returns tokens
- [ ] Verify: Protected routes work

### 0.3.0-alpha.5: WebSocket
- [ ] Install ws, @types/ws
- [ ] Create src/gateway/websocket.ts
- [ ] Integrate with HTTP server
- [ ] Verify: WebSocket connects
- [ ] Verify: Messages sent/received

### Phase 2 Complete
- [ ] All checks above pass
- [ ] Tests pass with >= 60% coverage
- [ ] Commit: "Phase 2: Gateway complete"
- [ ] Tag: v0.3.0
```
