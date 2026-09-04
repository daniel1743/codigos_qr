export const MEDIA_ROLES = [
  "avatar",
  "banner",
  "background",
  "gallery",
  "portfolio",
  "media-card",
  "video",
] as const;

export type MediaRole = (typeof MEDIA_ROLES)[number];
export type MediaType = "photo" | "video";
export type MediaOrientation = "portrait" | "landscape" | "square";
export type MediaProvider = "auto" | "pexels" | "unsplash";
export type NormalizedMediaProvider = Exclude<MediaProvider, "auto">;

export interface MediaRequest {
  profession: string;
  style?: string;
  goal?: string;
  role: MediaRole;
  orientation?: MediaOrientation;
  count?: number;
  preferredColor?: string;
}

export interface NormalizedMediaAsset {
  provider: NormalizedMediaProvider;
  providerId: string;
  type: MediaType;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  orientation: MediaOrientation;
  creatorName: string;
  creatorUrl: string;
  sourcePage: string;
  alt: string;
  queryUsed: string;
}

export interface CuratedMediaRequest {
  profession: string;
  style?: string;
  goal?: string;
  roles: MediaRole[];
  provider?: MediaProvider;
  preferredColor?: string;
}

export type CuratedMediaAssets = Partial<Record<MediaRole, NormalizedMediaAsset[]>>;

export interface MediaQueryTrace {
  provider: NormalizedMediaProvider;
  query: string;
}

export interface CuratedMediaResult {
  provider: "mixed";
  assets: CuratedMediaAssets;
  queries: Partial<Record<MediaRole, MediaQueryTrace[]>>;
}

export function isMediaRole(value: unknown): value is MediaRole {
  return typeof value === "string" && (MEDIA_ROLES as readonly string[]).includes(value);
}

export function validateCuratedMediaRequest(value: unknown): CuratedMediaRequest {
  if (!value || typeof value !== "object") throw new Error("Invalid media request");
  const input = value as Partial<CuratedMediaRequest>;
  const profession =
    typeof input.profession === "string" ? input.profession.trim().slice(0, 80) : "";
  const style = typeof input.style === "string" ? input.style.trim().slice(0, 100) : undefined;
  const goal = typeof input.goal === "string" ? input.goal.trim().slice(0, 80) : undefined;
  const roles = Array.isArray(input.roles) ? [...new Set(input.roles.filter(isMediaRole))] : [];
  const provider =
    input.provider === "pexels" || input.provider === "unsplash" ? input.provider : "auto";
  const preferredColor =
    typeof input.preferredColor === "string" ? input.preferredColor.trim().slice(0, 40) : undefined;
  if (!profession || roles.length === 0)
    throw new Error("Profession and at least one media role are required");
  return {
    profession,
    ...(style ? { style } : {}),
    ...(goal ? { goal } : {}),
    roles,
    provider,
    ...(preferredColor ? { preferredColor } : {}),
  };
}
