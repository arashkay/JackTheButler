import { useTranslation } from 'react-i18next';
import { FlaskConical, X } from 'lucide-react';
import { useDismissible } from '@/hooks/useDismissible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Card that allows users to populate the system with demo data for testing
 */
export function DemoDataCard() {
  const { t } = useTranslation();
  const { isDismissed, dismiss, canDismiss } = useDismissible('demo-data', true);

  if (isDismissed) {
    return null;
  }

  const handleLoadSampleData = () => {
    // TODO: Call API to create demo data
    console.log('Loading sample data...');
  };

  return (
    <Card>
      <CardHeader className="relative">
        {canDismiss && (
          <button
            onClick={dismiss}
            className="absolute top-4 end-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-info">
            <FlaskConical className="h-5 w-5 text-info-foreground" />
          </div>
          <CardTitle>{t('home.demoData.title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4">
          {t('home.demoData.description')}
        </p>
        <Button variant="outline" size="sm" onClick={handleLoadSampleData}>
          {t('home.demoData.createAll')}
        </Button>
      </CardContent>
    </Card>
  );
}
