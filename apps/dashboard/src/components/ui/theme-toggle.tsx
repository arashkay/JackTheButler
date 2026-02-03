import { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
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

  return (
    <button
      ref={buttonRef}
      onClick={toggle}
      className="relative h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon */}
      <Sun
        className={`h-4 w-4 absolute transition-all duration-300 ease-in-out ${
          isDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
      />
      {/* Moon icon */}
      <Moon
        className={`h-4 w-4 absolute transition-all duration-300 ease-in-out ${
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />
    </button>
  );
}
