import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const VARIABLES = [
  { key: 'firstName', sample: 'John' },
  { key: 'lastName', sample: 'Smith' },
  { key: 'roomNumber', sample: '412' },
  { key: 'arrivalDate', sample: 'Feb 15, 2026' },
  { key: 'departureDate', sample: 'Feb 18, 2026' },
];

interface MessageEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MessageEditor({ value, onChange }: MessageEditorProps) {
  const { t } = useTranslation();

  const insertVariable = (key: string) => {
    onChange(value + `{{${key}}}`);
  };

  // Generate preview with sample values
  const preview = VARIABLES.reduce(
    (msg, v) => msg.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), v.sample),
    value
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('automationEdit.customMessage')}</Label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={t('automationEdit.customMessagePlaceholder')}
          className="font-mono text-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground me-1">{t('automationEdit.insertVariable')}:</span>
          {VARIABLES.map((v) => (
            <Badge
              key={v.key}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20 font-mono text-xs"
              onClick={() => insertVariable(v.key)}
            >
              {`{{${v.key}}}`}
            </Badge>
          ))}
        </div>
      </div>
      {value && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">{t('automationEdit.messagePreview')}</Label>
          <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap border">
            {preview || <span className="text-muted-foreground italic">Empty message</span>}
          </div>
        </div>
      )}
    </div>
  );
}
