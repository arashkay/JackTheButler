import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dismissed-cards';

/**
 * Get all dismissed card IDs from localStorage
 */
function getDismissedCards(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Save dismissed card IDs to localStorage
 */
function saveDismissedCards(cards: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...cards]));
}

/**
 * Hook for managing dismissible cards/sections
 *
 * @param id - Unique identifier for the card
 * @param canDismiss - Whether the card can currently be dismissed (e.g., all steps completed)
 * @param shouldReset - Whether to reset the dismissed state (e.g., issues came back)
 *
 * @example
 * ```tsx
 * const { isDismissed, dismiss } = useDismissible(
 *   'getting-started',
 *   issues.length === 0,  // can only dismiss when no issues
 *   issues.length > 0     // reset if issues come back
 * );
 * ```
 */
export function useDismissible(
  id: string,
  canDismiss: boolean = true,
  shouldReset: boolean = false
) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return getDismissedCards().has(id);
  });

  // Reset dismissed state when shouldReset becomes true
  useEffect(() => {
    if (shouldReset && isDismissed) {
      const cards = getDismissedCards();
      cards.delete(id);
      saveDismissedCards(cards);
      setIsDismissed(false);
    }
  }, [shouldReset, isDismissed, id]);

  const dismiss = useCallback(() => {
    if (!canDismiss) return;

    const cards = getDismissedCards();
    cards.add(id);
    saveDismissedCards(cards);
    setIsDismissed(true);
  }, [id, canDismiss]);

  return {
    isDismissed,
    dismiss,
    canDismiss,
  };
}
