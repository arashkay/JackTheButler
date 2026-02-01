import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const DrawerContext = React.createContext<{
  onOpenChange: (open: boolean) => void;
  isOpen: boolean;
} | null>(null);

export function DrawerRoot({ open, onOpenChange, children }: DrawerProps) {
  const [shouldRender, setShouldRender] = React.useState(open);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setShouldRender(true);
      // Double rAF ensures browser has painted the initial state before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [open]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }
  }, [open, onOpenChange]);

  if (!shouldRender) return null;

  return (
    <DrawerContext.Provider value={{ onOpenChange, isOpen: isAnimating }}>
      {children}
    </DrawerContext.Provider>
  );
}

export function DrawerContent({ children, className, title }: DrawerContentProps) {
  const drawerContext = React.useContext(DrawerContext);
  const isOpen = drawerContext?.isOpen ?? false;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity duration-300 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => drawerContext?.onOpenChange(false)}
      />
      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <h2 className="font-medium">{title}</h2>
            <button
              onClick={() => drawerContext?.onOpenChange(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// Keep these for backwards compatibility
export const Drawer = DrawerRoot;
