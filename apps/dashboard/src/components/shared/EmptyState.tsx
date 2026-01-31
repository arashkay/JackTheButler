import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode; // Optional action buttons
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
      <h3 className="font-medium text-muted-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground/70 mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}
