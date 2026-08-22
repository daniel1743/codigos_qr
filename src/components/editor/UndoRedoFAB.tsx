import { useState, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Undo2, Redo2 } from "lucide-react";

interface HistoryState {
  profile: any;
  links: any[];
  timestamp: number;
}

interface UndoRedoFABProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Undo/Redo Floating Action Buttons
 *
 * Premium Mobile UX:
 * - Always accessible (like PicsArt)
 * - Touch targets: 48x48px (generous)
 * - Left bottom position (thumb-friendly)
 * - Haptic feedback on tap
 * - Disabled state visible
 */
export function UndoRedoFAB({ onUndo, onRedo, canUndo, canRedo }: UndoRedoFABProps) {
  const triggerHaptic = (intensity: 'light' | 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 20 };
      navigator.vibrate(patterns[intensity]);
    }
  };

  const handleUndo = () => {
    if (!canUndo) return;
    triggerHaptic('light');
    onUndo();
  };

  const handleRedo = () => {
    if (!canRedo) return;
    triggerHaptic('light');
    onRedo();
  };

  return (
    <div className="fixed left-4 bottom-24 z-40 flex flex-col gap-2.5 md:hidden">
      {/* Undo Button */}
      <Button
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full shadow-2xl border-2 disabled:opacity-30 transition-all active:scale-95"
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="Deshacer"
      >
        <Undo2 className="h-5 w-5" />
      </Button>

      {/* Redo Button */}
      <Button
        size="icon"
        variant="secondary"
        className="h-12 w-12 rounded-full shadow-2xl border-2 disabled:opacity-30 transition-all active:scale-95"
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="Rehacer"
      >
        <Redo2 className="h-5 w-5" />
      </Button>
    </div>
  );
}

/**
 * History Manager Hook
 *
 * Manages undo/redo state for profile and links
 */
export function useHistory<T>(initialState: T, maxHistory: number = 50) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((newState: T) => {
    setHistory((prev) => {
      // Remove any future states (if user did undo then made new change)
      const newHistory = prev.slice(0, currentIndex + 1);

      // Add new state
      newHistory.push(newState);

      // Limit history size
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        setCurrentIndex(newHistory.length - 1);
      } else {
        setCurrentIndex(newHistory.length - 1);
      }

      return newHistory;
    });
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex((prev) => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex((prev) => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [canRedo, currentIndex, history]);

  const getCurrentState = useCallback(() => {
    return history[currentIndex];
  }, [history, currentIndex]);

  return {
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    getCurrentState,
    currentIndex,
    historyLength: history.length,
  };
}
