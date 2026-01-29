import { ReactNode } from 'react';

interface PageHeaderProps {
  description?: string;
  children?: ReactNode; // Actions on the right
}

export function PageHeader({ description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between h-9">
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {!description && <div />}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
