# Phase 14: Real-Time Dashboard

**Version:** 1.5.0
**Codename:** Pulse
**Focus:** Replace polling with WebSocket push for instant dashboard updates

---

## Goal

Eliminate polling from the dashboard and use WebSocket push notifications for real-time updates. This provides:
- Instant badge updates (no 30-second delay)
- Reduced server load (no unnecessary requests)
- Better scalability for multi-user scenarios
- Foundation for real-time collaboration features

---

## Architecture

### Current: Polling (Inefficient)

```
Dashboard                                    Server
    │                                           │
    ├──[GET /tasks/stats]──────────────────────►│
    ├──[GET /approvals/stats]──────────────────►│
    ├──[GET /conversations/stats]──────────────►│
    │         (repeat every 30 seconds)         │
```

**Problems:** 3 requests/30s per user, 0-30s delay, wasted bandwidth

### Target: Event-Driven WebSocket Push

```
Services ──[emit]──► EventBus ──► WebSocketBridge ──► broadcast()
                                                           │
Dashboard ◄───────────────────────────────────────────────┘
```

**Benefits:** Single connection, instant updates, no wasted requests

---

## Key Insight: Event System Already Exists

The codebase already has a typed event system (`src/events/`) with services emitting events:

| Event | Emitted When |
|-------|--------------|
| `task.created` | Task created |
| `task.completed` | Task completed |
| `conversation.updated` | State changes |
| `conversation.escalated` | Escalation triggered |
| `approval.queued` | Item queued for approval |
| `approval.decided` | Item approved/rejected |

**We don't need to modify services.** We just need a bridge that subscribes to these events and broadcasts to WebSocket clients.

---

## Implementation Plan

### Backend: WebSocket Event Bridge

#### 1. Create Bridge Module

**File:** `src/gateway/websocket-bridge.ts`

```typescript
/**
 * WebSocket Event Bridge
 *
 * Subscribes to domain events and broadcasts updates to connected clients.
 * This keeps services decoupled from WebSocket infrastructure.
 */

import { events, EventTypes } from '@/events/index.js';
import { broadcast } from './websocket.js';
import { taskService } from '@/services/task.js';
import { conversationService } from '@/services/conversation.js';
import { getApprovalQueue } from '@/core/approval-queue.js';
import { createLogger } from '@/utils/logger.js';

const log = createLogger('websocket-bridge');

/**
 * Setup event listeners that bridge domain events to WebSocket broadcasts
 */
export function setupWebSocketBridge() {
  log.info('Setting up WebSocket event bridge');

  // ─────────────────────────────────────────────────────────────
  // Task Events
  // ─────────────────────────────────────────────────────────────

  const broadcastTaskStats = async () => {
    try {
      const stats = await taskService.getStats();
      broadcast({ type: 'stats:tasks', payload: stats });
    } catch (error) {
      log.error({ error }, 'Failed to broadcast task stats');
    }
  };

  events.on(EventTypes.TASK_CREATED, broadcastTaskStats);
  events.on(EventTypes.TASK_ASSIGNED, broadcastTaskStats);
  events.on(EventTypes.TASK_COMPLETED, broadcastTaskStats);

  // ─────────────────────────────────────────────────────────────
  // Conversation Events
  // ─────────────────────────────────────────────────────────────

  const broadcastConversationStats = async () => {
    try {
      const stats = await conversationService.getStats();
      broadcast({ type: 'stats:conversations', payload: stats });
    } catch (error) {
      log.error({ error }, 'Failed to broadcast conversation stats');
    }
  };

  events.on(EventTypes.CONVERSATION_CREATED, broadcastConversationStats);
  events.on(EventTypes.CONVERSATION_UPDATED, broadcastConversationStats);
  events.on(EventTypes.CONVERSATION_ESCALATED, broadcastConversationStats);
  events.on(EventTypes.CONVERSATION_RESOLVED, broadcastConversationStats);

  // ─────────────────────────────────────────────────────────────
  // Approval Events
  // ─────────────────────────────────────────────────────────────

  const broadcastApprovalStats = async () => {
    try {
      const queue = getApprovalQueue();
      const stats = await queue.getStats();
      broadcast({ type: 'stats:approvals', payload: stats });
    } catch (error) {
      log.error({ error }, 'Failed to broadcast approval stats');
    }
  };

  events.on(EventTypes.APPROVAL_QUEUED, broadcastApprovalStats);
  events.on(EventTypes.APPROVAL_DECIDED, broadcastApprovalStats);
  events.on(EventTypes.APPROVAL_EXECUTED, broadcastApprovalStats);

  log.info('WebSocket event bridge ready');
}
```

#### 2. Send Initial Stats on Connect

**File:** `src/gateway/websocket.ts` (modify existing)

Add to the connection handler after authentication:

```typescript
import { taskService } from '@/services/task.js';
import { conversationService } from '@/services/conversation.js';
import { getApprovalQueue } from '@/core/approval-queue.js';

// Inside wss.on('connection', ...) after successful auth:
if (ws.userId) {
  // Send initial stats so client has data immediately
  try {
    const [taskStats, approvalStats, convStats] = await Promise.all([
      taskService.getStats(),
      getApprovalQueue().getStats(),
      conversationService.getStats(),
    ]);

    sendMessage(ws, { type: 'stats:tasks', payload: taskStats });
    sendMessage(ws, { type: 'stats:approvals', payload: approvalStats });
    sendMessage(ws, { type: 'stats:conversations', payload: convStats });
  } catch (error) {
    log.error({ error }, 'Failed to send initial stats');
  }
}
```

#### 3. Initialize Bridge on Server Start

**File:** `src/gateway/index.ts` (modify existing)

```typescript
import { setupWebSocketBridge } from './websocket-bridge.js';

// After setting up WebSocket server:
setupWebSocketBridge();
```

---

### Frontend: WebSocket Hook

#### 1. Create WebSocket Hook

**File:** `apps/dashboard/src/hooks/useWebSocket.ts`

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

interface WSMessage {
  type: string;
  payload?: unknown;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number>();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'stats:tasks':
        queryClient.setQueryData(['taskStats'], message.payload);
        break;
      case 'stats:approvals':
        queryClient.setQueryData(['approvalStats'], { stats: message.payload });
        break;
      case 'stats:conversations':
        queryClient.setQueryData(['conversationStats'], message.payload);
        break;
      case 'connected':
        console.log('WebSocket connected');
        break;
    }
  }, [queryClient]);

  const connect = useCallback(() => {
    const token = api.getToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code);
        // Reconnect after 3 seconds (unless intentional close)
        if (event.code !== 1000) {
          reconnectTimeout.current = window.setTimeout(connect, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [handleMessage]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
    };
  }, [isAuthenticated, connect]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
  };
}
```

#### 2. Use Hook in Layout

**File:** `apps/dashboard/src/components/layout/Layout.tsx` (modify existing)

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

export function Layout() {
  // Connect to WebSocket for real-time updates
  useWebSocket();

  // Keep queries but remove polling - data comes via WebSocket
  const { data: taskStats } = useQuery({
    queryKey: ['taskStats'],
    queryFn: () => api.get('/tasks/stats'),
    staleTime: Infinity, // Don't refetch - WebSocket updates
    // REMOVE: refetchInterval: 30000,
  });

  const { data: approvalStats } = useQuery({
    queryKey: ['approvalStats'],
    queryFn: () => api.get('/approvals/stats'),
    staleTime: Infinity,
    // REMOVE: refetchInterval: 30000,
  });

  const { data: conversationStats } = useQuery({
    queryKey: ['conversationStats'],
    queryFn: () => api.get('/conversations/stats'),
    staleTime: Infinity,
    // REMOVE: refetchInterval: 30000,
  });

  // ... rest of component
}
```

---

## Files Summary

### Create

| File | Purpose |
|------|---------|
| `src/gateway/websocket-bridge.ts` | Event-to-WebSocket bridge |
| `apps/dashboard/src/hooks/useWebSocket.ts` | WebSocket connection hook |

### Modify

| File | Changes |
|------|---------|
| `src/gateway/websocket.ts` | Send initial stats on connect |
| `src/gateway/index.ts` | Call `setupWebSocketBridge()` |
| `apps/dashboard/src/components/layout/Layout.tsx` | Use hook, remove polling |

### No Changes Needed

| File | Why |
|------|-----|
| `src/services/task.ts` | Already emits events |
| `src/services/conversation.ts` | Already emits events |
| `src/core/approval-queue.ts` | Already emits events |

---

## Why This Architecture Is Clean

| Principle | How It's Achieved |
|-----------|-------------------|
| **Single Responsibility** | Bridge only handles event→WebSocket translation |
| **Open/Closed** | Add new events without modifying services |
| **Dependency Inversion** | Services don't know about WebSocket |
| **Loose Coupling** | Event bus decouples producers from consumers |
| **Testability** | Mock event bus to test bridge in isolation |

---

## Migration Strategy

### Phase A: Add Bridge (Backend)
1. Create `websocket-bridge.ts`
2. Initialize in server startup
3. Add initial stats on connect
4. **Keep frontend polling as fallback**

### Phase B: Add Hook (Frontend)
1. Create `useWebSocket` hook
2. Add to Layout (alongside polling)
3. Verify stats update via WebSocket

### Phase C: Remove Polling
1. Remove `refetchInterval` from queries
2. Set `staleTime: Infinity`
3. Verify no polling in Network tab

---

## Testing

```bash
# Terminal 1: Watch WebSocket
wscat -c "ws://localhost:3000/ws?token=YOUR_TOKEN"

# Terminal 2: Create a task
curl -X POST localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"housekeeping","department":"housekeeping","description":"Test task"}'

# Terminal 1 should show:
# {"type":"stats:tasks","payload":{"pending":1,"inProgress":0,"completed":0,"total":1}}
```

---

## Future Enhancements

Once this foundation is solid:

| Feature | Description |
|---------|-------------|
| **Granular subscriptions** | Subscribe to specific topics (e.g., only tasks) |
| **User-specific events** | Send events only to relevant users |
| **Presence** | Show who's online, who's viewing what |
| **Typing indicators** | Real-time typing in conversations |
| **Optimistic updates** | Update UI before server confirms |

---

## Acceptance Criteria

- [ ] `websocket-bridge.ts` subscribes to all relevant events
- [ ] Initial stats sent when client connects
- [ ] `useWebSocket` hook connects and handles messages
- [ ] Badge counts update instantly on task/approval/conversation changes
- [ ] No polling requests visible in Network tab (after Phase C)
- [ ] WebSocket reconnects automatically after disconnect
- [ ] Works across multiple browser tabs
- [ ] No modifications to service files (task, conversation, approval-queue)
