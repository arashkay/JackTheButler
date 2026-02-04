import { forwardRef, useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIPromptInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholderExamples?: string[];
}

export const AIPromptInput = forwardRef<HTMLTextAreaElement, AIPromptInputProps>(
  ({ className, value, onChange, disabled, placeholderExamples = [], ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      if (value || disabled || placeholderExamples.length === 0) {
        setDisplayedText('');
        return;
      }

      const currentText = placeholderExamples[currentIndex];

      if (isTyping) {
        if (displayedText.length < currentText.length) {
          // Type next character
          timeoutRef.current = setTimeout(() => {
            setDisplayedText(currentText.slice(0, displayedText.length + 1));
          }, 50);
        } else {
          // Finished typing, wait then start erasing
          timeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 2000);
        }
      } else {
        if (displayedText.length > 0) {
          // Erase characters (faster)
          timeoutRef.current = setTimeout(() => {
            setDisplayedText(displayedText.slice(0, -1));
          }, 25);
        } else {
          // Finished erasing, move to next example
          setCurrentIndex((prev) => (prev + 1) % placeholderExamples.length);
          setIsTyping(true);
        }
      }

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [value, disabled, currentIndex, displayedText, isTyping, placeholderExamples]);

    const showAnimatedPlaceholder = !value && !disabled && placeholderExamples.length > 0;

    return (
      <div className="relative">
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'flex min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 pb-10 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none',
            className
          )}
          {...props}
        />
        {showAnimatedPlaceholder && (
          <div className="absolute top-3 left-4 right-4 pointer-events-none">
            <span className="text-sm text-muted-foreground">
              {displayedText}
              <span className="inline-block w-0.5 h-4 bg-muted-foreground/50 ml-0.5 align-middle animate-blink" />
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 pointer-events-none">
          <Sparkles
            className={cn(
              'w-4 h-4 text-primary/60',
              !disabled && 'animate-pulse'
            )}
          />
        </div>
      </div>
    );
  }
);

AIPromptInput.displayName = 'AIPromptInput';
