import { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  size?: 'default' | 'sm';
  className?: string;
  iconOnly?: boolean;
}

export function ThemeToggle({ size = 'default', className, iconOnly = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = async () => {
    const newTheme = isDark ? 'light' : 'dark';

    // Fallback for browsers that don't support View Transitions
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    // Get button position for the animation origin
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`);
      document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`);
    }

    // Start view transition
    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });

    await transition.ready;
  };

  const iconSize = size === 'sm' ? 'h-5 w-5' : 'h-4 w-4';

  const icons = (
    <>
      <Sun
        className={cn(
          'absolute transition-all duration-300 ease-in-out',
          iconSize,
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        )}
      />
      <Moon
        className={cn(
          'absolute transition-all duration-300 ease-in-out',
          iconSize,
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </>
  );

  if (iconOnly) {
    return (
      <span
        className={cn(
          'relative flex items-center justify-center',
          size === 'sm' ? 'h-5 w-5' : 'h-8 w-8',
          className
        )}
      >
        {icons}
      </span>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      className={cn(
        'relative rounded-md flex items-center justify-center transition-colors',
        size === 'sm' ? 'h-5 w-5' : 'h-8 w-8 hover:bg-muted',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {icons}
    </button>
  );
}
