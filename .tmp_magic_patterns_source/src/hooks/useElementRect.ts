import { useEffect, useState } from 'react';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RectState {
  el: HTMLElement | null;
  rect: Rect | null;
  scrollTop: number;
}

/** Tracks an element's box relative to a container, following layout changes while it is selected. */
export function useElementRect(el: HTMLElement | null, container: HTMLElement | null, scroller: HTMLElement | null) {
  const [state, setState] = useState<RectState>({ el: null, rect: null, scrollTop: 0 });

  useEffect(() => {
    if (!el || !container) {
      setState({ el: null, rect: null, scrollTop: 0 });
      return;
    }
    let raf = 0;
    let prev = '';
    const tick = () => {
      const a = el.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      const st = scroller ? scroller.scrollTop : 0;
      const rect = {
        top: Math.round(a.top - c.top),
        left: Math.round(a.left - c.left),
        width: Math.round(a.width),
        height: Math.round(a.height)
      };
      const key = `${rect.top}|${rect.left}|${rect.width}|${rect.height}|${st}`;
      if (key !== prev) {
        prev = key;
        setState({ el, rect, scrollTop: st });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [el, container, scroller]);

  return state.el === el ? state : { el, rect: null, scrollTop: 0 };
}