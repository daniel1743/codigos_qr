import type { BioTemplateConfig } from "@/premium-template-studio/types";
import type { GenerationTraceV1, TraceStageId, TraceStageV1 } from "./types";

const STORAGE_PREFIX = "cripqer:blackbox:";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function storageKey(traceId: string): string {
  return `${STORAGE_PREFIX}${traceId}`;
}

export function storeBlackBoxTrace(trace: GenerationTraceV1): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(trace.traceId), JSON.stringify(clone(trace)));
}

export function readBlackBoxTrace(traceId: string): GenerationTraceV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(traceId));
    return raw ? (JSON.parse(raw) as GenerationTraceV1) : null;
  } catch {
    return null;
  }
}

export function findBlackBoxTraceForPage(pageId: string): GenerationTraceV1 | null {
  if (typeof window === "undefined") return null;
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const trace = readBlackBoxTrace(key.slice(STORAGE_PREFIX.length));
    const readback = trace?.stages.find((stage) => stage.id === "E19")?.data;
    if (
      readback &&
      typeof readback === "object" &&
      (readback as { pageId?: unknown }).pageId === pageId
    ) {
      return trace;
    }
  }
  return null;
}

export function appendBlackBoxStage(
  traceId: string,
  stage: Omit<TraceStageV1, "id"> & { id: TraceStageId },
): GenerationTraceV1 | null {
  const trace = readBlackBoxTrace(traceId);
  if (!trace) return null;
  const next = { ...trace, stages: [...trace.stages, clone(stage)] };
  storeBlackBoxTrace(next);
  return next;
}

function fingerprint(value: unknown): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).slice(0, 32);
  } catch {
    return "unavailable";
  }
}

export function canonicalRuntimeSnapshot(config: BioTemplateConfig) {
  return {
    fingerprint: fingerprint(config),
    theme: config.theme,
    profile: config.profile,
    banner: config.profile?.banner ?? null,
    blocks: config.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      variant: block.variant,
      style: block.style,
      media:
        block.content.bannerImage ??
        block.content.backgroundImage ??
        block.content.imageUrl ??
        block.content.images ??
        null,
    })),
  };
}

function computed(element: Element | null): Record<string, string> | null {
  if (!(element instanceof HTMLElement)) return null;
  const style = window.getComputedStyle(element);
  return {
    backgroundColor: style.backgroundColor,
    backgroundImage: style.backgroundImage,
    border: style.border,
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
    padding: style.padding,
    width: style.width,
    height: style.height,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
  };
}

export function captureEffectiveDomSnapshot() {
  const page = document.querySelector<HTMLElement>(".pts-page");
  const blocks = [...document.querySelectorAll<HTMLElement>("[data-block-id]")];
  const hero = document.querySelector<HTMLElement>(
    '[data-editor-target="hero"], [data-editor-target="profile-cover"], .pts-page > div',
  );
  const cta = document.querySelector<HTMLElement>(
    '[data-block-id][data-block-type="cta"], a, button',
  );
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    page: computed(page),
    hero: computed(hero),
    profile: computed(document.querySelector("[data-editor-target='profile']")),
    serviceCards: blocks.filter((block) => block.textContent?.toLowerCase().includes("servicio"))
      .length,
    blocks: blocks.map((block) => ({
      id: block.dataset.blockId ?? null,
      computed: computed(block),
    })),
    cta: computed(cta),
  };
}
