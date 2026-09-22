import { useEffect, useState } from 'react';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

/**
 * Tracks the viewport rect of the element flagged with the given anchor key so a
 * floating toolbar can position itself against the current selection.
 */
export function useAnchorRect(anchorKey: string | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!anchorKey) {
      setRect(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-anchor="${anchorKey}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect((prev) => {
        if (
        prev &&
        Math.abs(prev.top - r.top) < 0.5 &&
        Math.abs(prev.left - r.left) < 0.5 &&
        Math.abs(prev.width - r.width) < 0.5 &&
        Math.abs(prev.height - r.height) < 0.5)
        {
          return prev;
        }
        return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom };
      });
      frame = window.requestAnimationFrame(measure);
    };

    frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [anchorKey]);

  return rect;
}