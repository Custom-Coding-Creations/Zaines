/**
 * Custom hook for keyboard shortcuts
 * Provides common keyboard shortcuts for forms (Ctrl+S to save, Esc to discard)
 */

import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onSave?: () => void;
  onDiscard?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSave,
  onDiscard,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S or Cmd+S (Mac) to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (onSave) {
          onSave();
        }
      }

      // Esc to discard
      if (event.key === 'Escape') {
        event.preventDefault();
        if (onDiscard) {
          onDiscard();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSave, onDiscard, enabled]);
}
