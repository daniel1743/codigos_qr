import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createLandingFromConversation, replaceLandingDraft } from '../persist';
import { buildMagicEditorHandoff } from '../handoff';
import { createBusinessContextStore } from '../../state/businessContext';
import { applySelection } from '../../utils/agent';
import { createInitialMagicPageDocument } from '../../../magic-page-editor-production/magic-document';
import type { TemplateId } from '../../types/cripqer';

/**
 * Phase 9 — real persistence contract.
 *
 * These run against an injected fake Supabase client, so they assert the
 * ORCHESTRATION the conversation performs (which canonical path it takes, what
 * it writes, what it refuses to write) without a database. The document type and
 * the generator are the real ones, so a change in the Phase 7 output or in the
 * engine validator breaks these tests too.
 */

const USER_ID = 'user-1';

interface UpdateRecord {
  table: string;
  payload: Record<string, unknown>;
  filters: Record<string, unknown>;
}

interface FakeState {
  profiles: Record<string, unknown>[];
  pages: Record<string, unknown>[];
  calls: string[];
  updates: UpdateRecord[];
  inserts: { table: string; payload: unknown }[];
  rpcCalls: { name: string; args: unknown }[];
  rpcError: { message: string } | null;
  /** Models another tab winning the race: the RPC fails but the row exists. */
  rpcRaceRow: boolean;
}

function fakeState(): FakeState {
  return {
    profiles: [],
    pages: [],
    calls: [],
    updates: [],
    inserts: [],
    rpcCalls: [],
    rpcError: null,
    rpcRaceRow: false
  };
}

function createFakeSupabase(state: FakeState): SupabaseClient {
  function makeBuilder(table: string) {
    const filters: Record<string, unknown> = {};
    let operation: { kind: 'select' | 'update' | 'insert'; payload?: unknown } = { kind: 'select' };

    const matchingRows = () =>
      (table === 'profiles' ? state.profiles : state.pages).filter((row) =>
        Object.entries(filters).every(([key, value]) => row[key] === value)
      );

    const settle = (single: boolean) => {
      if (operation.kind === 'insert') {
        state.inserts.push({ table, payload: operation.payload });
        const row = { id: `inserted-${state.inserts.length}`, ...(operation.payload as object) };
        (table === 'profiles' ? state.profiles : state.pages).push(row);
        return { data: row, error: null };
      }
      if (operation.kind === 'update') {
        state.updates.push({ table, payload: operation.payload as Record<string, unknown>, filters: { ...filters } });
        const row = matchingRows()[0];
        if (row) Object.assign(row, operation.payload as object);
        return { data: row ?? null, error: null };
      }
      const rows = matchingRows();
      return { data: single ? rows[0] ?? null : rows, error: null };
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        state.calls.push(`${table}.eq:${column}`);
        return builder;
      },
      order: () => builder,
      limit: () => builder,
      update: (payload: unknown) => {
        operation = { kind: 'update', payload };
        state.calls.push(`${table}.update`);
        return builder;
      },
      insert: (payload: unknown) => {
        operation = { kind: 'insert', payload };
        state.calls.push(`${table}.insert`);
        return builder;
      },
      maybeSingle: () => Promise.resolve(settle(true)),
      single: () => Promise.resolve(settle(true)),
      then: (onFulfilled: unknown, onRejected: unknown) =>
        Promise.resolve(settle(false)).then(onFulfilled as never, onRejected as never)
    };
    return builder;
  }

  return {
    from: (table: string) => makeBuilder(table),
    rpc: (name: string, args?: unknown) => {
      state.rpcCalls.push({ name, args });
      if (state.rpcError) {
        if (state.rpcRaceRow) {
          state.pages.push({ id: 'page-race', owner_user_id: USER_ID, page_type: 'landing', template_config: null });
        }
        return Promise.resolve({ data: null, error: state.rpcError });
      }
      const row = { id: 'page-real-1', owner_user_id: USER_ID, page_type: 'landing', template_config: null };
      state.pages.push(row);
      return Promise.resolve({ data: row, error: null });
    }
  } as unknown as SupabaseClient;
}

function contextWith(templateId: TemplateId) {
  const store = createBusinessContextStore();
  store.patch({ name: 'Barberia Santos', type: 'barbershop', description: 'Cortes clasicos y afeitado tradicional.' });
  store.patch({ goal: 'bookings', channel: 'whatsapp' });
  return applySelection(store.get(), templateId);
}

function generatedDocument(templateId: TemplateId = 'dark_craft') {
  return buildMagicEditorHandoff(contextWith(templateId)).document;
}

describe('Phase 9 — conversational landing persistence', () => {
  it('1) an authenticated create returns a REAL pageId from the canonical RPC, never an invented one', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });

    const outcome = await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    expect(outcome).toEqual({ status: 'created', pageId: 'page-real-1' });
    expect(state.rpcCalls.map((call) => call.name)).toEqual(['create_initial_landing_page']);
  });

  it('2) never INSERTs into pages directly (the admin-only path stays unused)', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });

    await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    expect(state.inserts).toEqual([]);
    expect(state.calls).not.toContain('pages.insert');
  });

  it('3) persists exactly the document the conversation generated (Business Context included)', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });
    const document = generatedDocument('warm_care');

    await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document
    });

    const write = state.updates.find((update) => update.table === 'pages');
    expect(write).toBeDefined();
    expect(write!.payload['template_config']).toEqual(document);
    expect((write!.payload['template_config'] as { texts: Record<string, string> }).texts['hero.title']).toBe(
      'Barberia Santos'
    );
  });

  it('4) scopes every write to the authenticated owner', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });

    await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    const write = state.updates.find((update) => update.table === 'pages')!;
    expect(write.filters['owner_user_id']).toBe(USER_ID);
    expect(write.filters['id']).toBe('page-real-1');
  });

  it('5) REFUSES to overwrite an existing landing that already has a draft', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });
    state.pages.push({
      id: 'page-existing',
      owner_user_id: USER_ID,
      page_type: 'landing',
      template_config: createInitialMagicPageDocument('bio')
    });

    const outcome = await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    expect(outcome).toEqual({ status: 'existing-draft', pageId: 'page-existing' });
    // The whole point: nothing was written without the user's confirmation.
    expect(state.updates).toEqual([]);
    expect(state.rpcCalls).toEqual([]);
  });

  it('6) writes when the existing landing has NO draft (nothing to replace)', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });
    state.pages.push({
      id: 'page-empty',
      owner_user_id: USER_ID,
      page_type: 'landing',
      template_config: null
    });

    const outcome = await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    expect(outcome).toEqual({ status: 'created', pageId: 'page-empty' });
    expect(state.updates).toHaveLength(1);
  });

  it('7) a catalog-only owner is not treated as having a landing', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });
    state.pages.push({
      id: 'page-catalog',
      owner_user_id: USER_ID,
      page_type: 'catalog',
      template_config: createInitialMagicPageDocument('bio')
    });

    const outcome = await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    expect(outcome).toEqual({ status: 'created', pageId: 'page-real-1' });
    expect(state.rpcCalls).toHaveLength(1);
  });

  it('8) without a session it fails closed: no RPC, no write', async () => {
    const state = fakeState();

    await expect(
      createLandingFromConversation({
        supabase: createFakeSupabase(state),
        userId: '',
        document: generatedDocument()
      })
    ).rejects.toThrow('Debes iniciar sesión');

    expect(state.rpcCalls).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it('9) ensures the profile BEFORE the RPC that needs it', async () => {
    const state = fakeState();
    // No profile seeded: ensurePrimaryProfileForUser has to create one first.
    await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      userEmail: 'santos@barberia.cl',
      document: generatedDocument()
    });

    expect(state.profiles).toHaveLength(1);
    expect(state.rpcCalls).toHaveLength(1);
  });

  it('10) resumes instead of dead-ending when another tab won the race', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });
    state.rpcError = { message: 'INITIAL_PAGE_ALREADY_EXISTS: Ya tienes una página.' };
    state.rpcRaceRow = true;

    const outcome = await createLandingFromConversation({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      document: generatedDocument()
    });

    // Resumed with an empty draft -> written, never a hard failure.
    expect(outcome).toEqual({ status: 'created', pageId: 'page-race' });
  });

  it('11) surfaces a human message when there is genuinely no page to open', async () => {
    const state = fakeState();
    state.profiles.push({ id: 'profile-1', user_id: USER_ID });
    state.rpcError = { message: 'INITIAL_PAGE_ALREADY_EXISTS: Ya tienes una página.' };

    await expect(
      createLandingFromConversation({
        supabase: createFakeSupabase(state),
        userId: USER_ID,
        document: generatedDocument()
      })
    ).rejects.toThrow('Ya tienes una página');
  });

  it('12) replaceLandingDraft writes ONLY when the user explicitly chose the new design', async () => {
    const state = fakeState();
    state.pages.push({
      id: 'page-existing',
      owner_user_id: USER_ID,
      page_type: 'landing',
      template_config: createInitialMagicPageDocument('bio')
    });
    const document = generatedDocument('editorial_luxury');

    const result = await replaceLandingDraft({
      supabase: createFakeSupabase(state),
      userId: USER_ID,
      pageId: 'page-existing',
      document
    });

    expect(result).toEqual({ pageId: 'page-existing' });
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]!.filters['id']).toBe('page-existing');
    expect(state.updates[0]!.filters['owner_user_id']).toBe(USER_ID);
    expect(state.updates[0]!.payload['template_config']).toEqual(document);
    // The draft column is the only one touched: publish state is not modified.
    expect(Object.keys(state.updates[0]!.payload)).toEqual(['template_config']);
  });

  it('13) replaceLandingDraft rejects an invalid document instead of writing it', async () => {
    const state = fakeState();
    state.pages.push({ id: 'page-existing', owner_user_id: USER_ID, page_type: 'landing', template_config: null });

    await expect(
      replaceLandingDraft({
        supabase: createFakeSupabase(state),
        userId: USER_ID,
        pageId: 'page-existing',
        document: { documentType: 'not-magic' } as never
      })
    ).rejects.toThrow();

    expect(state.updates).toEqual([]);
  });
});
