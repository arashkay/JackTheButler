import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const inlineAlertVariants = cva(
  'rounded-lg border p-2.5',
  {
    variants: {
      variant: {
        default: 'bg-muted/50 border-muted text-foreground',
        info: 'bg-info border-info-border text-info-foreground',
        success: 'bg-success border-success-border text-success-foreground',
        warning: 'bg-warning border-warning-border text-warning-foreground',
        error: 'bg-error border-error-border text-error-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const iconMap = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

interface InlineAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof inlineAlertVariants> {
  children: React.ReactNode;
}

export function InlineAlert({ className, variant, children, ...props }: InlineAlertProps) {
  const Icon = iconMap[variant || 'default'];

  return (
    <div className={cn(inlineAlertVariants({ variant }), className)} {...props}>
      <p className="text-sm flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        {children}
      </p>
    </div>
  );
}
