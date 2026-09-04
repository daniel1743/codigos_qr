import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight scroll-reveal hook using IntersectionObserver.
 * Returns a ref callback and visibility state.
 *
 * - Triggers once by default (no re-animation on scroll back)
 * - Respects prefers-reduced-motion (always visible)
 * - Cleans up observer on unmount
 */
export function useScrollReveal(options?: { threshold?: number; once?: boolean }): {
  ref: React.RefCallback<HTMLElement>;
  isVisible: boolean;
} {
  const threshold = options?.threshold ?? 0.1;
  const once = options?.once ?? true;

  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const revealedRef = useRef(false);

  // Check reduced-motion preference once
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useEffect(() => {
    // If reduced motion is preferred, always show immediately
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            revealedRef.current = true;
            if (once && observerRef.current && elementRef.current) {
              observerRef.current.unobserve(elementRef.current);
            }
          } else if (!once && !revealedRef.current) {
            setIsVisible(false);
          }
        }
      },
      { threshold },
    );

    // If element was already set before observer was created
    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [threshold, once, prefersReducedMotion]);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Unobserve previous element
      if (elementRef.current && observerRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }

      elementRef.current = node;

      // Observe new element
      if (node && observerRef.current) {
        if (once && revealedRef.current) return; // Already revealed
        observerRef.current.observe(node);
      }
    },
    [once],
  );

  return { ref, isVisible };
}
