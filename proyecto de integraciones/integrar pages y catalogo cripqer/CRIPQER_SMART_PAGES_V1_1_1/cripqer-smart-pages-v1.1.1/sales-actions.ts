/**
 * CRIPQER SMART PAGES V1 — assisted conversion actions.
 *
 * Deterministic message building. Prices are only included when the item
 * actually carries one; nothing is ever invented.
 */

import type { CatalogItemV1, SalesActionV1 } from "./catalog.types";

export function formatPrice(item: CatalogItemV1): string | undefined {
  const price = item.price;
  if (!price) return undefined;
  if (price.label) return price.label;
  if (typeof price.amount === "number") {
    return price.currency ? `${price.currency} ${price.amount}` : String(price.amount);
  }
  return undefined;
}

export function sanitizePhone(raw: string | undefined): string {
  return (raw ?? "").replace(/[^\d]/g, "");
}

export function isSafeUrl(url: string | undefined): url is string {
  if (!url) return false;
  return /^(https?:|mailto:|tel:)/i.test(url.trim());
}

export interface WhatsAppContext {
  businessName: string;
  phone?: string;
  item?: CatalogItemV1;
  items?: CatalogItemV1[];
  customIntro?: string;
}

/** Deterministic — same input always produces the same message. */
export function buildWhatsAppMessage(ctx: WhatsAppContext): string {
  const lines: string[] = [];
  lines.push(ctx.customIntro ?? `Hi ${ctx.businessName}, I'm writing from your page.`);
  const list = ctx.items ?? (ctx.item ? [ctx.item] : []);
  if (list.length === 1 && list[0]) {
    const item = list[0];
    const price = formatPrice(item);
    lines.push(`I'm interested in: ${item.name}${price ? ` (${price})` : ""}.`);
  } else if (list.length > 1) {
    lines.push("I'm interested in:");
    for (const item of list) {
      const price = formatPrice(item);
      lines.push(`• ${item.name}${price ? ` (${price})` : ""}`);
    }
  }
  lines.push("Could you give me more information?");
  return lines.join("\n");
}

export function whatsAppHref(ctx: WhatsAppContext): string | undefined {
  const phone = sanitizePhone(ctx.phone);
  if (!phone) return undefined;
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(ctx))}`;
}

/** Context every action resolution needs. Nothing here is ever invented. */
export interface ActionContextV1 {
  businessName: string;
  item?: CatalogItemV1;
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  bookingUrl?: string;
}

function mailtoHref(email: string, ctx: ActionContextV1): string {
  const subject = ctx.item ? `Enquiry: ${ctx.item.name}` : `Enquiry \u2014 ${ctx.businessName}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

function whatsappFor(action: SalesActionV1 | undefined, phone: string, ctx: ActionContextV1) {
  const wa: WhatsAppContext = { businessName: ctx.businessName, phone };
  if (ctx.item) wa.item = ctx.item;
  if (action?.messageTemplate) wa.customIntro = action.messageTemplate;
  return whatsAppHref(wa);
}

/**
 * Resolves an action to a safe href, or undefined when it cannot be used.
 * quote / contact / email degrade: configured target -> email -> WhatsApp ->
 * phone -> unavailable. An action is never presented as usable without a
 * real target.
 */
export function actionHref(
  action: SalesActionV1 | undefined,
  ctx: ActionContextV1,
): string | undefined {
  if (!action || !action.enabled) return undefined;
  switch (action.kind) {
    case "whatsapp": {
      const phone = action.target ?? ctx.contactWhatsapp ?? ctx.contactPhone;
      return phone ? whatsappFor(action, phone, ctx) : undefined;
    }
    case "call": {
      const phone = sanitizePhone(action.target ?? ctx.contactPhone ?? ctx.contactWhatsapp);
      return phone ? `tel:+${phone}` : undefined;
    }
    case "email":
    case "quote":
    case "contact": {
      const explicit = action.target;
      if (explicit) {
        if (explicit.includes("@")) return mailtoHref(explicit, ctx);
        if (isSafeUrl(explicit)) return explicit;
      }
      if (ctx.contactEmail && ctx.contactEmail.includes("@"))
        return mailtoHref(ctx.contactEmail, ctx);
      if (ctx.contactWhatsapp) return whatsappFor(action, ctx.contactWhatsapp, ctx);
      const phone = sanitizePhone(ctx.contactPhone);
      return phone ? `tel:+${phone}` : undefined;
    }
    case "external_booking": {
      const url = action.target ?? ctx.bookingUrl;
      return isSafeUrl(url) ? url : undefined;
    }
    case "external_url":
      return isSafeUrl(action.target) ? action.target : undefined;
    case "checkout":
      // Future contract. Never rendered in V1.
      return undefined;
    default:
      return undefined;
  }
}

const DEFAULT_LABELS: Record<SalesActionV1["kind"], string> = {
  whatsapp: "WhatsApp",
  contact: "Contact",
  quote: "Request quote",
  call: "Call",
  email: "Email us",
  external_booking: "Book now",
  external_url: "Open link",
  checkout: "Checkout",
};

export function defaultLabel(kind: SalesActionV1["kind"]): string {
  return DEFAULT_LABELS[kind];
}

const MODE_TO_KIND: Record<CatalogItemV1["salesMode"], SalesActionV1["kind"] | null> = {
  contact: "contact",
  quote: "quote",
  booking: "external_booking",
  info: "contact",
  // Checkout stays a hidden future contract: it never produces a V1 action.
  checkout: null,
};

export interface ResolvedActionV1 {
  action: SalesActionV1;
  href?: string;
  /** Which level of the priority chain won. */
  source: "item_action" | "item_sales_mode" | "section_default" | "global";
}

/**
 * Item-level action authority.
 * item.action -> item.salesMode -> section default -> global fallback.
 * A globally available WhatsApp NEVER overrides an explicit item action.
 */
export function resolveItemAction(
  item: CatalogItemV1,
  ctx: ActionContextV1,
  defaults: {
    sectionAction?: SalesActionV1 | undefined;
    globalAction?: SalesActionV1 | undefined;
  } = {},
): ResolvedActionV1 {
  const itemCtx: ActionContextV1 = { ...ctx, item };
  const candidates: Array<{
    action: SalesActionV1 | undefined;
    source: ResolvedActionV1["source"];
  }> = [];

  if (item.action && item.action.enabled && item.action.kind !== "checkout") {
    candidates.push({ action: item.action, source: "item_action" });
  }
  const modeKind = MODE_TO_KIND[item.salesMode];
  if (modeKind) {
    candidates.push({
      action: { kind: modeKind, label: DEFAULT_LABELS[modeKind], enabled: true },
      source: "item_sales_mode",
    });
  }
  candidates.push({ action: defaults.sectionAction, source: "section_default" });
  candidates.push({ action: defaults.globalAction, source: "global" });

  for (const candidate of candidates) {
    if (!candidate.action || candidate.action.kind === "checkout") continue;
    const href = actionHref(candidate.action, itemCtx);
    if (href) return { action: candidate.action, href, source: candidate.source };
  }

  const first = candidates.find((c) => c.action && c.action.kind !== "checkout");
  return {
    action: first?.action ?? { kind: "contact", label: DEFAULT_LABELS.contact, enabled: false },
    source: first?.source ?? "global",
  };
}

export function action(
  kind: SalesActionV1["kind"],
  label: string,
  target?: string,
  enabled = true,
): SalesActionV1 {
  const result: SalesActionV1 = { kind, label, enabled };
  if (target) result.target = target;
  return result;
}
