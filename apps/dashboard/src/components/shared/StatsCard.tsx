import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

const variants = {
  success: 'text-green-600 bg-green-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
  default: 'text-muted-foreground bg-muted',
};

interface StatItemProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  variant?: keyof typeof variants;
}

function StatItem({ label, value, icon: Icon, variant = 'default' }: StatItemProps) {
  return (
    <div className="flex-1 flex items-center gap-3 px-4 py-3">
      <div className={cn('p-2 rounded-lg', variants[variant])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

interface StatsBarProps {
  items: StatItemProps[];
}

export function StatsBar({ items }: StatsBarProps) {
  return (
    <Card className="flex divide-x">
      {items.map((item, index) => (
        <StatItem key={index} {...item} />
      ))}
    </Card>
  );
}

// Keep old exports for backwards compatibility during migration
export { StatItem as StatsCard };

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
