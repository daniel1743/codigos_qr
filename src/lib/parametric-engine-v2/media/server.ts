import { createServerFn } from "@tanstack/react-start";
import { curateMedia } from "./curator";
import { validateCuratedMediaRequest, type CuratedMediaResult } from "./types";

/**
 * Dev-only server boundary. Providers are dynamically imported so the
 * browser receives only normalized media and never either provider secret.
 */
export const fetchCuratedMedia = createServerFn({ method: "POST" })
  .validator(validateCuratedMediaRequest)
  .handler(async ({ data }): Promise<CuratedMediaResult> => {
    if (import.meta.env.PROD)
      throw new Error("Pexels media curation is available only in the local QA playground");
    const [{ searchPexels }, { searchUnsplashPhotos }] = await Promise.all([
      import("./pexels-provider"),
      import("./unsplash-provider"),
    ]);
    return curateMedia(data, async (request, provider) =>
      provider === "unsplash" ? searchUnsplashPhotos(request) : searchPexels(request),
    );
  });

/** Backward-compatible local name for the first Pexels-only playground pass. */
export const fetchCuratedPexelsMedia = fetchCuratedMedia;
