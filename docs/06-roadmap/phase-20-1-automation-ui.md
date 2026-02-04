# Phase 20.1: Automation UI Enhancements

**Focus:** Dashboard UI for AI-generated automations, action chaining, and retry configuration
**Risk:** Low
**Depends on:** Phase 20 backend (complete)
**Status:** PLANNED

---

## Problem Statement

Phase 20 backend is complete with full support for:
- AI-generated automation rules via `/api/v1/automation/generate`
- Action chaining (multiple sequential actions)
- Retry logic with exponential backoff
- Real message sending through conversations

However, the dashboard UI only supports basic single-action automations. Staff cannot:
1. Use natural language to create automations
2. Configure multiple actions in a chain
3. Set up retry policies
4. Write custom message templates

---

## Solution Overview

### 1. AI Generation Interface
- Natural language input field
- "Generate Automation" button
- Review generated rule before saving
- Option to edit or start over

### 2. Action Chain Builder
- Visual multi-step action builder
- Drag-and-drop reordering
- Condition configuration (previous_success, previous_failed)
- Continue on error toggle per action

### 3. Retry Configuration
- Enable/disable retries
- Max attempts slider
- Backoff type selector (fixed vs exponential)
- Delay configuration

### 4. Custom Message Editor
- Template selection dropdown
- Custom message textarea with variable picker
- Preview with sample data
- Variable reference: `{{firstName}}`, `{{roomNumber}}`, etc.

---

## Implementation Plan

### Step 1: AI Generation Component

**File:** `apps/dashboard/src/components/automations/AIAutomationGenerator.tsx`

```tsx
export function AIAutomationGenerator({ onGenerate }: { onGenerate: (rule: AutomationRule) => void }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const examples = [
    "Send a welcome message 2 days before arrival",
    "Create a housekeeping task when guest checks out",
    "Notify the manager when a conversation is escalated",
    "Send checkout reminder at 8am on departure day"
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await api.post('/automation/generate', { prompt });
    onGenerate(result.rule);
    setIsGenerating(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {t('automations.aiGenerate.title')}
        </CardTitle>
        <CardDescription>{t('automations.aiGenerate.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('automations.aiGenerate.placeholder')}
          rows={3}
        />
        <div className="flex flex-wrap gap-2">
          {examples.map((example) => (
            <Badge
              key={example}
              variant="outline"
              className="cursor-pointer hover:bg-muted"
              onClick={() => setPrompt(example)}
            >
              {example}
            </Badge>
          ))}
        </div>
        <Button onClick={handleGenerate} disabled={!prompt || isGenerating}>
          {isGenerating ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4 me-2" />}
          {t('automations.aiGenerate.generate')}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Action Chain Builder Component

**File:** `apps/dashboard/src/components/automations/ActionChainBuilder.tsx`

```tsx
interface ActionItem {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
  order: number;
  continueOnError?: boolean;
  condition?: { type: 'always' | 'previous_success' | 'previous_failed' };
}

export function ActionChainBuilder({
  actions,
  onChange
}: {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}) {
  const addAction = () => {
    const newAction: ActionItem = {
      id: `action_${Date.now()}`,
      type: 'send_message',
      config: { template: 'custom', channel: 'preferred', message: '' },
      order: actions.length + 1,
    };
    onChange([...actions, newAction]);
  };

  const removeAction = (id: string) => {
    onChange(actions.filter(a => a.id !== id).map((a, i) => ({ ...a, order: i + 1 })));
  };

  const updateAction = (id: string, updates: Partial<ActionItem>) => {
    onChange(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  return (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <ActionCard
          key={action.id}
          action={action}
          index={index}
          isFirst={index === 0}
          onUpdate={(updates) => updateAction(action.id, updates)}
          onRemove={() => removeAction(action.id)}
        />
      ))}
      <Button variant="outline" onClick={addAction}>
        <Plus className="w-4 h-4 me-2" />
        {t('automations.addAction')}
      </Button>
    </div>
  );
}
```

### Step 3: Retry Configuration Component

**File:** `apps/dashboard/src/components/automations/RetryConfigEditor.tsx`

```tsx
interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
}

export function RetryConfigEditor({
  config,
  onChange
}: {
  config: RetryConfig;
  onChange: (config: RetryConfig) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('automations.retry.title')}</CardTitle>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onChange({ ...config, enabled })}
          />
        </div>
      </CardHeader>
      {config.enabled && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('automations.retry.maxAttempts')}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.maxAttempts}
                onChange={(e) => onChange({ ...config, maxAttempts: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('automations.retry.backoffType')}</Label>
              <Select
                value={config.backoffType}
                onValueChange={(v) => onChange({ ...config, backoffType: v as 'fixed' | 'exponential' })}
              >
                <SelectItem value="exponential">{t('automations.retry.exponential')}</SelectItem>
                <SelectItem value="fixed">{t('automations.retry.fixed')}</SelectItem>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('automations.retry.initialDelay')}</Label>
              <Select
                value={String(config.initialDelayMs)}
                onValueChange={(v) => onChange({ ...config, initialDelayMs: parseInt(v) })}
              >
                <SelectItem value="60000">1 minute</SelectItem>
                <SelectItem value="300000">5 minutes</SelectItem>
                <SelectItem value="900000">15 minutes</SelectItem>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('automations.retry.maxDelay')}</Label>
              <Select
                value={String(config.maxDelayMs)}
                onValueChange={(v) => onChange({ ...config, maxDelayMs: parseInt(v) })}
              >
                <SelectItem value="3600000">1 hour</SelectItem>
                <SelectItem value="14400000">4 hours</SelectItem>
                <SelectItem value="86400000">24 hours</SelectItem>
              </Select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
```

### Step 4: Custom Message Editor

**File:** `apps/dashboard/src/components/automations/MessageEditor.tsx`

```tsx
const VARIABLES = [
  { key: 'firstName', label: 'Guest First Name' },
  { key: 'lastName', label: 'Guest Last Name' },
  { key: 'roomNumber', label: 'Room Number' },
  { key: 'arrivalDate', label: 'Arrival Date' },
  { key: 'departureDate', label: 'Departure Date' },
];

export function MessageEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const insertVariable = (key: string) => {
    onChange(value + `{{${key}}}`);
  };

  const preview = VARIABLES.reduce(
    (msg, v) => msg.replace(new RegExp(`{{${v.key}}}`, 'g'), getSampleValue(v.key)),
    value
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('automations.message.content')}</Label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={t('automations.message.placeholder')}
        />
        <div className="flex flex-wrap gap-1">
          {VARIABLES.map((v) => (
            <Badge
              key={v.key}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20"
              onClick={() => insertVariable(v.key)}
            >
              {`{{${v.key}}}`}
            </Badge>
          ))}
        </div>
      </div>
      {value && (
        <div className="space-y-2">
          <Label>{t('automations.message.preview')}</Label>
          <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
            {preview}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Update AutomationEdit Page

**File:** `apps/dashboard/src/pages/settings/automations/AutomationEdit.tsx`

Integrate new components:
- Replace single action config with `ActionChainBuilder`
- Add `RetryConfigEditor` section
- Add `MessageEditor` for send_message actions
- Handle new data format with actions array

### Step 6: Create AI Generation Page

**File:** `apps/dashboard/src/pages/settings/automations/AutomationGenerate.tsx`

New page with:
1. `AIAutomationGenerator` component
2. Generated rule preview
3. Edit/Create/Discard buttons
4. Navigate to edit page for fine-tuning

### Step 7: Update Navigation

**File:** `apps/dashboard/src/pages/settings/automations/Automations.tsx`

- Add "AI Generate" button alongside "New Rule"
- Link to `/settings/automations/generate`

---

## File Changes Summary

### New Files
```
apps/dashboard/src/components/automations/AIAutomationGenerator.tsx
apps/dashboard/src/components/automations/ActionChainBuilder.tsx
apps/dashboard/src/components/automations/ActionCard.tsx
apps/dashboard/src/components/automations/RetryConfigEditor.tsx
apps/dashboard/src/components/automations/MessageEditor.tsx
apps/dashboard/src/pages/settings/automations/AutomationGenerate.tsx
```

### Modified Files
```
apps/dashboard/src/pages/settings/automations/Automations.tsx      # Add AI Generate button
apps/dashboard/src/pages/settings/automations/AutomationEdit.tsx   # Use new components
apps/dashboard/src/App.tsx                                         # Add route
apps/dashboard/src/locales/*/common.json                          # New translations
```

---

## Acceptance Criteria

### AI Generation UI
- [ ] Natural language input with example suggestions
- [ ] Loading state while generating
- [ ] Preview generated rule in human-readable format
- [ ] Can edit generated rule before saving
- [ ] Can start over with new prompt
- [ ] Error handling for failed generation

### Action Chain Builder
- [ ] Add multiple actions to a rule
- [ ] Remove actions from chain
- [ ] Reorder actions (drag-drop or buttons)
- [ ] Configure condition per action
- [ ] Configure continueOnError per action
- [ ] Visual connection between actions

### Retry Configuration
- [ ] Toggle retry enabled/disabled
- [ ] Configure max attempts
- [ ] Select backoff type
- [ ] Configure delay settings
- [ ] Settings saved with rule

### Custom Message Editor
- [ ] Textarea for custom message content
- [ ] Variable picker with insertable tags
- [ ] Live preview with sample data
- [ ] Works within action chain context

---

## Estimated Effort

| Step | Hours | Notes |
|------|-------|-------|
| Step 1: AI Generator | 3h | Component + API integration |
| Step 2: Action Chain Builder | 4h | Multi-action UI with reorder |
| Step 3: Retry Config Editor | 2h | Form with validation |
| Step 4: Message Editor | 2h | Textarea + variable picker + preview |
| Step 5: Update Edit Page | 3h | Integrate components, handle data format |
| Step 6: Generate Page | 2h | Flow with preview/edit/create |
| Step 7: Navigation + Routes | 1h | Button + routing |
| Testing | 2h | E2E flows |
| **Total** | **19h** | ~2-3 days |

---

## Related

- [Phase 20: Smart Automation](phase-20-smart-automation.md) (backend)
- [Automation UI Patterns](../03-architecture/ui-patterns.md)
