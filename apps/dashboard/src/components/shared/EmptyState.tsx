import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode; // Optional action buttons
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <Card className="p-8 text-center">
      <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-medium text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-4">{description}</p>
      )}
      {children}
    </Card>
  );
}
