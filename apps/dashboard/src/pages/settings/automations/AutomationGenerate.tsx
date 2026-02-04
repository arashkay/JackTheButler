import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Calendar,
  Zap,
  MessageSquare,
  ListTodo,
  Bell,
  Webhook,
  Pencil,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AIAutomationGenerator, type GeneratedRule } from '@/components/automations';
import { PageContainer } from '@/components';
import { api } from '@/lib/api';

const triggerIcons = {
  time_based: Calendar,
  event_based: Zap,
};

const actionIcons: Record<string, typeof MessageSquare> = {
  send_message: MessageSquare,
  create_task: ListTodo,
  notify_staff: Bell,
  webhook: Webhook,
};

function getTriggerSummary(rule: GeneratedRule, t: (key: string) => string): string {
  const config = rule.triggerConfig;
  if (rule.triggerType === 'time_based') {
    const type = config.type as string;
    const offsetDays = config.offsetDays as number;
    const time = config.time as string;

    const typeLabels: Record<string, string> = {
      before_arrival: t('automations.triggers.beforeArrival'),
      after_arrival: t('automations.triggers.afterArrival'),
      before_departure: t('automations.triggers.beforeDeparture'),
      after_departure: t('automations.triggers.afterDeparture'),
    };

    let desc = typeLabels[type] || type;
    if (offsetDays !== undefined) {
      const dayLabel = offsetDays === 1 ? t('automationGenerate.day') : t('automationGenerate.days');
      desc += ` (${offsetDays} ${dayLabel})`;
    }
    if (time) {
      desc += ` ${t('automationGenerate.at')} ${time}`;
    }
    return desc;
  } else {
    const eventType = config.eventType as string;
    const eventLabels: Record<string, string> = {
      'reservation.created': t('automations.events.reservationCreated'),
      'reservation.checked_in': t('automations.events.checkedIn'),
      'reservation.checked_out': t('automations.events.checkedOut'),
      'conversation.escalated': t('automations.events.conversationEscalated'),
      'task.created': t('automations.events.taskCreated'),
      'task.completed': t('automations.events.taskCompleted'),
    };
    return eventLabels[eventType] || eventType;
  }
}

export function AutomationGeneratePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRule, setGeneratedRule] = useState<GeneratedRule | null>(null);

  const examples = t('automationGenerate.examplesList', { returnObjects: true }) as string[];
  const examplesList = Array.isArray(examples) ? examples : [];

  const createMutation = useMutation({
    mutationFn: async (rule: GeneratedRule) => {
      // Extract first action for legacy fields if using actions array
      const firstAction = rule.actions?.[0];
      const data = {
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        triggerConfig: rule.triggerConfig,
        actionType: rule.actionType || firstAction?.type || 'send_message',
        actionConfig: rule.actionConfig || firstAction?.config || {},
        enabled: true,
      };
      return api.post<{ id: string }>('/automation/rules', data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      if (result?.id) {
        navigate(`/settings/automations/${result.id}`);
      } else {
        navigate('/settings/automations');
      }
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await api.post<{ rule: GeneratedRule; error?: string }>('/automation/generate', {
        prompt: prompt.trim(),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.rule) {
        setGeneratedRule(result.rule);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate automation';
      if (message.includes('No AI provider')) {
        setError(t('automationGenerate.noAiProvider'));
      } else {
        setError(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreate = () => {
    if (generatedRule) {
      createMutation.mutate(generatedRule);
    }
  };

  const handleEdit = () => {
    if (generatedRule) {
      // Store in session storage for the edit page to pick up
      sessionStorage.setItem('generated-automation', JSON.stringify(generatedRule));
      navigate('/settings/automations/new');
    }
  };

  const handleStartOver = () => {
    setGeneratedRule(null);
    setPrompt('');
    setError(null);
  };

  const TriggerIcon = generatedRule ? triggerIcons[generatedRule.triggerType] : Calendar;
  const actions = generatedRule?.actions || (generatedRule?.actionType ? [{
    type: generatedRule.actionType,
    config: generatedRule.actionConfig,
  }] : []);

  return (
    <PageContainer>
      {/* Back Link */}
      <Link
        to="/settings/automations"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
        {t('automationGenerate.backToAutomations')}
      </Link>

      {/* AI Generator - Two Column Layout */}
      {!generatedRule && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input Card */}
          <div className="space-y-4">
            <AIAutomationGenerator
              prompt={prompt}
              onPromptChange={setPrompt}
              isGenerating={isGenerating}
              error={error}
              onGenerate={handleGenerate}
            />
            <p className="text-sm text-muted-foreground">
              {t('automationGenerate.preferManual')}{' '}
              <Link
                to="/settings/automations/new"
                className="text-primary hover:underline"
              >
                {t('automationGenerate.createManually')}
              </Link>
            </p>
          </div>

          {/* Right Column - Examples */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">{t('automationGenerate.examples')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('automationGenerate.clickToUse')}
              </p>
            </div>
            <div className="space-y-2">
              {examplesList.map((example, i) => (
                <button
                  key={i}
                  onClick={() => !isGenerating && setPrompt(example)}
                  disabled={isGenerating}
                  className="w-full text-start p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <p className="text-sm">{example}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generated Rule Preview */}
      {generatedRule && (
        <Card>
          <CardHeader>
            <CardTitle>{t('automationGenerate.generatedRule')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('automationGenerate.reviewRule')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rule Name */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('automationGenerate.ruleName')}
              </p>
              <p className="font-medium text-lg">{generatedRule.name}</p>
              {generatedRule.description && (
                <p className="text-sm text-muted-foreground">{generatedRule.description}</p>
              )}
            </div>

            {/* Trigger */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('automationGenerate.triggerSummary')}
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <TriggerIcon className="w-5 h-5 text-primary" />
                <span className="font-medium">{getTriggerSummary(generatedRule, t)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('automationGenerate.actionsSummary')}
              </p>
              <div className="space-y-2">
                {actions.map((action, index) => {
                  const ActionIcon = actionIcons[action.type as string] || Zap;
                  const actionLabels: Record<string, string> = {
                    send_message: t('automations.actionTypes.sendMessage'),
                    create_task: t('automations.actionTypes.createTask'),
                    notify_staff: t('automations.actionTypes.notifyStaff'),
                    webhook: t('automations.actionTypes.webhook'),
                  };
                  return (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Badge variant="outline" className="rounded-full w-6 h-6 p-0 justify-center">
                        {index + 1}
                      </Badge>
                      <ActionIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{actionLabels[action.type as string] || action.type}</span>
                      {typeof action.config?.template === 'string' && action.config.template !== 'custom' && (
                        <Badge variant="secondary" className="ms-auto">
                          {action.config.template}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Retry Config */}
            {generatedRule.retryConfig?.enabled && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {t('automationGenerate.retryAttempts', { count: generatedRule.retryConfig.maxAttempts })}
                </Badge>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleEdit} className="flex-1">
                <Pencil className="w-4 h-4 me-2" />
                {t('automationGenerate.editRule')}
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? (
                  <Spinner size="sm" className="me-2" />
                ) : (
                  <Check className="w-4 h-4 me-2" />
                )}
                {t('automationGenerate.createRule')}
              </Button>
            </div>
            <Button variant="ghost" onClick={handleStartOver} className="w-full">
              <RotateCcw className="w-4 h-4 me-2" />
              {t('automationGenerate.startOver')}
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
