import React, { useEffect, useRef } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Auth } from '../../../../components/Auth';
import { getBrowserSupabaseClient } from '../../../../lib/supabase/client';

interface AuthOverlayProps {
  open: boolean;
  /** "signup" when the overlay is completing a pending CREATE_PAGE. */
  initialMode: 'login' | 'signup';
  onAuthenticated: () => void;
  onClose: () => void;
}

/**
 * Phase 9 CASO B — real auth WITHOUT losing the conversation.
 *
 * The approved landing keeps the messages, the Business Context and the pending
 * CREATE_PAGE in React state. Navigating to `/login` would unmount all of it, so
 * the official `Auth` component is reused as an overlay instead: nothing is
 * unmounted, no temporary storage is needed, and no second auth system exists.
 *
 * `Auth` itself is untouched — the overlay only listens to the real Supabase
 * auth event to know when the session appeared.
 */
export function AuthOverlay({ open, initialMode, onAuthenticated, onClose }: AuthOverlayProps) {
  const supabase = getBrowserSupabaseClient();
  const authenticatedRef = useRef(onAuthenticated);
  authenticatedRef.current = onAuthenticated;

  useEffect(() => {
    if (!open) return;
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // Only the real post-login signal resumes the flow. INITIAL_SESSION is
      // ignored on purpose: it fires immediately on subscribe and would resume
      // a flow the user never authenticated for.
      if (event === 'SIGNED_IN' && session) authenticatedRef.current();
    });
    return () => data.subscription.unsubscribe();
  }, [open, supabase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Inicia sesión para continuar">

      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="fixed right-4 top-4 z-[81] flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg leading-none text-white transition-colors duration-150 hover:bg-white/20">

        ×
      </button>
      <Auth premium initialMode={initialMode} />
    </div>);

}
