import { ReactNode } from 'react';

interface PageHeaderProps {
  children?: ReactNode; // Actions on the right
}

export function PageHeader({ children }: PageHeaderProps) {
  if (!children) {
    return null;
  }

  return (
    <div className="flex items-center justify-end h-9">
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
