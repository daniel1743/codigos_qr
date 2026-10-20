import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe media query hook.
 *
 * The landing is server-rendered at `/`, so the first client render has to
 * produce the same tree the server produced. `useSyncExternalStore` serves the
 * server snapshot during hydration and switches to the real `matchMedia` value
 * immediately after, which avoids both the hydration mismatch and the blank
 * first paint a client-only mount would cause.
 *
 * The server snapshot mirrors the previous behaviour (`true`), so the
 * server-rendered layout is the desktop one and mobile clients re-render into
 * their own layout after hydration.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onStoreChange);
      return () => mql.removeEventListener('change', onStoreChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => true, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
