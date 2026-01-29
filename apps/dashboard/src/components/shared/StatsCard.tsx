import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const variants = {
  success: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
  default: 'text-muted-foreground bg-muted',
};

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: keyof typeof variants;
}

export function StatsCard({ label, value, icon: Icon, variant = 'default' }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-card border">
      <div className={cn('p-2 rounded-lg', variants[variant])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const colsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return <div className={cn('grid gap-4', colsClass[columns])}>{children}</div>;
}
