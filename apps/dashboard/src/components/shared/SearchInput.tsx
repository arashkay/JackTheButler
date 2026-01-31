import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  size?: 'default' | 'sm';
}

export function SearchInput({ value, onChange, placeholder = 'Search...', onKeyDown, size = 'default' }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className={cn(
        'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
        size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
      )} />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          'pl-9',
          size === 'sm' && 'h-8 text-sm'
        )}
      />
    </div>
  );
}
