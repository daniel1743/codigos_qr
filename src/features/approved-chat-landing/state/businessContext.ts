import { applyAgentResponse, applyPatch, applySelection, emptyContext } from '../utils/agent';
import { getBusinessType, getChannel, getTemplate } from '../utils/templates';
import { goals } from '../data/business';
import type { AppliedResponse } from '../utils/agent';
import type {
  AgentResponse,
  BusinessContext,
  ChannelId,
  ContextPatch,
  TemplateId } from
'../types/cripqer';

/*
 * Business Context adapter - the single source of truth for what the
 * conversational landing has understood about the business.
 *
 * Responsibility boundary:
 *   UI (components + hooks)  ->  this adapter  ->  prototype agent reducers
 *
 * Components stay read-only consumers: they receive a BusinessContext snapshot
 * and never write it. Nothing here talks to the network, Supabase, the Magic
 * Editor or the assistant service.
 *
 * PROTOTYPE STAGE: values still come from the local rule-based agent
 * (utils/agent.ts). When the provider-independent Assistant Service lands, only
 * this adapter changes.
 */

/** Structural partial: every slice the prototype agent can already produce. */
export interface BusinessContextPartial {
  businessIdentity?: Partial<BusinessContext['businessIdentity']>;
  primaryGoal?: string | null;
  primaryChannel?: ChannelId | null;
  template?: Partial<BusinessContext['template']>;
  session?: Partial<BusinessContext['session']>;
}

/**
 * Readable projection of the context. Derived on demand, so no second copy of
 * the data is ever stored.
 */
export interface BusinessContextSummary {
  businessName: string | null;
  businessTypeId: string | null;
  businessTypeLabel: string | null;
  goalId: string | null;
  goalLabel: string | null;
  primaryChannel: ChannelId | null;
  primaryChannelLabel: string | null;
  description: string | null;
  visualFamily: string | null;
  selectedStyle: string | null;
  selectedTemplateId: TemplateId | null;
  selectedTemplateName: string | null;
}

/** Derived flags. readyForPage mirrors the prototype own nextStep() gate. */
export interface BusinessReadiness {
  hasBusinessName: boolean;
  hasBusinessType: boolean;
  hasGoal: boolean;
  hasChannel: boolean;
  hasTemplate: boolean;
  hasDescription: boolean;
  readyForPage: boolean;
}

export interface BusinessContextStore {
  /** Stable snapshot: same reference until something actually changes. */
  get(): BusinessContext;
  /** Replace the whole context. */
  set(next: BusinessContext): BusinessContext;
  /** Conversational patch, exactly the prototype ContextPatch semantics. */
  patch(patch: ContextPatch): BusinessContext;
  /** Structural partial merge (identity / goal / channel / template / session). */
  update(partial: BusinessContextPartial): BusinessContext;
  /** Select a visual family without touching the business data. */
  selectTemplate(id: TemplateId): BusinessContext;
  /** Apply a full agent response (text + actions + context) in one step. */
  applyResponse(res: AgentResponse): AppliedResponse;
  /** Back to an empty context. */
  reset(): BusinessContext;
  subscribe(listener: (ctx: BusinessContext) => void): () => void;
}

export function createBusinessContextStore(
initial: BusinessContext = emptyContext())
: BusinessContextStore {
  let value = initial;
  const listeners = new Set<(ctx: BusinessContext) => void>();

  const commit = (next: BusinessContext): BusinessContext => {
    value = next;
    listeners.forEach((listener) => listener(value));
    return value;
  };

  return {
    get: () => value,
    set: (next) => commit(next),
    patch: (patch) => commit(applyPatch(value, patch)),
    update: (partial) => commit(mergeBusinessContext(value, partial)),
    selectTemplate: (id) => commit(applySelection(value, id)),
    applyResponse: (res) => {
      const applied = applyAgentResponse(value, res);
      commit(applied.context);
      return applied;
    },
    reset: () => commit(emptyContext()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

/**
 * Structural merge used by update(). Null clears a field; keys left out are
 * preserved and never reset silently.
 */
export function mergeBusinessContext(
ctx: BusinessContext,
partial: BusinessContextPartial)
: BusinessContext {
  const identity = partial.businessIdentity ?? {};
  const template = partial.template ?? {};
  const session = partial.session ?? {};
  return {
    businessIdentity: {
      name: identity.name !== undefined ? identity.name : ctx.businessIdentity.name,
      type: identity.type !== undefined ? identity.type : ctx.businessIdentity.type,
      description: identity.description !== undefined ? identity.description : ctx.businessIdentity.description
    },
    primaryGoal: partial.primaryGoal !== undefined ? partial.primaryGoal : ctx.primaryGoal,
    primaryChannel: partial.primaryChannel !== undefined ? partial.primaryChannel : ctx.primaryChannel,
    template: {
      selectedTemplateId: template.selectedTemplateId !== undefined ? template.selectedTemplateId : ctx.template.selectedTemplateId,
      templateFamily: template.templateFamily !== undefined ? template.templateFamily : ctx.template.templateFamily,
      heroVariant: template.heroVariant !== undefined ? template.heroVariant : ctx.template.heroVariant,
      visualPersonality: template.visualPersonality !== undefined ? template.visualPersonality : ctx.template.visualPersonality
    },
    session: {
      initialTemplates: session.initialTemplates !== undefined ? session.initialTemplates : ctx.session.initialTemplates,
      lastShownTemplates: session.lastShownTemplates !== undefined ? session.lastShownTemplates : ctx.session.lastShownTemplates
    }
  };
}

/**
 * What is still missing before a page can be generated. Mirrors the order the
 * prototype asks its questions, so it never contradicts the conversation.
 */
export function deriveBusinessReadiness(ctx: BusinessContext): BusinessReadiness {
  const type = getBusinessType(ctx.businessIdentity.type);
  return {
    hasBusinessName: Boolean(ctx.businessIdentity.name),
    hasBusinessType: Boolean(ctx.businessIdentity.type),
    hasGoal: Boolean(ctx.primaryGoal),
    hasChannel: Boolean(ctx.primaryChannel),
    hasTemplate: Boolean(ctx.template.selectedTemplateId),
    hasDescription: Boolean(ctx.businessIdentity.description),
    readyForPage: Boolean(
      type &&
      ctx.template.selectedTemplateId &&
      ctx.primaryChannel &&
      (ctx.primaryGoal || !type.goalOptions)
    )
  };
}

/** Human readable view of the same context (labels, not storage). */
export function describeBusinessContext(ctx: BusinessContext): BusinessContextSummary {
  const type = getBusinessType(ctx.businessIdentity.type);
  const channel = getChannel(ctx.primaryChannel);
  const goal = goals.find((g) => g.id === ctx.primaryGoal);
  const templateId = ctx.template.selectedTemplateId;
  return {
    businessName: ctx.businessIdentity.name,
    businessTypeId: ctx.businessIdentity.type,
    businessTypeLabel: type ? type.label : null,
    goalId: ctx.primaryGoal,
    goalLabel: goal ? goal.label : null,
    primaryChannel: ctx.primaryChannel,
    primaryChannelLabel: channel ? channel.label : null,
    description: ctx.businessIdentity.description,
    visualFamily: ctx.template.templateFamily,
    selectedStyle: ctx.template.visualPersonality,
    selectedTemplateId: templateId,
    selectedTemplateName: templateId ? getTemplate(templateId).name : null
  };
}
