import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTemplateRotation } from './useTemplateRotation';
import { applyAgentResponse, applyPatch, applySelection } from '../utils/agent';
import { createAssistantService } from '../assistant/service';
import { createLocalAssistantProvider } from '../assistant/localProvider';
import { createConversionAdvisorProvider } from '../assistant/advisors/provider';
import { createConversionAdvisorClient } from '../assistant/advisors/transport';
import { resolveLandingAssistantProvider } from '../assistant/providerSelection';
import { planDeterministicTurn } from '../utils/landingCommands';
import type { ConversionAdvisorClient } from '../assistant/advisors/contract';
import type { AssistantOutcome, AssistantService } from '../assistant/contracts';
import { buildSeed } from '../utils/seed';
import { createBusinessContextStore, type BusinessContextStore } from '../state/businessContext';
import { getBusinessType, getTemplate } from '../utils/templates';
import { buildMagicEditorHandoff, type MagicEditorHandoff } from '../editor/handoff';
import { createLandingFromConversation, replaceLandingDraft } from '../editor/persist';
import { editRouteSearch } from '../../../components/home/editRouteSearch';
import { getBrowserSupabaseClient } from '../../../lib/supabase/client';
import { discoverCategories } from '../data/contentPacks';
import { templates } from '../data/templates';
import { isTemplateSelectionFrozen } from '../../landing-lite/flags';
import type { Attachment, BusinessContext, ChatMessage, Stage, StartAt, TemplateId } from '../types/cripqer';

export const FROZEN_SAFE_RESPONSE =
  'Esa función estará disponible próximamente. Por ahora puedes personalizar tu propia tarjeta.';

const THINK_MS = 1100;
const GENERATE_MS = 4600;

/**
 * An existing landing whose DRAFT would be replaced by the conversation.
 * Nothing is written while this is set: the user picks between "use the new
 * design" and "open my current page".
 */
interface DraftConflict {
  handoff: MagicEditorHandoff;
  pageId: string;
  userId: string;
}

function categorySlots(typeId: string): TemplateId[] {
  const type = getBusinessType(typeId);
  if (!type) return [];
  const extra = type.recommended.flatMap((id) => getTemplate(id).related);
  const pool = Array.from(new Set([...type.recommended, ...extra, ...templates.map((t) => t.id)]));
  return pool.slice(0, 4);
}

export interface CripqerSessionOptions {
  /**
   * CONV-03 · the Advisor transport, injectable so a test or a host can run the
   * real landing with a scripted, zero-network conversation. Production omits
   * it and gets the canonical server-function client. It is the CLIENT, not the
   * provider: no presentation component ever sees a raw provider object.
   */
  readonly advisorTransport?: ConversionAdvisorClient | undefined;
}

export function useCripqerSession(startAt: StartAt, options: CripqerSessionOptions = {}) {
  const seed = useRef(buildSeed(startAt)).current;
  const [stage, setStage] = useState<Stage>(seed.stage);
  const [messages, setMessages] = useState<ChatMessage[]>(seed.messages);
  const storeRef = useRef<BusinessContextStore | null>(null);
  if (!storeRef.current) storeRef.current = createBusinessContextStore(seed.context);
  const store = storeRef.current;
  const context = useSyncExternalStore(store.subscribe, store.get, store.get);

  const assistantRef = useRef<AssistantService | null>(null);
  if (!assistantRef.current) {
    // CONV-03 · the product provider is the Conversion Advisor. The flag is
    // resolved ONCE, here, so a session can never hold two brains and an Advisor
    // failure can never wake the local one (the facade answers a safe sentence).
    const kind = resolveLandingAssistantProvider();
    assistantRef.current =
      kind === 'local' ?
      createAssistantService({ provider: createLocalAssistantProvider() }) :
      createAssistantService({
        provider: createConversionAdvisorProvider({
          client: options.advisorTransport ?? createConversionAdvisorClient()
        })
      });
  }
  const assistant = assistantRef.current;
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);
  const [handoff, setHandoff] = useState<MagicEditorHandoff | null>(() => {
    if (seed.stage !== 'editor') return null;
    try {
      return buildMagicEditorHandoff(seed.context);
    } catch {
      return null;
    }
  });
  const [handoffError, setHandoffError] = useState<string | null>(null);
  /**
   * Phase 9 — real persistence state.
   *
   * `creating` is the anti-double-submit guard: the schema allows exactly one
   * canonical landing, and a double CREATE_PAGE must not fire two RPC rounds.
   * `draftConflict` holds an existing landing whose DRAFT would be replaced, so
   * nothing is written until the user confirms.
   */
  const [creating, setCreating] = useState(false);
  const [draftConflict, setDraftConflict] = useState<DraftConflict | null>(null);
  /**
   * Which reason opened the real Auth overlay:
   * - `create`: a CREATE_PAGE is pending and resumes right after login;
   * - `signin`: the header's "Iniciar sesión" button, which only signs in.
   */
  const [authPrompt, setAuthPrompt] = useState<'create' | 'signin' | null>(null);
  const creatingRef = useRef(false);
  const navigate = useNavigate();
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const [category, setCategory] = useState('all');
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const categoryType = discoverCategories.find((c) => c.id === category)?.typeId ?? null;
  const rotation = useTemplateRotation(stage === 'discover' && !categoryType);
  const slots = useMemo(() => categoryType ? categorySlots(categoryType) : rotation.slots, [categoryType, rotation.slots]);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const setContext = (next: BusinessContext) => {
    store.set(next);
  };

  const push = (role: ChatMessage['role'], text: string, attachment?: Attachment) => {
    counter.current += 1;
    const msg: ChatMessage = { id: `m${counter.current}-${Date.now()}`, role, text, attachment };
    setMessages((prev) => [...prev, msg]);
  };

  const beginConversation = () => {
    if (store.get().session.initialTemplates.length === 0) {
      setContext({ ...store.get(), session: { ...store.get().session, initialTemplates: slotsRef.current } });
    }
    setStage((s) => s === 'discover' ? 'converse' : s);
  };

  /** Open the productive editor route for a REAL pageId. */
  const openProductiveEditor = useCallback(
    async (pageId: string) => {
      await navigate({ to: '/pages/$pageId/edit', params: { pageId }, search: editRouteSearch });
    },
    [navigate]
  );

  /**
   * Keep the "generating" stage on screen for at least GENERATE_MS so the
   * animation and the real persistence overlap instead of racing.
   */
  const holdGenerating = (startedAt: number) =>
    new Promise<void>((resolve) => later(() => resolve(), Math.max(0, GENERATE_MS - (Date.now() - startedAt))));

  /**
   * Phase 9 CASO A — persist the conversation's document and open the real
   * editor. Nothing is kept in memory: the pageId is real and the document is
   * written through the same `saveDraft` the productive editor autosaves with.
   */
  const persistAndOpen = async (next: MagicEditorHandoff) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    const startedAt = Date.now();
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        // Phase 9 CASO B: open the real Auth as an overlay and keep EVERYTHING
        // (messages, Business Context, selected template, the pending
        // CREATE_PAGE in `handoff`) so the flow resumes untouched after login.
        setStage('converse');
        setAuthPrompt('create');
        return;
      }

      const outcome = await createLandingFromConversation({
        supabase,
        userId: user.id,
        userEmail: user.email ?? null,
        userMetadata: user.user_metadata ?? null,
        document: next.document,
      });

      await holdGenerating(startedAt);

      if (outcome.status === 'existing-draft') {
        // The owner already had a landing with a draft. Never overwrite it
        // silently: hand the decision to the user.
        setDraftConflict({ handoff: next, pageId: outcome.pageId, userId: user.id });
        setStage('converse');
        return;
      }

      await openProductiveEditor(outcome.pageId);
    } catch (error) {
      // Controlled failure: the conversation, the Business Context and the
      // selection stay intact, and no editor is opened.
      setStage('converse');
      setHandoff(null);
      setHandoffError(error instanceof Error ? error.message : 'No se pudo crear tu página.');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const createPage = useCallback(() => {
    if (isTemplateSelectionFrozen()) {
      push('assistant', FROZEN_SAFE_RESPONSE);
      return;
    }
    setDrawerOpen(false);
    setPreviewId(null);
    let next: MagicEditorHandoff;
    try {
      next = buildMagicEditorHandoff(store.get());
    } catch (reason) {
      // Controlled failure: the conversation, the Business Context and the
      // selection stay intact, and no editor (mock or otherwise) is opened.
      setHandoff(null);
      setHandoffError(reason instanceof Error ? reason.message : 'No se pudo preparar tu página.');
      return;
    }
    setHandoff(next);
    setHandoffError(null);
    setStage('generating');
    void persistAndOpen(next);
  }, [supabase, navigate]);

  /** "Usar este nuevo diseño": replace the DRAFT of the existing landing. */
  const useNewDesign = useCallback(async () => {
    if (isTemplateSelectionFrozen()) {
      push('assistant', FROZEN_SAFE_RESPONSE);
      return;
    }
    const conflict = draftConflict;
    if (!conflict || creatingRef.current) return;
    setDraftConflict(null);
    creatingRef.current = true;
    setCreating(true);
    try {
      await replaceLandingDraft({
        supabase,
        userId: conflict.userId,
        pageId: conflict.pageId,
        document: conflict.handoff.document,
      });
      await openProductiveEditor(conflict.pageId);
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : 'No se pudo guardar tu página.');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }, [draftConflict, supabase, openProductiveEditor]);

  /** "Abrir mi página actual": open the existing landing without writing. */
  const openCurrentPage = useCallback(async () => {
    const conflict = draftConflict;
    if (!conflict) return;
    setDraftConflict(null);
    await openProductiveEditor(conflict.pageId);
  }, [draftConflict, openProductiveEditor]);

  const dismissDraftConflict = useCallback(() => setDraftConflict(null), []);

  /** Header "Iniciar sesión": the real Auth overlay, with no pending creation. */
  const openSignIn = useCallback(() => setAuthPrompt('signin'), []);

  const closeAuth = useCallback(() => {
    // Closing without authenticating drops the pending creation, so a later
    // CREATE_PAGE starts from a freshly generated document.
    if (authPrompt === 'create') setHandoff(null);
    setAuthPrompt(null);
  }, [authPrompt]);

  /** Real session established: resume the pending CREATE_PAGE, if any. */
  const completeAuth = useCallback(() => {
    const prompt = authPrompt;
    setAuthPrompt(null);
    if (prompt !== 'create') return;
    const pending = handoff;
    if (pending) void persistAndOpen(pending);
  }, [authPrompt, handoff]);

  /** Back from the editor: the conversation and the Business Context are kept. */
  const backToConversation = useCallback(() => {
    setHandoff(null);
    setHandoffError(null);
    setStage('converse');
  }, []);

  const respond = async (ask: () => Promise<AssistantOutcome>) => {
    const outcome = await ask();
    const applied = applyAgentResponse(store.get(), outcome.response);
    const frozen = isTemplateSelectionFrozen();

    if (frozen) {
      if (applied.effects.create) {
        applied.effects.create = false;
        applied.attachment = undefined;
      }
      if (applied.context.template.selectedTemplateId !== store.get().template.selectedTemplateId) {
        applied.context = {
          ...applied.context,
          template: store.get().template,
        };
        if (applied.attachment?.kind === 'selected') {
          applied.attachment = undefined;
        }
      }
    }

    setContext(applied.context);

    const isSelectionOrCreation = outcome.response.actions.some(
      (a) => a.type === 'CREATE_PAGE' || a.type === 'SELECT_TEMPLATE'
    );

    if (frozen && isSelectionOrCreation) {
      push('assistant', FROZEN_SAFE_RESPONSE);
    } else {
      push('assistant', outcome.response.text, applied.attachment);
    }

    setThinking(false);
    if (applied.effects.openDrawer) later(() => setDrawerOpen(true), 250);
    if (applied.effects.previewId) {
      const id = applied.effects.previewId;
      later(() => setPreviewId(id), 450);
    }
    if (!frozen && applied.effects.create) later(createPage, 900);
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    beginConversation();
    push('user', clean);
    setDraft('');
    const frozen = isTemplateSelectionFrozen();
    const wantsCreate = /(creamela|creala|crealo|hazmela|hazla|generala|crea mi pagina|crear mi pagina|crear ya|listo,? crea|dale,? crea)/i.test(clean);
    if (frozen && wantsCreate) {
      setThinking(true);
      later(() => {
        push('assistant', FROZEN_SAFE_RESPONSE);
        setThinking(false);
      }, THINK_MS);
      return;
    }
    // CONV-03 · CREATE_PAGE never waits for a model. A ready landing executes
    // the existing deterministic command (and its persistence path); a not-ready
    // one asks for the next missing slot. Neither touches the transport, so a
    // creation instruction costs zero provider calls and cannot be talked into
    // happening early by model output.
    const deterministic = planDeterministicTurn({ context: store.get(), message: clean });
    if (deterministic) {
      setThinking(true);
      later(() => {
        void respond(async () => ({
          ok: true,
          response: {
            text: deterministic.response.text,
            actions: deterministic.response.actions,
            metadata: { provider: 'deterministic-landing', model: null, fallback: false }
          },
          error: null
        }));
      }, THINK_MS);
      return;
    }
    setThinking(true);
    later(() => {
      void respond(() => assistant.sendMessage(clean, store.get(), messages));
    }, THINK_MS);
  };

  const selectTemplate = (id: TemplateId) => {
    if (thinking) return;
    setPreviewId(null);
    setDrawerOpen(false);
    beginConversation();
    if (isTemplateSelectionFrozen()) {
      push('user', `Quiero usar el estilo ${getTemplate(id).name}`);
      push('assistant', FROZEN_SAFE_RESPONSE);
      return;
    }
    if (store.get().template.selectedTemplateId === id) return;
    push('user', `Quiero usar el estilo ${getTemplate(id).name}`, { kind: 'selected', id });
    setContext(applySelection(store.get(), id));
    setThinking(true);
    later(() => {
      void respond(() => assistant.selectTemplate(id, store.get(), messages));
    }, THINK_MS - 300);
  };

  /** Discover chips feed the same Business Context as the conversation. */
  const selectCategory = (id: string) => {
    setCategory(id);
    const typeId = discoverCategories.find((c) => c.id === id)?.typeId ?? null;
    const ctx = store.get();
    if (typeId) setContext(applyPatch(ctx, { type: typeId }));else
    setContext({ ...ctx, businessIdentity: { ...ctx.businessIdentity, type: null }, primaryGoal: null });
  };

  const requestCreate = () => {
    if (thinking) return;
    if (isTemplateSelectionFrozen()) {
      push('assistant', FROZEN_SAFE_RESPONSE);
      return;
    }
    send('Ya, créamela');
  };

  return {
    stage,
    setStage,
    messages,
    context,
    thinking,
    draft,
    setDraft,
    drawerOpen,
    setDrawerOpen,
    previewId,
    setPreviewId,
    slots,
    category,
    categoryType,
    selectCategory,
    setRotationPaused: rotation.setPaused,
    send,
    selectTemplate,
    handoff,
    handoffError,
    dismissHandoffError: () => setHandoffError(null),
    backToConversation,
    creating,
    draftConflict,
    useNewDesign,
    openCurrentPage,
    dismissDraftConflict,
    authPrompt,
    openSignIn,
    closeAuth,
    completeAuth,
    /** CREATE_PAGE itself (the assistant reaches it through `requestCreate`). */
    createPage,
    requestCreate
  };
}

export type CripqerSession = ReturnType<typeof useCripqerSession>;