import { describe, expect, it } from "vitest";
import { buildMediaQueryPlan, curateMedia, providerOrder } from "../media/curator";
import { searchPexelsPhotos, searchPexelsVideos } from "../media/pexels-provider";
import { searchUnsplashPhotos } from "../media/unsplash-provider";
import type { MediaRequest, NormalizedMediaAsset } from "../media/types";

const request = (role: MediaRequest["role"]): MediaRequest & { query: string } => ({
  profession: "manicurist",
  style: "luxury",
  goal: "booking",
  role,
  orientation: role === "avatar" ? "portrait" : "landscape",
  count: 3,
  query: "luxury manicurist",
});

function fetchMock(body: unknown, ok = true): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status: ok ? 200 : 503 })) as typeof fetch;
}

describe("Engine V2 media providers", () => {
  it("normalizes a Pexels photo and preserves attribution", async () => {
    const result = await searchPexelsPhotos(request("banner"), {
      apiKey: "test-key",
      fetchImpl: fetchMock({
        photos: [
          {
            id: 11,
            width: 1600,
            height: 900,
            alt: "luxury nail salon",
            photographer: "Ada Photo",
            photographer_url: "https://pexels.com/@ada",
            url: "https://pexels.com/photo/11",
            src: {
              original: "https://images.pexels.com/11/original",
              large: "https://images.pexels.com/11/large",
            },
          },
        ],
      }),
    });
    expect(result.assets[0]).toMatchObject({
      provider: "pexels",
      providerId: "11",
      type: "photo",
      orientation: "landscape",
      creatorName: "Ada Photo",
      creatorUrl: "https://pexels.com/@ada",
    });
  });

  it("normalizes a Pexels video with a playable file and thumbnail", async () => {
    const result = await searchPexelsVideos(request("video"), {
      apiKey: "test-key",
      fetchImpl: fetchMock({
        videos: [
          {
            id: 22,
            width: 1920,
            height: 1080,
            image: "https://images.pexels.com/22/thumb",
            url: "https://pexels.com/video/22",
            user: { name: "Video Creator", url: "https://pexels.com/@creator" },
            video_files: [{ link: "https://videos.pexels.com/22.mp4", width: 1920, height: 1080 }],
          },
        ],
      }),
    });
    expect(result.assets[0]).toMatchObject({
      provider: "pexels",
      providerId: "22",
      type: "video",
      url: "https://videos.pexels.com/22.mp4",
      previewUrl: "https://images.pexels.com/22/thumb",
      creatorName: "Video Creator",
    });
  });

  it("normalizes an Unsplash photo and retains source metadata", async () => {
    const result = await searchUnsplashPhotos(request("background"), {
      accessKey: "test-key",
      fetchImpl: fetchMock({
        results: [
          {
            id: "u-1",
            width: 1800,
            height: 1000,
            alt_description: "editorial studio",
            urls: {
              raw: "https://images.unsplash.com/u-1/raw",
              regular: "https://images.unsplash.com/u-1/regular",
            },
            links: { html: "https://unsplash.com/photos/u-1" },
            user: { name: "Unsplash Creator", links: { html: "https://unsplash.com/@creator" } },
          },
        ],
      }),
    });
    expect(result.assets[0]).toMatchObject({
      provider: "unsplash",
      providerId: "u-1",
      creatorName: "Unsplash Creator",
      creatorUrl: "https://unsplash.com/@creator",
      sourcePage: "https://unsplash.com/photos/u-1",
    });
  });

  it("handles empty and HTTP failures without fabricated assets", async () => {
    await expect(
      searchPexelsPhotos(request("banner"), {
        apiKey: "test-key",
        fetchImpl: fetchMock({ photos: [] }),
      }),
    ).rejects.toMatchObject({ code: "EMPTY_RESULTS" });
    await expect(
      searchUnsplashPhotos(request("banner"), {
        accessKey: "test-key",
        fetchImpl: fetchMock({ results: [] }),
      }),
    ).rejects.toMatchObject({ code: "EMPTY_RESULTS" });
    await expect(
      searchPexelsPhotos(request("banner"), {
        apiKey: "test-key",
        fetchImpl: fetchMock({}, false),
      }),
    ).rejects.toMatchObject({ code: "HTTP_ERROR", status: 503 });
  });

  it("requires server configuration without exposing a key", async () => {
    await expect(
      searchPexelsPhotos(request("banner"), { fetchImpl: fetchMock({ photos: [] }) }),
    ).rejects.toMatchObject({ code: "MISSING_API_KEY" });
  });
});

function asset(
  provider: "pexels" | "unsplash",
  id: string,
  orientation: NormalizedMediaAsset["orientation"] = "landscape",
): NormalizedMediaAsset {
  return {
    provider,
    providerId: id,
    type: "photo",
    url: `https://${provider}.test/${id}`,
    previewUrl: `https://${provider}.test/${id}/preview`,
    width: 1600,
    height: orientation === "portrait" ? 2000 : 900,
    orientation,
    creatorName: "Creator",
    creatorUrl: `https://${provider}.test/creator`,
    sourcePage: `https://${provider}.test/source/${id}`,
    alt: "relevant media",
    queryUsed: "query",
  };
}

describe("Media Curator and provider router", () => {
  it("builds semantic queries for the initial profession/style profiles", () => {
    expect(
      buildMediaQueryPlan({
        profession: "manicurist",
        style: "luxury",
        goal: "booking",
        role: "gallery",
      })[0],
    ).toMatch(/luxury|premium/);
    expect(
      buildMediaQueryPlan({
        profession: "manicurist",
        style: "luxury",
        goal: "booking",
        role: "gallery",
      })[0],
    ).toMatch(/manicurist|nail/);
    expect(
      buildMediaQueryPlan({ profession: "gardener", style: "natural", role: "banner" })[0],
    ).toMatch(/natural|organic|gardener|garden/);
    expect(
      buildMediaQueryPlan({ profession: "barber", style: "dark-premium", role: "video" })[0],
    ).toMatch(/dark|moody|premium|barber/);
  });

  it("routes Auto according to role policy", () => {
    expect(providerOrder("video", "auto")).toEqual(["pexels"]);
    expect(providerOrder("banner", "auto")).toEqual(["unsplash", "pexels"]);
    expect(providerOrder("background", "auto")).toEqual(["unsplash", "pexels"]);
    expect(providerOrder("gallery", "auto")).toEqual(["pexels", "unsplash"]);
  });

  it("uses a provider fallback, ranks by orientation and removes duplicate IDs/URLs", async () => {
    const calls: string[] = [];
    const result = await curateMedia(
      {
        profession: "barber",
        style: "dark-premium",
        goal: "booking",
        roles: ["banner", "gallery"],
      },
      async (request, provider) => {
        calls.push(`${provider}:${request.query}`);
        if (provider === "unsplash") throw new Error("empty");
        return {
          query: request.query,
          assets: [asset("pexels", "same"), asset("pexels", "unique", "portrait")],
        };
      },
    );
    expect(calls[0]).toMatch(/^unsplash:/);
    expect(calls.some((call) => call.startsWith("pexels:"))).toBe(true);
    const selected = Object.values(result.assets).flatMap((items) => items ?? []);
    expect(new Set(selected.map((item) => item.url)).size).toBe(selected.length);
    expect(selected.length).toBeGreaterThan(0);
  });

  it("returns no assets when every fallback is empty and never fabricates URLs", async () => {
    const result = await curateMedia(
      { profession: "gardener", style: "natural", roles: ["banner"] },
      async () => ({ query: "empty", assets: [] }),
    );
    expect(result.assets.banner).toBeUndefined();
  });
});
