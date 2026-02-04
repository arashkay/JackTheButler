import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  ListTodo,
  Bell,
  Webhook,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { MessageEditor } from './MessageEditor';
import { useState } from 'react';

export type ActionType = 'send_message' | 'create_task' | 'notify_staff' | 'webhook';

export interface ActionItem {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
  order: number;
  continueOnError?: boolean;
  condition?: { type: 'always' | 'previous_success' | 'previous_failed' };
}

interface ActionCardProps {
  action: ActionItem;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<ActionItem>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const actionIcons: Record<ActionType, typeof MessageSquare> = {
  send_message: MessageSquare,
  create_task: ListTodo,
  notify_staff: Bell,
  webhook: Webhook,
};

const actionLabels: Record<ActionType, string> = {
  send_message: 'Send Message',
  create_task: 'Create Task',
  notify_staff: 'Notify Staff',
  webhook: 'Webhook',
};

const actionColors: Record<ActionType, string> = {
  send_message: 'bg-blue-500/10 text-blue-600 border-blue-200',
  create_task: 'bg-green-500/10 text-green-600 border-green-200',
  notify_staff: 'bg-amber-500/10 text-amber-600 border-amber-200',
  webhook: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

export function ActionCard({
  action,
  index,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ActionCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const Icon = actionIcons[action.type];

  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ config: { ...action.config, [key]: value } });
  };

  const channels = [
    { value: 'preferred', label: 'Guest Preferred' },
    { value: 'sms', label: 'SMS' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
  ];

  const taskTypes = [
    { value: 'housekeeping', label: 'Housekeeping' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'concierge', label: 'Concierge' },
    { value: 'room_service', label: 'Room Service' },
    { value: 'other', label: 'Other' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'standard', label: 'Standard' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const conditions = [
    { value: 'always', label: 'Always run' },
    { value: 'previous_success', label: 'Only if previous succeeded' },
    { value: 'previous_failed', label: 'Only if previous failed' },
  ];

  return (
    <Card className={cn('relative', actionColors[action.type])}>
      {/* Connector line */}
      {!isFirst && (
        <div className="absolute -top-4 left-8 w-0.5 h-4 bg-border" />
      )}

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <GripVertical className="w-4 h-4 cursor-grab" />
            <span className="text-sm font-medium w-5">{index + 1}</span>
          </div>

          <div className={cn('p-2 rounded-lg', actionColors[action.type])}>
            <Icon className="w-4 h-4" />
          </div>

          <div className="flex-1">
            <select
              className="bg-transparent font-medium text-sm border-none p-0 focus:ring-0"
              value={action.type}
              onChange={(e) => {
                const newType = e.target.value as ActionType;
                const defaultConfigs: Record<ActionType, Record<string, unknown>> = {
                  send_message: { template: 'custom', channel: 'preferred', message: '' },
                  create_task: { type: 'concierge', department: 'front_desk', description: '', priority: 'standard' },
                  notify_staff: { role: '', message: '', priority: 'standard' },
                  webhook: { url: '', method: 'POST' },
                };
                onUpdate({ type: newType, config: defaultConfigs[newType] });
              }}
            >
              {Object.entries(actionLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            {onMoveUp && !isFirst && (
              <Button variant="ghost" size="sm" onClick={onMoveUp} className="h-8 w-8 p-0">
                <ChevronUp className="w-4 h-4" />
              </Button>
            )}
            {onMoveDown && !isLast && (
              <Button variant="ghost" size="sm" onClick={onMoveDown} className="h-8 w-8 p-0">
                <ChevronDown className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-4 space-y-4 ps-9">
            {/* Condition (not for first action) */}
            {!isFirst && (
              <div className="space-y-2">
                <Label className="text-xs">{t('automationEdit.runCondition')}</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={action.condition?.type || 'always'}
                  onChange={(e) => onUpdate({ condition: { type: e.target.value as 'always' | 'previous_success' | 'previous_failed' } })}
                >
                  {conditions.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Action-specific config */}
            {action.type === 'send_message' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Template</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={(action.config.template as string) || 'custom'}
                      onChange={(e) => updateConfig('template', e.target.value)}
                    >
                      <option value="custom">Custom Message</option>
                      <option value="pre_arrival_welcome">Pre-Arrival Welcome</option>
                      <option value="checkout_reminder">Checkout Reminder</option>
                      <option value="post_stay_thank_you">Post-Stay Thank You</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Channel</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={(action.config.channel as string) || 'preferred'}
                      onChange={(e) => updateConfig('channel', e.target.value)}
                    >
                      {channels.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {action.config.template === 'custom' && (
                  <MessageEditor
                    value={(action.config.message as string) || ''}
                    onChange={(v) => updateConfig('message', v)}
                  />
                )}
              </>
            )}

            {action.type === 'create_task' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Task Type</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={(action.config.type as string) || 'concierge'}
                      onChange={(e) => updateConfig('type', e.target.value)}
                    >
                      {taskTypes.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Priority</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={(action.config.priority as string) || 'standard'}
                      onChange={(e) => updateConfig('priority', e.target.value)}
                    >
                      {priorities.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={(action.config.description as string) || ''}
                    onChange={(e) => updateConfig('description', e.target.value)}
                    placeholder="e.g., Follow up with guest {{firstName}}"
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}

            {action.type === 'notify_staff' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Staff Role</Label>
                    <Input
                      value={(action.config.role as string) || ''}
                      onChange={(e) => updateConfig('role', e.target.value)}
                      placeholder="e.g., manager, front_desk"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Priority</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={(action.config.priority as string) || 'standard'}
                      onChange={(e) => updateConfig('priority', e.target.value)}
                    >
                      {priorities.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Message</Label>
                  <Input
                    value={(action.config.message as string) || ''}
                    onChange={(e) => updateConfig('message', e.target.value)}
                    placeholder="e.g., VIP guest {{firstName}} needs attention"
                    className="h-9 text-sm"
                  />
                </div>
              </>
            )}

            {action.type === 'webhook' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">URL</Label>
                  <Input
                    type="url"
                    value={(action.config.url as string) || ''}
                    onChange={(e) => updateConfig('url', e.target.value)}
                    placeholder="https://example.com/webhook"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Method</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={(action.config.method as string) || 'POST'}
                    onChange={(e) => updateConfig('method', e.target.value)}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </>
            )}

            {/* Continue on error toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <Label className="text-xs">{t('automationEdit.continueOnError')}</Label>
                <p className="text-xs text-muted-foreground">{t('automationEdit.continueOnErrorDesc')}</p>
              </div>
              <Switch
                checked={action.continueOnError || false}
                onCheckedChange={(v) => onUpdate({ continueOnError: v })}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
