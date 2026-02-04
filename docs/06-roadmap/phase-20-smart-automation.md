# Phase 20: Smart Automation

**Focus:** Fix automation foundation and enable AI-generated automation rules via natural language
**Risk:** Medium
**Depends on:** Phase 19 (demo data complete)
**Status:** BACKEND COMPLETE (UI in Phase 20.1)

---

## Problem Statement

1. **Automation system is disconnected** - Engine exists but never starts, events don't trigger rules
2. **Actions are stubbed** - `send_message`, `create_task`, `notify_staff` don't actually execute
3. **Complex UI for non-technical staff** - Current form-based UI requires understanding trigger types, offsets, configs
4. **Missing reservation events** - Event system doesn't include check-in/check-out events needed for automation

---

## Solution Overview

### Part A: Fix Foundation
1. Wire automation engine to app lifecycle
2. Connect event system to automation engine
3. Implement real action execution
4. Add missing reservation events

### Part B: AI-Generated Rules
1. Natural language input for automation creation
2. AI parses intent and generates rule config
3. Simplified UI for reviewing/editing created rules
4. Keep existing edit UI for fine-tuning

---

## Current State Analysis

### What Works
| Component | Status |
|-----------|--------|
| Database schema | ✅ Ready |
| API routes (CRUD) | ✅ Working |
| Engine logic | ✅ Written |
| Webhook action | ✅ Fully implemented |
| Execution logging | ✅ Working |

### What's Broken
| Component | Issue |
|-----------|-------|
| Engine startup | Never called in `src/index.ts` |
| Event connection | Events go to WebSocket only, not automation |
| `send_message` action | Stubbed - logs only |
| `create_task` action | Stubbed - generates fake ID |
| `notify_staff` action | Stubbed - logs only |
| Reservation events | Not defined in event types |
| Time offset calculation | Bug in after_arrival/after_departure |

---

## Implementation Plan

### Step 1: Add Reservation Events

**File:** `src/types/events.ts`

```typescript
// Add to EventTypes
RESERVATION_CREATED: 'reservation.created',
RESERVATION_UPDATED: 'reservation.updated',
RESERVATION_CHECKED_IN: 'reservation.checked_in',
RESERVATION_CHECKED_OUT: 'reservation.checked_out',
RESERVATION_CANCELLED: 'reservation.cancelled',

// Add interfaces
export interface ReservationCheckedInEvent extends BaseEvent {
  type: typeof EventTypes.RESERVATION_CHECKED_IN;
  reservationId: string;
  guestId: string;
  roomNumber: string;
}
// ... similar for other reservation events
```

**File:** `src/services/reservation.ts`

Emit events when reservation status changes:
```typescript
async checkIn(reservationId: string): Promise<Reservation> {
  // ... existing logic
  events.emit({
    type: EventTypes.RESERVATION_CHECKED_IN,
    reservationId,
    guestId: reservation.guestId,
    roomNumber: reservation.roomNumber,
    timestamp: new Date()
  });
  return reservation;
}
```

---

### Step 2: Wire Automation Engine Startup

**File:** `src/index.ts`

```typescript
import { automationEngine } from './automation/index.js';

// After HTTP server starts...
automationEngine.startScheduler();
log.info('Automation scheduler started');
```

---

### Step 3: Connect Events to Automation Engine

**File:** `src/automation/event-subscriber.ts` (new)

```typescript
import { events, EventTypes } from '../events/index.js';
import { automationEngine } from './index.js';

export function subscribeToEvents() {
  // Reservation events
  events.on(EventTypes.RESERVATION_CHECKED_IN, (event) => {
    automationEngine.evaluate({
      type: 'reservation.checked_in',
      data: { reservationId: event.reservationId, guestId: event.guestId },
      timestamp: event.timestamp
    });
  });

  events.on(EventTypes.RESERVATION_CHECKED_OUT, (event) => {
    automationEngine.evaluate({
      type: 'reservation.checked_out',
      data: { reservationId: event.reservationId, guestId: event.guestId },
      timestamp: event.timestamp
    });
  });

  // Conversation events
  events.on(EventTypes.CONVERSATION_ESCALATED, (event) => {
    automationEngine.evaluate({
      type: 'conversation.escalated',
      data: { conversationId: event.conversationId },
      timestamp: event.timestamp
    });
  });

  // Task events
  events.on(EventTypes.TASK_CREATED, (event) => {
    automationEngine.evaluate({
      type: 'task.created',
      data: { taskId: event.taskId, department: event.department },
      timestamp: event.timestamp
    });
  });

  // ... other events
}
```

**File:** `src/index.ts`

```typescript
import { subscribeToEvents } from './automation/event-subscriber.js';

// After engine starts...
subscribeToEvents();
log.info('Automation event subscribers registered');
```

---

### Step 4: Implement Real Actions

**File:** `src/automation/actions.ts`

#### 4a: `send_message` Action

```typescript
import { ConversationService } from '../services/conversation.js';
import { getExtensionRegistry } from '../extensions/index.js';

async function executeSendMessage(config: SendMessageConfig, context: ExecutionContext) {
  const conversationService = new ConversationService();
  const registry = getExtensionRegistry();

  // Get or create conversation for guest
  let conversation = await conversationService.findActiveByGuestId(context.guest.id);
  if (!conversation) {
    conversation = await conversationService.create({
      guestId: context.guest.id,
      channel: config.channel === 'preferred' ? context.guest.preferredChannel : config.channel,
      channelId: context.guest.phone || context.guest.email,
    });
  }

  // Build message content from template
  const content = buildMessageContent(config, context);

  // Send via channel adapter
  const channel = registry.getChannelAdapter(conversation.channel);
  if (channel) {
    await channel.send({
      conversationId: conversation.id,
      content,
      contentType: 'text'
    });
  }

  // Store message in database
  await conversationService.addMessage(conversation.id, {
    content,
    direction: 'outbound',
    senderType: 'system',
    metadata: { automationRuleId: context.ruleId }
  });

  return { messageId: generateId('msg'), channel: conversation.channel };
}
```

#### 4b: `create_task` Action

```typescript
import { TaskService } from '../services/task.js';

async function executeCreateTask(config: CreateTaskConfig, context: ExecutionContext) {
  const taskService = new TaskService();

  const description = replaceVariables(config.description, context);

  const task = await taskService.create({
    type: config.type,
    department: config.department,
    description,
    priority: config.priority || 'standard',
    guestId: context.guest?.id,
    reservationId: context.reservation?.id,
    metadata: { automationRuleId: context.ruleId }
  });

  return { taskId: task.id };
}
```

#### 4c: `notify_staff` Action

```typescript
import { events, EventTypes } from '../events/index.js';

async function executeNotifyStaff(config: NotifyStaffConfig, context: ExecutionContext) {
  const message = replaceVariables(config.message, context);

  // Emit notification event (WebSocket bridge will push to dashboard)
  events.emit({
    type: EventTypes.STAFF_NOTIFICATION,
    payload: {
      role: config.role,
      staffId: config.staffId,
      message,
      priority: config.priority || 'standard',
      automationRuleId: context.ruleId
    },
    timestamp: new Date()
  });

  return { notificationSent: true };
}
```

---

### Step 5: Fix Time Offset Calculation Bug

**File:** `src/automation/triggers.ts`

```typescript
function calculateTargetDate(config: TimeTriggerConfig): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(today);

  switch (config.type) {
    case 'before_arrival':
      // offsetDays is positive (e.g., 3 = 3 days before)
      // We need arrivals that are offsetDays days from now
      targetDate.setDate(targetDate.getDate() + config.offsetDays);
      break;
    case 'after_arrival':
      // offsetDays is positive (e.g., 1 = 1 day after arrival)
      // We need arrivals that were offsetDays days ago
      targetDate.setDate(targetDate.getDate() - config.offsetDays);
      break;
    case 'before_departure':
      targetDate.setDate(targetDate.getDate() + config.offsetDays);
      break;
    case 'after_departure':
      targetDate.setDate(targetDate.getDate() - config.offsetDays);
      break;
  }

  return targetDate;
}
```

---

### Step 6: Schema Update for Action Chaining & Retry Logic

**File:** `src/db/schema.ts`

```typescript
// Change from single action to array with execution settings
export const automationRules = sqliteTable('automation_rules', {
  // ... existing fields ...

  // Replace single action with actions array
  // OLD: actionType: text('action_type').notNull(),
  // OLD: actionConfig: text('action_config').notNull(),

  // NEW: Array of actions with order and conditions
  actions: text('actions').notNull(), // JSON: ActionDefinition[]

  // Retry configuration
  retryConfig: text('retry_config'), // JSON: RetryConfig | null

  // Execution stats
  lastExecutionId: text('last_execution_id'),
  consecutiveFailures: integer('consecutive_failures').default(0),
});

// New table for tracking individual action executions
export const automationExecutions = sqliteTable('automation_executions', {
  id: text('id').primaryKey(),
  ruleId: text('rule_id').notNull().references(() => automationRules.id),
  triggeredAt: text('triggered_at').notNull(),
  status: text('status').notNull(), // 'pending' | 'running' | 'completed' | 'failed' | 'partial'

  // Track each action's result
  actionResults: text('action_results'), // JSON: ActionResult[]

  // Retry tracking
  attemptNumber: integer('attempt_number').default(1),
  nextRetryAt: text('next_retry_at'),
  errorMessage: text('error_message'),

  completedAt: text('completed_at'),
});
```

**Types for Action Chaining:**

```typescript
// src/automation/types.ts

export interface ActionDefinition {
  id: string;                    // Unique ID for this action in the chain
  type: 'send_message' | 'create_task' | 'notify_staff' | 'webhook';
  config: ActionConfig;
  order: number;                 // Execution order (1, 2, 3...)
  continueOnError?: boolean;     // If true, continue to next action even if this fails
  condition?: ActionCondition;   // Optional condition to run this action
}

export interface ActionCondition {
  type: 'previous_success' | 'previous_failed' | 'always' | 'expression';
  expression?: string;           // For complex conditions: "{{previousAction.taskId}} != null"
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;           // Max retry attempts (default: 3)
  backoffType: 'fixed' | 'exponential';
  initialDelayMs: number;        // Initial delay (default: 60000 = 1 min)
  maxDelayMs: number;            // Max delay cap (default: 3600000 = 1 hour)
  retryableErrors?: string[];    // Only retry on specific error types
}

export interface ActionResult {
  actionId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: Record<string, unknown>;  // e.g., { taskId: 'tsk_123' }
  error?: string;
  executedAt: string;
  durationMs: number;
}
```

**Migration:** Convert existing rules to new format (wrap single action in array).

---

### Step 7: Implement Action Chain Executor

**File:** `src/automation/chain-executor.ts` (new)

```typescript
import { ActionDefinition, ActionResult, ExecutionContext } from './types.js';
import { executeAction } from './actions.js';
import { logger } from '../utils/logger.js';

export async function executeActionChain(
  actions: ActionDefinition[],
  context: ExecutionContext
): Promise<{ status: 'completed' | 'failed' | 'partial'; results: ActionResult[] }> {
  const results: ActionResult[] = [];
  const sortedActions = [...actions].sort((a, b) => a.order - b.order);

  let chainContext = { ...context, previousResults: {} as Record<string, ActionResult> };
  let hasFailure = false;
  let hasSuccess = false;

  for (const action of sortedActions) {
    // Check condition
    if (!shouldExecuteAction(action, chainContext)) {
      results.push({
        actionId: action.id,
        status: 'skipped',
        executedAt: new Date().toISOString(),
        durationMs: 0,
      });
      continue;
    }

    const startTime = Date.now();

    try {
      const output = await executeAction(action.type, action.config, chainContext);

      const result: ActionResult = {
        actionId: action.id,
        status: 'success',
        output,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };

      results.push(result);
      chainContext.previousResults[action.id] = result;
      hasSuccess = true;

    } catch (error) {
      hasFailure = true;

      const result: ActionResult = {
        actionId: action.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };

      results.push(result);
      chainContext.previousResults[action.id] = result;

      // Stop chain if continueOnError is false (default)
      if (!action.continueOnError) {
        logger.warn('Action chain stopped due to failure', {
          ruleId: context.ruleId,
          failedActionId: action.id,
        });
        break;
      }
    }
  }

  // Determine overall status
  let status: 'completed' | 'failed' | 'partial';
  if (!hasFailure) {
    status = 'completed';
  } else if (!hasSuccess) {
    status = 'failed';
  } else {
    status = 'partial';
  }

  return { status, results };
}

function shouldExecuteAction(
  action: ActionDefinition,
  context: ExecutionContext & { previousResults: Record<string, ActionResult> }
): boolean {
  if (!action.condition) return true;

  const previousResults = Object.values(context.previousResults);
  const lastResult = previousResults[previousResults.length - 1];

  switch (action.condition.type) {
    case 'always':
      return true;
    case 'previous_success':
      return lastResult?.status === 'success';
    case 'previous_failed':
      return lastResult?.status === 'failed';
    case 'expression':
      return evaluateConditionExpression(action.condition.expression!, context);
    default:
      return true;
  }
}

function evaluateConditionExpression(
  expression: string,
  context: ExecutionContext & { previousResults: Record<string, ActionResult> }
): boolean {
  // Simple expression evaluation for conditions like:
  // "{{actions.send_welcome.output.messageId}} != null"
  try {
    const resolved = replaceExpressionVariables(expression, context);
    // Use safe evaluation (no eval)
    return simpleConditionEvaluator(resolved);
  } catch {
    return false;
  }
}
```

---

### Step 8: Implement Retry Logic

**File:** `src/automation/retry-handler.ts` (new)

```typescript
import { db } from '../db/index.js';
import { automationExecutions, automationRules } from '../db/schema.js';
import { eq, and, lte, isNotNull } from 'drizzle-orm';
import { executeActionChain } from './chain-executor.js';
import { logger } from '../utils/logger.js';
import type { RetryConfig } from './types.js';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  enabled: true,
  maxAttempts: 3,
  backoffType: 'exponential',
  initialDelayMs: 60000,      // 1 minute
  maxDelayMs: 3600000,        // 1 hour
};

export function calculateNextRetryDelay(
  attemptNumber: number,
  config: RetryConfig
): number {
  if (config.backoffType === 'fixed') {
    return config.initialDelayMs;
  }

  // Exponential backoff: delay = initialDelay * 2^(attempt-1)
  const delay = config.initialDelayMs * Math.pow(2, attemptNumber - 1);

  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);

  return Math.min(delay + jitter, config.maxDelayMs);
}

export async function scheduleRetry(
  executionId: string,
  ruleId: string,
  attemptNumber: number,
  error: string
): Promise<void> {
  const rule = await db.query.automationRules.findFirst({
    where: eq(automationRules.id, ruleId),
  });

  if (!rule) return;

  const retryConfig: RetryConfig = rule.retryConfig
    ? JSON.parse(rule.retryConfig)
    : DEFAULT_RETRY_CONFIG;

  if (!retryConfig.enabled || attemptNumber >= retryConfig.maxAttempts) {
    // Max retries reached - mark as permanently failed
    await db.update(automationExecutions)
      .set({
        status: 'failed',
        errorMessage: `Max retries (${retryConfig.maxAttempts}) exceeded. Last error: ${error}`,
      })
      .where(eq(automationExecutions.id, executionId));

    // Update consecutive failures counter
    await db.update(automationRules)
      .set({
        consecutiveFailures: (rule.consecutiveFailures || 0) + 1,
      })
      .where(eq(automationRules.id, ruleId));

    logger.warn('Automation permanently failed after max retries', {
      ruleId,
      executionId,
      attempts: attemptNumber,
    });

    return;
  }

  const nextDelay = calculateNextRetryDelay(attemptNumber, retryConfig);
  const nextRetryAt = new Date(Date.now() + nextDelay);

  await db.update(automationExecutions)
    .set({
      status: 'pending',
      attemptNumber: attemptNumber + 1,
      nextRetryAt: nextRetryAt.toISOString(),
      errorMessage: error,
    })
    .where(eq(automationExecutions.id, executionId));

  logger.info('Scheduled automation retry', {
    ruleId,
    executionId,
    attemptNumber: attemptNumber + 1,
    nextRetryAt: nextRetryAt.toISOString(),
    delayMs: nextDelay,
  });
}

/**
 * Process pending retries - called by scheduler
 */
export async function processPendingRetries(): Promise<void> {
  const now = new Date().toISOString();

  const pendingRetries = await db.query.automationExecutions.findMany({
    where: and(
      eq(automationExecutions.status, 'pending'),
      isNotNull(automationExecutions.nextRetryAt),
      lte(automationExecutions.nextRetryAt, now)
    ),
    limit: 10, // Process in batches
  });

  for (const execution of pendingRetries) {
    await retryExecution(execution);
  }
}

async function retryExecution(execution: typeof automationExecutions.$inferSelect): Promise<void> {
  const rule = await db.query.automationRules.findFirst({
    where: eq(automationRules.id, execution.ruleId),
  });

  if (!rule || !rule.enabled) {
    await db.update(automationExecutions)
      .set({ status: 'failed', errorMessage: 'Rule disabled or deleted' })
      .where(eq(automationExecutions.id, execution.id));
    return;
  }

  logger.info('Retrying automation execution', {
    ruleId: rule.id,
    executionId: execution.id,
    attempt: execution.attemptNumber,
  });

  await db.update(automationExecutions)
    .set({ status: 'running', nextRetryAt: null })
    .where(eq(automationExecutions.id, execution.id));

  try {
    const actions = JSON.parse(rule.actions);
    const context = buildExecutionContext(rule, execution);

    const { status, results } = await executeActionChain(actions, context);

    await db.update(automationExecutions)
      .set({
        status,
        actionResults: JSON.stringify(results),
        completedAt: new Date().toISOString(),
        errorMessage: null,
      })
      .where(eq(automationExecutions.id, execution.id));

    // Reset consecutive failures on success
    if (status === 'completed') {
      await db.update(automationRules)
        .set({ consecutiveFailures: 0 })
        .where(eq(automationRules.id, rule.id));
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await scheduleRetry(execution.id, rule.id, execution.attemptNumber || 1, errorMessage);
  }
}
```

---

### Step 9: Update Scheduler for Retries

**File:** `src/automation/scheduler.ts` (modify)

```typescript
import { processPendingRetries } from './retry-handler.js';

export function startScheduler() {
  // Existing: Check time-based rules every 60 seconds
  setInterval(() => {
    evaluateTimeBasedRules();
  }, 60000);

  // NEW: Process pending retries every 30 seconds
  setInterval(() => {
    processPendingRetries();
  }, 30000);

  logger.info('Automation scheduler started with retry processing');
}
```

---

### Step 10: AI Rule Generation API

**File:** `src/gateway/routes/automation.ts`

```typescript
/**
 * POST /api/v1/automation/generate
 * Generate automation rule from natural language (supports action chaining)
 */
automationRoutes.post('/generate', requireAuth, async (c) => {
  const { prompt } = await c.req.json();

  const aiProvider = getExtensionRegistry().getCompletionProvider();

  const systemPrompt = `You are an automation rule generator for a hotel management system.
Given a natural language description, generate a JSON automation rule.

Available trigger types:
- time_based: {type: 'before_arrival'|'after_arrival'|'before_departure'|'after_departure', offsetDays: number, time: 'HH:MM'}
- event_based: {eventType: 'reservation.checked_in'|'reservation.checked_out'|'conversation.escalated'|'task.created'}

Available action types (can chain multiple):
- send_message: {template: 'custom', message: string, channel: 'preferred'|'sms'|'email'|'whatsapp'}
- create_task: {type: string, department: string, description: string, priority: 'low'|'standard'|'high'|'urgent'}
- notify_staff: {role: string, message: string}
- webhook: {url: string, method: 'GET'|'POST', bodyTemplate: string}

Action chaining: Actions array with order (1,2,3...). Each action can have:
- continueOnError: boolean (continue chain if this action fails)
- condition: {type: 'previous_success'|'previous_failed'|'always'} (when to run)

Retry config (optional):
- retryConfig: {enabled: true, maxAttempts: 3, backoffType: 'exponential'|'fixed', initialDelayMs: 60000}

Variables available: {{firstName}}, {{lastName}}, {{roomNumber}}, {{arrivalDate}}, {{departureDate}}
Chain variables: {{actions.ACTION_ID.output.FIELD}} to reference previous action outputs

Return ONLY valid JSON, no explanation.`;

  const response = await aiProvider.complete({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    maxTokens: 1000,
    temperature: 0.3
  });

  const rule = JSON.parse(response.content);

  return c.json({ rule });
});
```

---

### Step 11: Simplified Dashboard UI

**File:** `apps/dashboard/src/pages/settings/automations/AutomationCreate.tsx` (new)

```tsx
export function AutomationCreate() {
  const [prompt, setPrompt] = useState('');
  const [generatedRule, setGeneratedRule] = useState(null);

  const generateMutation = useMutation({
    mutationFn: (prompt: string) => api.post('/automation/generate', { prompt }),
    onSuccess: (data) => setGeneratedRule(data.rule)
  });

  const createMutation = useMutation({
    mutationFn: (rule) => api.post('/automation/rules', rule)
  });

  return (
    <div>
      {/* Step 1: Natural language input */}
      {!generatedRule && (
        <Card>
          <CardHeader>
            <CardTitle>What would you like to automate?</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Send a welcome message 2 days before arrival"
              rows={3}
            />
            <Button onClick={() => generateMutation.mutate(prompt)}>
              Generate Automation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review generated rule */}
      {generatedRule && (
        <Card>
          <CardHeader>
            <CardTitle>Review Automation</CardTitle>
          </CardHeader>
          <CardContent>
            <RuleSummary rule={generatedRule} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGeneratedRule(null)}>
                Start Over
              </Button>
              <Button onClick={() => navigate(`/settings/automations/${generatedRule.id}/edit`)}>
                Edit Details
              </Button>
              <Button onClick={() => createMutation.mutate(generatedRule)}>
                Create Automation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Component:** `RuleSummary` - Human-readable display of rule:
```
Trigger: 2 days before arrival at 10:00 AM
Action: Send message via guest's preferred channel
Message: "Hi {{firstName}}, we're excited to welcome you..."
```

---

## File Changes Summary

### New Files
```
src/automation/event-subscriber.ts     # Event to automation bridge
src/automation/chain-executor.ts       # Action chain execution logic
src/automation/retry-handler.ts        # Retry scheduling and processing
src/automation/types.ts                # TypeScript types for actions/retries
apps/dashboard/src/pages/settings/automations/AutomationCreate.tsx
```

### Modified Files
```
src/index.ts                           # Start engine, subscribe to events
src/automation/index.ts                # Export engine instance
src/automation/actions.ts              # Implement real actions
src/automation/triggers.ts             # Fix time calculation
src/automation/scheduler.ts            # Add retry processing interval
src/services/reservation.ts            # Emit reservation events
src/gateway/routes/automation.ts       # Add /generate endpoint
src/db/schema.ts                       # Actions array + retry config + executions table
src/types/events.ts                    # Add reservation events
apps/dashboard/src/pages/settings/automations/Automations.tsx  # Link to new create page
apps/dashboard/src/locales/*/common.json  # New translations
```

---

## Acceptance Criteria

### Foundation (Part A)
- [ ] Automation engine starts on app boot
- [ ] Time-based rules execute on schedule (every 60s check)
- [ ] Event-based rules trigger on reservation check-in/check-out
- [ ] `send_message` actually sends via channel adapter
- [ ] `create_task` creates real task in database
- [ ] `notify_staff` broadcasts to dashboard
- [ ] Execution logs show real results
- [ ] Time offset calculation works for all trigger types

### Action Chaining (Part B)
- [ ] Rules support multiple actions in defined order
- [ ] Actions execute sequentially in order
- [ ] `continueOnError` allows chain to continue after failure
- [ ] Conditions (`previous_success`, `previous_failed`) control execution
- [ ] Previous action outputs accessible via `{{actions.ID.output.field}}`
- [ ] Partial success status when some actions succeed and others fail
- [ ] Execution logs show per-action results

### Retry Logic (Part C)
- [ ] Failed actions schedule retry automatically
- [ ] Exponential backoff with jitter (1min → 2min → 4min...)
- [ ] Max retry attempts configurable per rule (default: 3)
- [ ] Retry processing runs every 30 seconds
- [ ] Consecutive failures counter tracks problematic rules
- [ ] Retries respect rule enabled/disabled status

### AI Generation (Part D)
- [ ] `POST /api/v1/automation/generate` parses natural language
- [ ] Generated rules support action chaining
- [ ] Generated rules include retry config when appropriate
- [ ] Simple create UI with text input
- [ ] Review screen shows human-readable summary
- [ ] Can edit generated rule before saving
- [ ] Can navigate to full edit UI for fine-tuning

---

## Test Cases

### Time-Based Trigger Test
1. Create rule: "Send welcome 1 day before arrival at 10:00"
2. Create reservation arriving tomorrow
3. Wait for scheduler to run at 10:00
4. Verify message sent to guest

### Event-Based Trigger Test
1. Create rule: "Create follow-up task when guest checks in"
2. Check in a guest
3. Verify task created in database

### Action Chaining Test
1. Create rule with 3 actions:
   - Action 1: `send_message` (order: 1)
   - Action 2: `create_task` (order: 2, condition: previous_success)
   - Action 3: `notify_staff` (order: 3)
2. Trigger the rule
3. Verify all 3 actions execute in order
4. Verify action 2 skipped if action 1 fails (when continueOnError=false)
5. Verify execution log shows per-action status

### Action Chain with Continue on Error
1. Create rule with `continueOnError: true` on first action
2. First action fails (e.g., webhook to invalid URL)
3. Verify second action still executes
4. Verify final status is "partial"

### Retry Logic Test
1. Create rule with action that fails (webhook to offline server)
2. Verify execution marked as "pending" with `nextRetryAt`
3. Wait for retry processor
4. Verify retry attempt logged with `attemptNumber: 2`
5. After 3 failures, verify status is "failed" permanently
6. Verify `consecutiveFailures` counter incremented

### Retry Backoff Test
1. Create rule with exponential backoff config
2. Trigger failure
3. Verify delays: ~1min → ~2min → ~4min (with jitter)
4. Verify delays capped at maxDelayMs

### AI Generation Test
1. Input: "Remind guests about checkout at 8am on their last day"
2. Verify generated rule:
   - triggerType: `time_based`
   - triggerConfig: `{type: 'before_departure', offsetDays: 0, time: '08:00'}`
   - actions: `[{type: 'send_message', order: 1, ...}]`

### AI Generation with Chaining Test
1. Input: "When a guest checks in, send a welcome message and create a follow-up task for concierge"
2. Verify generated rule:
   - triggerType: `event_based`
   - triggerConfig: `{eventType: 'reservation.checked_in'}`
   - actions: 2 actions with order 1 and 2
   - retryConfig: `{enabled: true, ...}`

---

## Estimated Effort

| Step | Hours | Notes |
|------|-------|-------|
| Step 1: Reservation events | 2h | Add types + emit from service |
| Step 2: Wire engine startup | 0.5h | Simple import + call |
| Step 3: Event subscriber | 2h | Bridge events to engine |
| Step 4: Implement actions | 4-6h | Real send/task/notify logic |
| Step 5: Fix time calculation | 1h | Bug fix |
| Step 6: Schema + types | 3h | Actions array, retry config, executions table, migration |
| Step 7: Chain executor | 4h | Sequential execution, conditions, variable resolution |
| Step 8: Retry handler | 4h | Backoff calculation, scheduling, retry processing |
| Step 9: Update scheduler | 1h | Add retry processing interval |
| Step 10: AI generation API | 3h | Prompt engineering + endpoint |
| Step 11: Simplified UI | 4h | Create page + review component |
| Testing | 5h | End-to-end verification including chaining/retry |
| **Total** | **33-36h** | ~4-5 days |

---

## Future Enhancements (Out of Scope)

- Rate limiting per guest/rule
- Complex conditions ($gt, $lt, $in operators)
- Rule templates library
- A/B testing for messages
- Analytics on automation performance
- Parallel action execution (actions run concurrently instead of sequentially)
- Circuit breaker pattern (auto-disable rules with high failure rates)

---

## Related

- [Phase 19: Demo Data](phase-19-demo-data.md)
- [Automation Use Cases](../02-use-cases/operations/automation.md)
- [Event System](../../src/events/index.ts)
