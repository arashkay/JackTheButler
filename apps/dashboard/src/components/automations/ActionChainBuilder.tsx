import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActionCard, type ActionItem, type ActionType } from './ActionCard';

interface ActionChainBuilderProps {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}

export function ActionChainBuilder({ actions, onChange }: ActionChainBuilderProps) {
  const { t } = useTranslation();

  const addAction = () => {
    const newAction: ActionItem = {
      id: `action_${Date.now()}`,
      type: 'send_message',
      config: { template: 'custom', channel: 'preferred', message: '' },
      order: actions.length + 1,
      condition: actions.length > 0 ? { type: 'previous_success' } : undefined,
    };
    onChange([...actions, newAction]);
  };

  const removeAction = (id: string) => {
    const filtered = actions.filter((a) => a.id !== id);
    // Reorder after removal
    onChange(filtered.map((a, i) => ({ ...a, order: i + 1 })));
  };

  const updateAction = (id: string, updates: Partial<ActionItem>) => {
    onChange(actions.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const moveAction = (id: string, direction: 'up' | 'down') => {
    const index = actions.findIndex((a) => a.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;

    const newActions = [...actions];
    [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
    // Update order numbers
    onChange(newActions.map((a, i) => ({ ...a, order: i + 1 })));
  };

  return (
    <div className="space-y-4">
      {actions.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">No actions configured yet</p>
          <Button onClick={addAction}>
            <Plus className="w-4 h-4 me-2" />
            {t('automationEdit.addAction')}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {actions.map((action, index) => (
              <ActionCard
                key={action.id}
                action={action}
                index={index}
                isFirst={index === 0}
                isLast={index === actions.length - 1}
                onUpdate={(updates) => updateAction(action.id, updates)}
                onRemove={() => removeAction(action.id)}
                onMoveUp={() => moveAction(action.id, 'up')}
                onMoveDown={() => moveAction(action.id, 'down')}
              />
            ))}
          </div>
          <Button variant="outline" onClick={addAction} className="w-full">
            <Plus className="w-4 h-4 me-2" />
            {t('automationEdit.addAction')}
          </Button>
        </>
      )}
    </div>
  );
}

export type { ActionItem, ActionType };
