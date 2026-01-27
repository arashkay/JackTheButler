# Phase 6: Operations

**Version:** 0.7.0
**Codename:** Operations
**Goal:** Staff dashboard and task management

---

## Overview

Phase 6 adds the staff interface. After this phase:

1. Staff can log in to dashboard
2. View and manage conversations
3. Tasks created from requests
4. Staff can respond to guests
5. **Hotel staff can operate Jack**

---

## Prerequisites

- Phase 5 complete (WhatsApp working)

---

## Deliverables

### 0.7.0-alpha.1: Dashboard Foundation

**Files to create:**

```
apps/dashboard/
├── package.json              # Dashboard package
├── vite.config.ts            # Vite configuration
├── index.html                # Entry HTML
├── src/
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Root component
│   ├── router.tsx            # React Router setup
│   ├── components/           # UI components
│   ├── pages/                # Page components
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities
│   └── styles/               # Tailwind styles
└── tsconfig.json             # TypeScript config
```

**Basic setup:**

```typescript
// apps/dashboard/src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

**Acceptance criteria:**
- [ ] Dashboard builds with Vite
- [ ] React Router navigation works
- [ ] TanStack Query configured
- [ ] Tailwind CSS working

---

### 0.7.0-alpha.2: Authentication UI

**Pages to create:**

```
apps/dashboard/src/pages/
├── Login.tsx                 # Login form
└── Layout.tsx                # Authenticated layout
```

**Login flow:**

```typescript
// apps/dashboard/src/pages/Login.tsx
export function LoginPage() {
  const [login, { isLoading }] = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await api.post('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      navigate('/');
    },
  });

  return (
    <form onSubmit={handleSubmit(login)}>
      <Input name="email" label="Email" />
      <Input name="password" label="Password" type="password" />
      <Button type="submit" loading={isLoading}>Sign In</Button>
    </form>
  );
}
```

**Acceptance criteria:**
- [ ] Login form works
- [ ] Token stored in localStorage
- [ ] Protected routes redirect to login
- [ ] Logout clears token

---

### 0.7.0-alpha.3: Conversation List

**Components:**

```
apps/dashboard/src/
├── pages/
│   └── Conversations.tsx     # Conversation list page
└── components/
    ├── ConversationList.tsx  # List component
    └── ConversationItem.tsx  # List item
```

**Conversation list:**

```typescript
// apps/dashboard/src/pages/Conversations.tsx
export function ConversationsPage() {
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/conversations').then(r => r.data),
  });

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r">
        <ConversationList
          conversations={conversations}
          selected={selectedId}
          onSelect={setSelectedId}
        />
      </aside>
      <main className="flex-1">
        {selectedId && <ConversationView id={selectedId} />}
      </main>
    </div>
  );
}
```

**Real-time updates via WebSocket:**

```typescript
// apps/dashboard/src/hooks/useConversationUpdates.ts
export function useConversationUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'conversation.updated') {
        queryClient.invalidateQueries(['conversations']);
      }

      if (data.type === 'message.new') {
        queryClient.invalidateQueries(['messages', data.conversationId]);
      }
    };

    return () => ws.close();
  }, []);
}
```

**Acceptance criteria:**
- [ ] Conversations list with status badges
- [ ] Click to view conversation
- [ ] Real-time updates via WebSocket
- [ ] Filter by status (active, escalated, resolved)

---

### 0.7.0-alpha.4: Conversation Detail View

**Components:**

```
apps/dashboard/src/components/
├── MessageList.tsx           # Messages display
├── MessageInput.tsx          # Staff reply input
└── ConversationHeader.tsx    # Guest info, actions
```

**Message display and reply:**

```typescript
// apps/dashboard/src/components/ConversationView.tsx
export function ConversationView({ id }: { id: string }) {
  const { data: conversation } = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => api.get(`/conversations/${id}`).then(r => r.data),
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => api.get(`/conversations/${id}/messages`).then(r => r.data),
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${id}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', id]);
    },
  });

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader conversation={conversation} />
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage.mutate} />
    </div>
  );
}
```

**Acceptance criteria:**
- [ ] Messages displayed chronologically
- [ ] Distinguish AI vs staff vs guest messages
- [ ] Staff can type and send replies
- [ ] Reply sent to guest via channel

---

### 0.7.0-alpha.5: Task Management

**Components:**

```
apps/dashboard/src/pages/
└── Tasks.tsx                 # Task queue page
apps/dashboard/src/components/
├── TaskList.tsx              # Task list
├── TaskCard.tsx              # Task card
└── TaskDetail.tsx            # Task detail modal
```

**Backend task endpoints:**

```typescript
// src/gateway/routes/tasks.ts
// GET /api/v1/tasks              - List tasks (with filters)
// GET /api/v1/tasks/:id          - Get task detail
// POST /api/v1/tasks             - Create task
// PATCH /api/v1/tasks/:id        - Update task
// POST /api/v1/tasks/:id/claim   - Claim task
// POST /api/v1/tasks/:id/complete - Complete task
```

**Task creation from AI:**

```typescript
// In AIResponder
if (intent.category === 'request.service') {
  const task = await taskService.create({
    type: intent.department,
    department: intent.department,
    description: message.content,
    conversationId: conversation.id,
    roomNumber: conversation.roomNumber,
    priority: intent.urgency || 'standard',
  });

  events.emit(EventTypes.TASK_CREATED, { taskId: task.id });
}
```

**Acceptance criteria:**
- [ ] Tasks displayed in queue
- [ ] Filter by department, status, priority
- [ ] Staff can claim tasks
- [ ] Staff can complete tasks
- [ ] Task linked to conversation

---

## Testing Checkpoint

### Manual Tests

1. Log in to dashboard
2. View conversation list
3. Click on a conversation
4. Send a reply as staff
5. Verify reply received by guest
6. Check task created from request
7. Claim and complete task

### Stakeholder Demo

**Demo script:**
1. Show login screen
2. Log in as front desk staff
3. Show incoming conversation from WhatsApp
4. View AI responses
5. Send manual reply
6. Show task queue
7. Complete a task

**Key message:** "Staff can now see all conversations and respond when needed."

---

## Exit Criteria

Phase 6 is complete when:

1. **Staff can log in** to dashboard
2. **Conversations visible** with real-time updates
3. **Staff can respond** to guests
4. **Tasks created** from service requests
5. **Tasks manageable** (claim, complete)

---

## Dependencies

**Dashboard dependencies:**

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "react-hook-form": "^7.54.0",
    "zod": "^3.24.0"
  }
}
```

---

## Next Phase

After Phase 6, proceed to [Phase 7: Integration](phase-7-integration.md) to add PMS sync.

---

## Checklist for Claude Code

```markdown
## Phase 6 Implementation Checklist

### 0.7.0-alpha.1: Dashboard Foundation
- [ ] Create apps/dashboard/ structure
- [ ] Configure Vite + React
- [ ] Set up Tailwind CSS
- [ ] Configure TanStack Query
- [ ] Verify: Dashboard runs with `pnpm dev:dashboard`

### 0.7.0-alpha.2: Authentication UI
- [ ] Create Login page
- [ ] Create authenticated Layout
- [ ] Implement token storage
- [ ] Add route protection
- [ ] Verify: Login/logout works

### 0.7.0-alpha.3: Conversation List
- [ ] Create ConversationList component
- [ ] Add real-time WebSocket updates
- [ ] Implement status filters
- [ ] Verify: Conversations display correctly

### 0.7.0-alpha.4: Conversation Detail
- [ ] Create MessageList component
- [ ] Create MessageInput component
- [ ] Implement staff reply
- [ ] Verify: Staff replies reach guests

### 0.7.0-alpha.5: Task Management
- [ ] Create Task API endpoints
- [ ] Create TaskList component
- [ ] Implement claim/complete flow
- [ ] Auto-create tasks from requests
- [ ] Verify: Tasks manageable

### Phase 6 Complete
- [ ] All checks above pass
- [ ] Staff can manage conversations
- [ ] Commit: "Phase 6: Operations dashboard complete"
- [ ] Tag: v0.7.0
```
