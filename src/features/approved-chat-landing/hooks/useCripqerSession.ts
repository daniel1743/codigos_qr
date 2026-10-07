import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTemplateRotation } from './useTemplateRotation';
import { afterSelection, applyAgentResponse, applyPatch, applySelection, runAgent } from '../utils/agent';
import { buildSeed } from '../utils/seed';
import { getBusinessType, getTemplate } from '../utils/templates';
import { discoverCategories } from '../data/contentPacks';
import { templates } from '../data/templates';
import type { AgentResponse, Attachment, BusinessContext, ChatMessage, Stage, StartAt, TemplateId } from '../types/cripqer';

const THINK_MS = 1100;
const GENERATE_MS = 4600;

function categorySlots(typeId: string): TemplateId[] {
  const type = getBusinessType(typeId);
  if (!type) return [];
  const extra = type.recommended.flatMap((id) => getTemplate(id).related);
  const pool = Array.from(new Set([...type.recommended, ...extra, ...templates.map((t) => t.id)]));
  return pool.slice(0, 5);
}

export function useCripqerSession(startAt: StartAt) {
  const seed = useRef(buildSeed(startAt)).current;
  const [stage, setStage] = useState<Stage>(seed.stage);
  const [messages, setMessages] = useState<ChatMessage[]>(seed.messages);
  const [context, setContextState] = useState<BusinessContext>(seed.context);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewId, setPreviewId] = useState<TemplateId | null>(null);
  const [category, setCategory] = useState('all');
  const ctxRef = useRef(context);
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
    ctxRef.current = next;
    setContextState(next);
  };

  const push = (role: ChatMessage['role'], text: string, attachment?: Attachment) => {
    counter.current += 1;
    const msg: ChatMessage = { id: `m${counter.current}-${Date.now()}`, role, text, attachment };
    setMessages((prev) => [...prev, msg]);
  };

  const beginConversation = () => {
    if (ctxRef.current.session.initialTemplates.length === 0) {
      setContext({ ...ctxRef.current, session: { ...ctxRef.current.session, initialTemplates: slotsRef.current } });
    }
    setStage((s) => s === 'discover' ? 'converse' : s);
  };

  const createPage = useCallback(() => {
    setDrawerOpen(false);
    setPreviewId(null);
    setStage('generating');
    later(() => setStage('editor'), GENERATE_MS);
  }, []);

  const respond = (res: AgentResponse) => {
    const applied = applyAgentResponse(ctxRef.current, res);
    setContext(applied.context);
    push('assistant', res.text, applied.attachment);
    setThinking(false);
    if (applied.effects.openDrawer) later(() => setDrawerOpen(true), 250);
    if (applied.effects.previewId) {
      const id = applied.effects.previewId;
      later(() => setPreviewId(id), 450);
    }
    if (applied.effects.create) later(createPage, 900);
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    beginConversation();
    push('user', clean);
    setDraft('');
    setThinking(true);
    later(() => respond(runAgent(clean, ctxRef.current)), THINK_MS);
  };

  const selectTemplate = (id: TemplateId) => {
    if (thinking) return;
    setPreviewId(null);
    setDrawerOpen(false);
    beginConversation();
    if (ctxRef.current.template.selectedTemplateId === id) return;
    push('user', `Quiero usar el estilo ${getTemplate(id).name}`, { kind: 'selected', id });
    setContext(applySelection(ctxRef.current, id));
    setThinking(true);
    later(() => respond(afterSelection(ctxRef.current, id)), THINK_MS - 300);
  };

  /** Discover chips feed the same Business Context as the conversation. */
  const selectCategory = (id: string) => {
    setCategory(id);
    const typeId = discoverCategories.find((c) => c.id === id)?.typeId ?? null;
    const ctx = ctxRef.current;
    if (typeId) setContext(applyPatch(ctx, { type: typeId }));else
    setContext({ ...ctx, businessIdentity: { ...ctx.businessIdentity, type: null }, primaryGoal: null });
  };

  const requestCreate = () => {
    if (thinking) return;
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
    requestCreate
  };
}

export type CripqerSession = ReturnType<typeof useCripqerSession>;