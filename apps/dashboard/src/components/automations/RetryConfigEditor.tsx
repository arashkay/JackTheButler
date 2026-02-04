import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RefreshCw } from 'lucide-react';

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
}

interface RetryConfigEditorProps {
  config: RetryConfig;
  onChange: (config: RetryConfig) => void;
}

const DELAY_OPTIONS = [
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
  { value: 900000, label: '15 minutes' },
  { value: 1800000, label: '30 minutes' },
];

const MAX_DELAY_OPTIONS = [
  { value: 3600000, label: '1 hour' },
  { value: 14400000, label: '4 hours' },
  { value: 43200000, label: '12 hours' },
  { value: 86400000, label: '24 hours' },
];

export function RetryConfigEditor({ config, onChange }: RetryConfigEditorProps) {
  const { t } = useTranslation();

  // Calculate retry pattern for display
  const getRetryPattern = () => {
    if (!config.enabled) return '';
    const delays: string[] = [];
    let delay = config.initialDelayMs;
    for (let i = 0; i < config.maxAttempts && i < 4; i++) {
      const minutes = Math.round(delay / 60000);
      if (minutes < 60) {
        delays.push(`${minutes}m`);
      } else {
        delays.push(`${Math.round(minutes / 60)}h`);
      }
      if (config.backoffType === 'exponential') {
        delay = Math.min(delay * 2, config.maxDelayMs);
      }
    }
    if (config.maxAttempts > 4) {
      delays.push('...');
    }
    return delays.join(' → ');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            {t('automationEdit.retry.title')}
          </CardTitle>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onChange({ ...config, enabled })}
          />
        </div>
      </CardHeader>
      {config.enabled && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('automationEdit.retry.maxAttempts')}</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.maxAttempts}
                onChange={(e) => onChange({ ...config, maxAttempts: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('automationEdit.retry.backoffType')}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={config.backoffType}
                onChange={(e) => onChange({ ...config, backoffType: e.target.value as 'fixed' | 'exponential' })}
              >
                <option value="exponential">{t('automationEdit.retry.exponential')}</option>
                <option value="fixed">{t('automationEdit.retry.fixed')}</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('automationEdit.retry.initialDelay')}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={config.initialDelayMs}
                onChange={(e) => onChange({ ...config, initialDelayMs: parseInt(e.target.value) })}
              >
                {DELAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('automationEdit.retry.maxDelay')}</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={config.maxDelayMs}
                onChange={(e) => onChange({ ...config, maxDelayMs: parseInt(e.target.value) })}
              >
                {MAX_DELAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          {config.enabled && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Retries: {getRetryPattern()} ({config.backoffType} backoff)
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
