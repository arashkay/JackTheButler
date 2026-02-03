import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear?: () => void;
  placeholder?: string;
}

export function ExpandableSearch({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Search...',
}: ExpandableSearchProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleClose = () => {
    if (!value) {
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    setOpen(false);
  };

  // Keep open if there's a value
  useEffect(() => {
    if (value && !open) {
      setOpen(true);
    }
  }, [value, open]);

  return (
    <div
      className={cn(
        'flex items-center justify-end border rounded-md transition-all duration-200 ease-out overflow-hidden',
        open ? 'w-[200px] bg-background' : 'w-8 hover:bg-gray-100 cursor-pointer'
      )}
      onClick={!open ? handleOpen : undefined}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch();
          if (e.key === 'Escape') handleClear();
        }}
        onBlur={handleClose}
        placeholder={placeholder}
        className={cn(
          'h-7 bg-transparent text-sm outline-none transition-all duration-200',
          open ? 'w-full pl-2' : 'w-0 pl-0'
        )}
      />
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open && value) {
            handleClear();
          } else if (open) {
            onSearch();
          } else {
            handleOpen();
          }
        }}
        className="flex-shrink-0 p-[7px] text-gray-500 hover:text-gray-700"
      >
        {open && value ? (
          <X className="w-4 h-4" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
