import type { MediaRequest, MediaOrientation, NormalizedMediaAsset } from "./types";
import type { MediaSearchResult } from "./curator";
import {
  fetchServerIntegration,
  getServerIntegrationSecret,
} from "@/server/integrations/server-fetch";

const PEXELS_PHOTO_ENDPOINT = "https://api.pexels.com/v1/search";
const PEXELS_VIDEO_ENDPOINT = "https://api.pexels.com/videos/search";

export class PexelsProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "MISSING_API_KEY" | "HTTP_ERROR" | "INVALID_RESPONSE" | "EMPTY_RESULTS",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PexelsProviderError";
  }
}

export interface PexelsProviderOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

function orientationOf(width: number, height: number): MediaOrientation {
  if (height > width * 1.05) return "portrait";
  if (width > height * 1.05) return "landscape";
  return "square";
}

function apiKeyFromServer(options: PexelsProviderOptions): string {
  const key = options.apiKey ?? getServerIntegrationSecret("PEXELS_API_KEY");
  if (!key?.trim())
    throw new PexelsProviderError("PEXELS_API_KEY is not configured", "MISSING_API_KEY");
  return key.trim();
}

function positiveNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function identifier(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : stringValue(value);
}

function photoAsset(value: Record<string, unknown>, query: string): NormalizedMediaAsset | null {
  const id = identifier(value["id"]);
  const src =
    value["src"] && typeof value["src"] === "object"
      ? (value["src"] as Record<string, unknown>)
      : {};
  const url =
    stringValue(src["original"]) || stringValue(src["large2x"]) || stringValue(src["large"]);
  const previewUrl =
    stringValue(src["large2x"]) || stringValue(src["large"]) || stringValue(src["medium"]) || url;
  const width = positiveNumber(value["width"]);
  const height = positiveNumber(value["height"]);
  if (!id || !url || !previewUrl || !width || !height) return null;
  const sourcePage = stringValue(value["url"]) || `https://www.pexels.com/photo/${id}/`;
  return {
    provider: "pexels",
    providerId: id,
    type: "photo",
    url,
    previewUrl,
    width,
    height,
    orientation: orientationOf(width, height),
    creatorName: stringValue(value["photographer"]),
    creatorUrl: stringValue(value["photographer_url"]),
    sourcePage,
    alt: stringValue(value["alt"]) || query,
    queryUsed: query,
  };
}

function videoAsset(value: Record<string, unknown>, query: string): NormalizedMediaAsset | null {
  const id = identifier(value["id"]);
  const files = Array.isArray(value["video_files"]) ? value["video_files"] : [];
  const usable = files
    .filter((file): file is Record<string, unknown> => Boolean(file && typeof file === "object"))
    .filter((file) => stringValue(file["link"]))
    .sort((a, b) => positiveNumber(b["width"]) - positiveNumber(a["width"]));
  const file = usable[0];
  const url = file ? stringValue(file["link"]) : "";
  const width = positiveNumber(file?.["width"], positiveNumber(value["width"]));
  const height = positiveNumber(file?.["height"], positiveNumber(value["height"]));
  const previewUrl = stringValue(value["image"]);
  const creator =
    value["user"] && typeof value["user"] === "object"
      ? (value["user"] as Record<string, unknown>)
      : {};
  if (!id || !url || !previewUrl || !width || !height) return null;
  return {
    provider: "pexels",
    providerId: id,
    type: "video",
    url,
    previewUrl,
    width,
    height,
    orientation: orientationOf(width, height),
    creatorName: stringValue(creator["name"]),
    creatorUrl: stringValue(creator["url"]),
    sourcePage: stringValue(value["url"]) || `https://www.pexels.com/video/${id}/`,
    alt: query,
    queryUsed: query,
  };
}

async function requestJson(
  endpoint: string,
  request: MediaRequest & { query: string },
  options: PexelsProviderOptions,
): Promise<Record<string, unknown>> {
  const fetchImpl = options.fetchImpl ?? fetchServerIntegration;
  const apiKey = apiKeyFromServer(options);
  const params = new URLSearchParams({
    query: request.query,
    orientation: request.orientation ?? "landscape",
    per_page: String(Math.min(80, Math.max(1, request.count ?? 5))),
  });
  let response: Response;
  try {
    response = await fetchImpl(`${endpoint}?${params.toString()}`, {
      headers: { Authorization: apiKey },
    });
  } catch {
    throw new PexelsProviderError("Pexels request failed", "HTTP_ERROR");
  }
  if (!response.ok)
    throw new PexelsProviderError(
      `Pexels request failed (${response.status})`,
      "HTTP_ERROR",
      response.status,
    );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PexelsProviderError(
      "Pexels returned invalid JSON",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  if (!body || typeof body !== "object")
    throw new PexelsProviderError(
      "Pexels returned an invalid response",
      "INVALID_RESPONSE",
      response.status,
    );
  return body as Record<string, unknown>;
}

export async function searchPexelsPhotos(
  request: MediaRequest & { query: string },
  options: PexelsProviderOptions = {},
): Promise<MediaSearchResult> {
  const body = await requestJson(PEXELS_PHOTO_ENDPOINT, request, options);
  const photos = Array.isArray(body["photos"]) ? body["photos"] : [];
  const assets = photos
    .filter((photo): photo is Record<string, unknown> =>
      Boolean(photo && typeof photo === "object"),
    )
    .map((photo) => photoAsset(photo, request.query))
    .filter((asset): asset is NormalizedMediaAsset => Boolean(asset));
  if (assets.length === 0)
    throw new PexelsProviderError("Pexels returned no usable photos", "EMPTY_RESULTS");
  return { assets, query: request.query };
}

export async function searchPexelsVideos(
  request: MediaRequest & { query: string },
  options: PexelsProviderOptions = {},
): Promise<MediaSearchResult> {
  const body = await requestJson(PEXELS_VIDEO_ENDPOINT, request, options);
  const videos = Array.isArray(body["videos"]) ? body["videos"] : [];
  const assets = videos
    .filter((video): video is Record<string, unknown> =>
      Boolean(video && typeof video === "object"),
    )
    .map((video) => videoAsset(video, request.query))
    .filter((asset): asset is NormalizedMediaAsset => Boolean(asset));
  if (assets.length === 0)
    throw new PexelsProviderError("Pexels returned no usable videos", "EMPTY_RESULTS");
  return { assets, query: request.query };
}

export async function searchPexels(
  request: MediaRequest & { query: string },
  options: PexelsProviderOptions = {},
): Promise<MediaSearchResult> {
  return request.role === "video"
    ? searchPexelsVideos(request, options)
    : searchPexelsPhotos(request, options);
}
