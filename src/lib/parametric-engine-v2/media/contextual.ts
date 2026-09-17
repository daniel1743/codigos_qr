import "@tanstack/react-start/server-only";
import { curateMedia } from "./curator";
import type { CuratedMediaResult, MediaQueryTrace } from "./types";
import type { NormalizedMediaAsset } from "./types";

const CONTEXTUAL_ROLES = ["banner", "background"] as const;
const CONTEXTUAL_TERMS = /salon|beauty|barber|restaurant|fitness|fashion|clothing|office|studio|photograph|garden|consult/i;

export interface ContextualMediaDecision {
  ownerCoverAvailable: boolean;
  needed: boolean;
  allowed: boolean;
  reason: string;
}

export function resolveContextualMedia(input: {
  profession: string;
  ownerCoverAvailable: boolean;
  mediaStrategy?: string | null;
}): ContextualMediaDecision {
  const specific = CONTEXTUAL_TERMS.test(input.profession);
  const useful = input.mediaStrategy ? input.mediaStrategy !== "minimal-no-media" : specific;
  const allowed = !input.ownerCoverAvailable && specific && useful;
  return {
    ownerCoverAvailable: input.ownerCoverAvailable,
    needed: allowed,
    allowed,
    reason: input.ownerCoverAvailable
      ? "Suitable owner cover has priority."
      : allowed
        ? "Contextual hero is useful and semantically safe."
        : "Context is too vague or the selected strategy does not need imagery.",
  };
}

export async function searchContextualHero(input: {
  profession: string;
  style?: string;
  goal?: string;
  ownerCoverAvailable: boolean;
  mediaStrategy?: string | null;
}): Promise<{ decision: ContextualMediaDecision; media?: CuratedMediaResult }> {
  const decision = resolveContextualMedia(input);
  if (!decision.allowed) return { decision };
  try {
    const [{ searchPexels }, { searchUnsplashPhotos }] = await Promise.all([
      import("./pexels-provider"),
      import("./unsplash-provider"),
    ]);
    const media = await curateMedia(
      { profession: input.profession, ...(input.style ? { style: input.style } : {}), ...(input.goal ? { goal: input.goal } : {}), roles: [...CONTEXTUAL_ROLES] },
      (request, provider) => provider === "unsplash" ? searchUnsplashPhotos(request) : searchPexels(request),
    );
    return { decision, media };
  } catch {
    return { decision, media: undefined };
  }
}

export function selectedContextualHero(media: CuratedMediaResult | undefined): NormalizedMediaAsset | undefined {
  return media?.assets.banner?.[0] ?? media?.assets.background?.[0];
}

export function contextualQuery(media: CuratedMediaResult | undefined): MediaQueryTrace | undefined {
  return media?.queries.banner?.[0] ?? media?.queries.background?.[0];
}
