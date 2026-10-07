import { familyFit } from '../data/familyFit';
import { templates } from '../data/templates';
import type { BusinessContext, TemplateId } from '../types/cripqer';

export interface Ranking {
  /** 2 (max 3) families to recommend in the conversation. */
  ids: TemplateId[];
  /** Every family, best fit first (used by the drawer's "Recomendadas" tab). */
  ranked: TemplateId[];
  reasons: Partial<Record<TemplateId, string>>;
}

/**
 * USER_BUSINESS + PRIMARY_GOAL + CONTACT → best matching visual families.
 * Families are visual systems; any of them can be adapted to the business.
 */
export function rankFamilies(ctx: BusinessContext): Ranking {
  const type = ctx.businessIdentity.type;
  const goal = ctx.primaryGoal;
  const channel = ctx.primaryChannel;

  const scored = templates.
  map((t, order) => {
    const fit = familyFit[t.id];
    let score = 0;
    const idx = type ? fit.strongFor.indexOf(type) : -1;
    if (idx === 0) score += 4;else
    if (idx > 0) score += 3;
    if (goal && fit.strongGoals.includes(goal)) score += 2;
    if (channel && fit.strongContent.includes(channel)) score += 1;
    return { id: t.id, score, order };
  }).
  sort((a, b) => b.score - a.score || a.order - b.order);

  const [first, second, third] = scored;
  const ids = [first, second].filter((s) => s && s.score >= 3).map((s) => s!.id);
  if (third && second && third.score >= 3 && third.score >= second.score - 1) ids.push(third.id);
  if (ids.length === 0) ids.push(first!.id, second!.id);

  const reasons: Partial<Record<TemplateId, string>> = {};
  ids.forEach((id) => reasons[id] = familyFit[id].reason);

  return { ids, ranked: scored.map((s) => s.id), reasons };
}