import type {
  CuratedMediaRequest,
  CuratedMediaResult,
  MediaOrientation,
  MediaProvider,
  MediaRequest,
  MediaRole,
  NormalizedMediaAsset,
  NormalizedMediaProvider,
} from "./types";

export interface MediaSearchResult {
  assets: NormalizedMediaAsset[];
  query: string;
}

export type MediaSearcher = (
  request: MediaRequest & { query: string },
  provider: NormalizedMediaProvider,
) => Promise<MediaSearchResult>;

const PROFESSION_PROFILES: Record<string, { terms: string[]; parent: string }> = {
  manicurist: { terms: ["manicurist", "nail artist", "nail salon"], parent: "beauty studio" },
  hairdresser: { terms: ["hairdresser", "hair salon", "hairstylist"], parent: "beauty studio" },
  barber: { terms: ["barber", "barbershop", "men's grooming"], parent: "grooming studio" },
  gardener: { terms: ["gardener", "garden designer", "landscaper"], parent: "garden design" },
  "fitness-trainer": {
    terms: ["fitness trainer", "personal trainer", "fitness coach"],
    parent: "fitness studio",
  },
  restaurant: { terms: ["restaurant", "chef", "dining"], parent: "restaurant" },
  "beauty-aesthetician": {
    terms: ["aesthetician", "skin therapist", "beauty clinic"],
    parent: "beauty studio",
  },
  consultant: {
    terms: ["business consultant", "strategy consultant", "consulting"],
    parent: "professional office",
  },
  creator: {
    terms: ["content creator", "creative director", "filmmaker"],
    parent: "creative studio",
  },
  "real-estate-agent": {
    terms: ["real estate agent", "property advisor", "real estate"],
    parent: "property",
  },
};

const STYLE_TERMS: Record<string, string[]> = {
  minimal: ["minimal", "clean"],
  elegant: ["elegant", "refined"],
  luxury: ["luxury", "premium"],
  modern: ["modern", "contemporary"],
  creative: ["creative", "artistic"],
  energetic: ["energetic", "dynamic"],
  natural: ["natural", "organic"],
  professional: ["professional", "polished"],
  warm: ["warm", "welcoming"],
  "dark-premium": ["dark", "moody", "premium"],
};

const ROLE_TERMS: Record<MediaRole, string[]> = {
  avatar: ["professional portrait"],
  banner: ["wide banner", "hero image"],
  background: ["wide background", "editorial backdrop"],
  gallery: ["editorial photography"],
  portfolio: ["portfolio work"],
  "media-card": ["featured work"],
  video: ["behind the scenes"],
};

const ORIENTATION_BY_ROLE: Record<MediaRole, MediaOrientation> = {
  avatar: "portrait",
  banner: "landscape",
  background: "landscape",
  gallery: "square",
  portfolio: "square",
  "media-card": "landscape",
  video: "landscape",
};

export function normalizeCuratorKey(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-");
}

function profileFor(profession: string) {
  const key = normalizeCuratorKey(profession);
  return (
    PROFESSION_PROFILES[key] ?? {
      terms: [profession.trim() || "professional"],
      parent: "professional service",
    }
  );
}

function styleTerms(style: string | undefined): string[] {
  return (style ?? "")
    .split(/[\s,]+/)
    .flatMap((token) => STYLE_TERMS[normalizeCuratorKey(token)] ?? [token])
    .filter(Boolean)
    .slice(0, 3);
}

export function orientationForRole(role: MediaRole): MediaOrientation {
  return ORIENTATION_BY_ROLE[role];
}

export function countForRole(role: MediaRole): number {
  if (role === "avatar") return 3;
  if (role === "banner" || role === "background" || role === "video") return 5;
  if (role === "gallery" || role === "portfolio") return 8;
  return 6;
}

/** Produces ordered detailed -> simpler -> parent-category fallbacks. */
export function buildMediaQueryPlan(request: MediaRequest): string[] {
  const profile = profileFor(request.profession);
  const styles = styleTerms(request.style);
  const roleTerm = ROLE_TERMS[request.role].join(" ");
  const orientation = request.orientation ?? orientationForRole(request.role);
  const goal = request.goal?.trim();
  const color = request.preferredColor?.trim();
  const professionTerms = profile.terms.slice(0, 2).join(" ");
  const detailed = [styles.join(" "), color, professionTerms, roleTerm, goal]
    .filter(Boolean)
    .join(" ");
  const professionFallback = [professionTerms, roleTerm, orientation].filter(Boolean).join(" ");
  const parentFallback = [profile.parent, roleTerm, orientation].filter(Boolean).join(" ");
  return [
    ...new Set(
      [detailed, professionFallback, parentFallback].map((query) => query.trim()).filter(Boolean),
    ),
  ];
}

export function providerOrder(
  role: MediaRole,
  requested: MediaProvider = "auto",
): NormalizedMediaProvider[] {
  if (requested === "pexels") return role === "video" ? ["pexels"] : ["pexels", "unsplash"];
  if (requested === "unsplash") return role === "video" ? [] : ["unsplash", "pexels"];
  if (role === "video") return ["pexels"];
  if (role === "banner" || role === "background" || role === "portfolio")
    return ["unsplash", "pexels"];
  return ["pexels", "unsplash"];
}

function orientationScore(asset: NormalizedMediaAsset, expected: MediaOrientation): number {
  return asset.orientation === expected
    ? 40
    : asset.orientation === "square" || expected === "square"
      ? 18
      : 0;
}

function resolutionScore(asset: NormalizedMediaAsset): number {
  return Math.min(24, Math.round(Math.min(asset.width, asset.height) / 100));
}

export function rankMediaAssets(
  assets: readonly NormalizedMediaAsset[],
  expected: MediaOrientation,
  count: number,
): NormalizedMediaAsset[] {
  const unique = new Map<string, NormalizedMediaAsset>();
  assets.forEach((asset) => {
    const key = `${asset.provider}:${asset.providerId}`;
    if (asset.providerId && asset.url && !unique.has(key)) unique.set(key, asset);
  });
  return [...unique.values()]
    .map((asset, index) => ({
      asset,
      score: orientationScore(asset, expected) + resolutionScore(asset) - index / 1000,
    }))
    .sort((a, b) => b.score - a.score || a.asset.providerId.localeCompare(b.asset.providerId))
    .slice(0, count)
    .map(({ asset }) => asset);
}

/** Curates role-specific media, switching providers only through this policy. */
export async function curateMedia(
  request: CuratedMediaRequest,
  search: MediaSearcher,
): Promise<CuratedMediaResult> {
  const assets: CuratedMediaResult["assets"] = {};
  const queries: CuratedMediaResult["queries"] = {};
  const usedKeys = new Set<string>();
  const usedUrls = new Set<string>();

  for (const role of request.roles) {
    const mediaRequest: MediaRequest = {
      profession: request.profession,
      ...(request.style ? { style: request.style } : {}),
      ...(request.goal ? { goal: request.goal } : {}),
      ...(request.preferredColor ? { preferredColor: request.preferredColor } : {}),
      role,
      orientation: orientationForRole(role),
      count: countForRole(role),
    };
    const roleAssets: NormalizedMediaAsset[] = [];
    for (const query of buildMediaQueryPlan(mediaRequest)) {
      for (const provider of providerOrder(role, request.provider)) {
        queries[role] = [...(queries[role] ?? []), { provider, query }];
        try {
          const result = await search({ ...mediaRequest, query }, provider);
          const ranked = rankMediaAssets(
            result.assets,
            mediaRequest.orientation!,
            mediaRequest.count!,
          );
          for (const asset of ranked) {
            const key = `${asset.provider}:${asset.providerId}`;
            if (usedKeys.has(key) || usedUrls.has(asset.url)) continue;
            roleAssets.push(asset);
            usedKeys.add(key);
            usedUrls.add(asset.url);
            if (roleAssets.length >= mediaRequest.count!) break;
          }
        } catch {
          // Empty/error responses continue through simplified queries/providers.
        }
        if (roleAssets.length >= mediaRequest.count!) break;
      }
      if (roleAssets.length >= mediaRequest.count!) break;
    }
    if (roleAssets.length) assets[role] = roleAssets;
  }
  return { provider: "mixed", assets, queries };
}
