// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Phase 9 CASO B — the conversation must survive a real login.
 *
 * The whole point of using the Auth overlay instead of navigating to `/login`
 * is that nothing is unmounted: messages, Business Context, the selected
 * template and the PENDING document stay in React state, and the very same
 * document is what gets persisted after authentication. These tests drive the
 * real hook with a mocked router and a mocked Supabase client, so they fail if
 * that contract regresses.
 */

const h = vi.hoisted(() => ({
  navigate: vi.fn().mockResolvedValue(undefined),
  session: null as { user: { id: string; email: string; user_metadata: Record<string, unknown> } } | null,
  rpcCalls: [] as string[],
  updates: [] as { table: string; payload: Record<string, unknown>; filters: Record<string, unknown> }[],
  pages: [] as Record<string, unknown>[],
  profiles: [] as Record<string, unknown>[]
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => h.navigate
}));

vi.mock('../../../../lib/supabase/client', () => {
  function makeBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    let operation: { kind: 'select' | 'update' | 'insert'; payload?: unknown } = { kind: 'select' };
    const rows = () =>
      (table === 'profiles' ? h.profiles : h.pages).filter((row) =>
        Object.entries(filters).every(([key, value]) => row[key] === value)
      );
    const settle = (single: boolean) => {
      if (operation.kind === 'update') {
        h.updates.push({
          table,
          payload: operation.payload as Record<string, unknown>,
          filters: { ...filters }
        });
        const row = rows()[0];
        if (row) Object.assign(row, operation.payload as object);
        return { data: row ?? null, error: null };
      }
      if (operation.kind === 'insert') {
        const row = { id: `inserted-${h.pages.length}`, ...(operation.payload as object) };
        (table === 'profiles' ? h.profiles : h.pages).push(row);
        return { data: row, error: null };
      }
      const found = rows();
      return { data: single ? found[0] ?? null : found, error: null };
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      update: (payload: unknown) => {
        operation = { kind: 'update', payload };
        return builder;
      },
      insert: (payload: unknown) => {
        operation = { kind: 'insert', payload };
        return builder;
      },
      maybeSingle: () => Promise.resolve(settle(true)),
      single: () => Promise.resolve(settle(true)),
      then: (ok: unknown, bad: unknown) => Promise.resolve(settle(false)).then(ok as never, bad as never)
    };
    return builder;
  }

  return {
    getBrowserSupabaseClient: () => ({
      auth: { getSession: async () => ({ data: { session: h.session }, error: null }) },
      from: (table: string) => makeBuilder(table),
      rpc: (name: string) => {
        h.rpcCalls.push(name);
        const row = { id: 'page-real-1', owner_user_id: 'user-1', page_type: 'landing', template_config: null };
        h.pages.push(row);
        return Promise.resolve({ data: row, error: null });
      }
    })
  };
});

import { useCripqerSession } from '../useCripqerSession';

function renderHook<T>(hook: () => T) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result = { current: undefined as unknown as T };
  function Probe() {
    result.current = hook();
    return null;
  }
  act(() => {
    root.render(React.createElement(Probe));
  });
  return {
    result,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    }
  };
}

beforeEach(() => {
  (globalThis as Record<string, unknown>)['IS_REACT_ACT_ENVIRONMENT'] = true;
  (import.meta.env as Record<string, unknown>)['VITE_LANDING_TEMPLATE_SELECTION_FROZEN'] = 'false';
  h.navigate.mockClear();
  h.rpcCalls.length = 0;
  h.updates.length = 0;
  h.pages.length = 0;
  h.profiles.length = 0;
  h.session = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Phase 9 CASO B — auth without losing the conversation', () => {
  it('1) an unauthenticated CREATE_PAGE opens the real auth overlay and keeps everything', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('editor'));

    const messagesBefore = result.current.messages;
    const contextBefore = result.current.context;
    expect(messagesBefore.length).toBeGreaterThan(0);

    await act(async () => {
      result.current.createPage();
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(result.current.authPrompt).toBe('create');
    // The conversation, the Business Context and the pending document survive.
    expect(result.current.messages).toBe(messagesBefore);
    expect(result.current.context).toBe(contextBefore);
    expect(result.current.handoff).not.toBeNull();
    expect(result.current.context.template.selectedTemplateId).toBe('dark_craft');
    // Nothing was written while unauthenticated.
    expect(h.rpcCalls).toEqual([]);
    expect(h.updates).toEqual([]);
    expect(h.navigate).not.toHaveBeenCalled();
    unmount();
  });

  it('2) after login it resumes the PENDING creation and opens the REAL pageId', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('editor'));

    await act(async () => {
      result.current.createPage();
      await vi.advanceTimersByTimeAsync(50);
    });
    const pendingDocument = result.current.handoff!.document;

    // The real session appears (as the overlay's auth listener would report).
    h.session = { user: { id: 'user-1', email: 'santos@barberia.cl', user_metadata: {} } };
    h.profiles.push({ id: 'profile-1', user_id: 'user-1' });

    await act(async () => {
      result.current.completeAuth();
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(h.rpcCalls).toEqual(['create_initial_landing_page']);
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0]!.payload['template_config']).toEqual(pendingDocument);
    expect(h.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/pages/$pageId/edit', params: { pageId: 'page-real-1' } })
    );
    expect(result.current.authPrompt).toBeNull();
    unmount();
  });

  it('3) "Iniciar sesión" opens the real auth flow without a pending creation', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('discover'));

    act(() => {
      result.current.openSignIn();
    });

    expect(result.current.authPrompt).toBe('signin');

    h.session = { user: { id: 'user-1', email: 'a@b.cl', user_metadata: {} } };
    await act(async () => {
      result.current.completeAuth();
      await vi.advanceTimersByTimeAsync(100);
    });

    // Signing in alone must never create a page.
    expect(result.current.authPrompt).toBeNull();
    expect(h.rpcCalls).toEqual([]);
    expect(h.navigate).not.toHaveBeenCalled();
    unmount();
  });

  it('4) closing the overlay without authenticating drops the pending document', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('editor'));

    await act(async () => {
      result.current.createPage();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.handoff).not.toBeNull();

    act(() => {
      result.current.closeAuth();
    });

    expect(result.current.authPrompt).toBeNull();
    expect(result.current.handoff).toBeNull();
    expect(h.rpcCalls).toEqual([]);
    unmount();
  });

  it('5) a double CREATE_PAGE never fires two creations', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('editor'));
    h.session = { user: { id: 'user-1', email: 'a@b.cl', user_metadata: {} } };
    h.profiles.push({ id: 'profile-1', user_id: 'user-1' });

    await act(async () => {
      result.current.createPage();
      result.current.createPage();
      await vi.advanceTimersByTimeAsync(6000);
    });

    expect(h.rpcCalls).toEqual(['create_initial_landing_page']);
    expect(h.navigate).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe('Phase F2 — Granular template selection freeze', () => {
  beforeEach(() => {
    (import.meta.env as Record<string, unknown>)['VITE_LANDING_TEMPLATE_SELECTION_FROZEN'] = 'true';
  });

  it('blocks selectTemplate and responds with safe copy without changing template', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('discover'));
    await act(async () => {
      result.current.selectTemplate('dark_craft');
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(result.current.context.template.selectedTemplateId).toBeNull();
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.role).toBe('assistant');
    expect(lastMsg?.text).toContain(
      'Esa función estará disponible próximamente. Por ahora puedes personalizar tu propia tarjeta.',
    );
    unmount();
  });

  it('blocks createPage and requestCreate, emitting safe copy and never persisting', async () => {
    const { result, unmount } = renderHook(() => useCripqerSession('discover'));
    await act(async () => {
      result.current.createPage();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(h.rpcCalls).toEqual([]);
    expect(h.navigate).not.toHaveBeenCalled();
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.text).toContain(
      'Esa función estará disponible próximamente. Por ahora puedes personalizar tu propia tarjeta.',
    );

    await act(async () => {
      result.current.requestCreate();
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(h.rpcCalls).toEqual([]);
    expect(h.navigate).not.toHaveBeenCalled();
    unmount();
  });
});
