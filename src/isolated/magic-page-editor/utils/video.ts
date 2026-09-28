/**
 * Video resolution shared by the video block renderer.
 *
 * The editor stores the video as a plain URL prop, so the block has to work out
 * which provider it belongs to, what it can embed, and which cover to show when
 * the author did not pick one. Keeping it pure lets the exposure contract test
 * assert every branch (YouTube, Vimeo, unknown URL, no URL) without mounting the
 * whole editor.
 */

const YOUTUBE_URL = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/;
const VIMEO_URL = /vimeo\.com\/(?:video\/)?([0-9]+)/;

export type VideoSource = "youtube" | "vimeo" | "external" | "none";

export interface VideoResolution {
  source: VideoSource;
  /** Provider id, only when the URL belongs to a recognised provider. */
  id?: string;
  /** Playable embed URL; `null` when the URL cannot be embedded in the block. */
  embed: string | null;
  /** Provider thumbnail, used as the cover when the author did not choose one. */
  providerCover?: string;
}

export function resolveVideo(url: string | undefined): VideoResolution {
  const value = (url ?? "").trim();

  const youtubeId = YOUTUBE_URL.exec(value)?.[1];
  if (youtubeId) {
    return {
      source: "youtube",
      id: youtubeId,
      embed: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`,
      providerCover: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = VIMEO_URL.exec(value)?.[1];
  if (vimeoId) {
    return {
      source: "vimeo",
      id: vimeoId,
      embed: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    };
  }

  return { source: value ? "external" : "none", embed: null };
}

/** Local, elegant fallback: provider thumbnail → author cover → template image. */
export function videoCover(
  resolution: VideoResolution,
  cover: string | undefined,
  fallback: string,
): string {
  return resolution.providerCover ?? cover ?? fallback;
}

/** Status badge over the cover, so the block never shows an unexplained surface. */
export function videoStatusLabel(resolution: VideoResolution): string {
  if (resolution.source === "youtube") return "YouTube";
  if (resolution.source === "vimeo") return "Vista previa Vimeo";
  if (resolution.source === "external") return "Vista previa";
  return "Pega un enlace";
}

/** Vimeo keeps its own visual treatment so it is never confused with YouTube. */
export function videoHasProviderTreatment(resolution: VideoResolution): boolean {
  return resolution.source === "vimeo";
}
