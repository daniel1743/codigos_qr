import type { MediaRequest, NormalizedMediaAsset } from "./types";
import type { MediaSearchResult } from "./curator";
import { PexelsProviderError } from "./pexels-provider";
import {
  fetchServerIntegration,
  getServerIntegrationSecret,
} from "@/server/integrations/server-fetch";

const UNSPLASH_ENDPOINT = "https://api.unsplash.com/search/photos";

export interface UnsplashProviderOptions {
  accessKey?: string;
  fetchImpl?: typeof fetch;
}

function keyFromServer(options: UnsplashProviderOptions): string {
  const key = options.accessKey ?? getServerIntegrationSecret("UNSPLASH_ACCESS_KEY");
  if (!key?.trim())
    throw new PexelsProviderError("UNSPLASH_ACCESS_KEY is not configured", "MISSING_API_KEY");
  return key.trim();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function orientation(width: number, height: number): NormalizedMediaAsset["orientation"] {
  if (height > width * 1.05) return "portrait";
  if (width > height * 1.05) return "landscape";
  return "square";
}

export async function searchUnsplashPhotos(
  request: MediaRequest & { query: string },
  options: UnsplashProviderOptions = {},
): Promise<MediaSearchResult> {
  const params = new URLSearchParams({
    query: request.query,
    orientation:
      request.orientation === "portrait"
        ? "portrait"
        : request.orientation === "square"
          ? "squarish"
          : "landscape",
    per_page: String(Math.min(30, Math.max(1, request.count ?? 5))),
  });
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetchServerIntegration)(
      `${UNSPLASH_ENDPOINT}?${params.toString()}`,
      {
        headers: { Authorization: `Client-ID ${keyFromServer(options)}` },
      },
    );
  } catch {
    throw new PexelsProviderError("Unsplash request failed", "HTTP_ERROR");
  }
  if (!response.ok)
    throw new PexelsProviderError(
      `Unsplash request failed (${response.status})`,
      "HTTP_ERROR",
      response.status,
    );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PexelsProviderError(
      "Unsplash returned invalid JSON",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  const results: unknown[] =
    body && typeof body === "object" && Array.isArray((body as Record<string, unknown>)["results"])
      ? ((body as Record<string, unknown>)["results"] as unknown[])
      : [];
  const assets = results
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item): NormalizedMediaAsset | null => {
      const urls =
        item["urls"] && typeof item["urls"] === "object"
          ? (item["urls"] as Record<string, unknown>)
          : {};
      const user =
        item["user"] && typeof item["user"] === "object"
          ? (item["user"] as Record<string, unknown>)
          : {};
      const userLinks =
        user["links"] && typeof user["links"] === "object"
          ? (user["links"] as Record<string, unknown>)
          : {};
      const links =
        item["links"] && typeof item["links"] === "object"
          ? (item["links"] as Record<string, unknown>)
          : {};
      const providerId = text(item["id"]);
      const url = text(urls["raw"]) || text(urls["full"]) || text(urls["regular"]);
      const previewUrl = text(urls["regular"]) || text(urls["small"]) || url;
      const width = number(item["width"]);
      const height = number(item["height"]);
      if (!providerId || !url || !previewUrl || !width || !height) return null;
      return {
        provider: "unsplash",
        providerId,
        type: "photo",
        url,
        previewUrl,
        width,
        height,
        orientation: orientation(width, height),
        creatorName: text(user["name"]) || text(user["username"]),
        creatorUrl: text(userLinks["html"]),
        sourcePage: text(links["html"]) || `https://unsplash.com/photos/${providerId}`,
        alt: text(item["alt_description"]) || text(item["description"]) || request.query,
        queryUsed: request.query,
      };
    })
    .filter((asset): asset is NormalizedMediaAsset => Boolean(asset));
  if (assets.length === 0)
    throw new PexelsProviderError("Unsplash returned no usable photos", "EMPTY_RESULTS");
  return { assets, query: request.query };
}
