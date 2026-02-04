import { useTranslation } from 'react-i18next';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { InlineAlert } from '@/components/ui/inline-alert';
import { AIPromptInput } from './AIPromptInput';

interface GeneratedRule {
  name: string;
  description?: string;
  triggerType: 'time_based' | 'event_based';
  triggerConfig: Record<string, unknown>;
  actionType?: string;
  actionConfig?: Record<string, unknown>;
  actions?: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    order: number;
    condition?: { type: string };
    continueOnError?: boolean;
  }>;
  retryConfig?: {
    enabled: boolean;
    maxAttempts: number;
    backoffType: string;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}

interface AIAutomationGeneratorProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

export function AIAutomationGenerator({
  prompt,
  onPromptChange,
  isGenerating,
  error,
  onGenerate,
}: AIAutomationGeneratorProps) {
  const { t } = useTranslation();
  const examples = t('automationGenerate.examplesList', { returnObjects: true }) as string[];

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {t('automationGenerate.title')}
        </CardTitle>
        <CardDescription>{t('automationGenerate.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AIPromptInput
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={isGenerating}
          placeholderExamples={Array.isArray(examples) ? examples : []}
        />

        {error && (
          <InlineAlert variant="error">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </InlineAlert>
        )}

        <Button
          onClick={onGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Spinner size="sm" className="me-2" />
              {t('automationGenerate.generating')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 me-2" />
              {t('automationGenerate.generate')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export type { GeneratedRule };
