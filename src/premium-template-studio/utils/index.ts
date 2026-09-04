import qrcode from "qrcode-generator";
import type { BlockContent } from "../types";

/** Stable, collision-safe ids. Never use array index as identity. */
export function uid(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * SECURITY: only http(s) and mailto/tel links are ever rendered.
 * Prevents javascript: / data: URL injection from user configuration.
 */
export function safeUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (/^(mailto:|tel:)/i.test(value)) return value;
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function isValidUrl(raw?: string): boolean {
  return Boolean(safeUrl(raw));
}

export function prettyUrl(raw?: string): string {
  const url = safeUrl(raw);
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * VIDEO EMBEDS — provider abstraction.
 * Arbitrary iframes from config are never rendered; only whitelisted providers
 * with a sanitized id are turned into an embed URL.
 */
export function parseVideoUrl(
  raw: string,
): { provider: "youtube" | "vimeo"; videoId: string } | null {
  const url = safeUrl(raw);
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  );
  if (yt?.[1]) return { provider: "youtube", videoId: yt[1] };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  if (vm?.[1]) return { provider: "vimeo", videoId: vm[1] };
  return null;
}

export function videoEmbedUrl(content: BlockContent): string | null {
  const id = (content.videoId ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!id) return null;
  if (content.provider === "vimeo") return `https://player.vimeo.com/video/${id}`;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/**
 * QR CODES — generated locally in the browser/server bundle.
 * No third-party service ever receives the encoded content.
 */
export function qrImageUrl(value: string, size = 320, dark = "000000", light = "ffffff"): string {
  const text = value || "https://example.com";
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cell = Math.max(1, Math.floor(size / (count + 8)));
  const margin = cell * 4;
  const dim = count * cell + margin * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (qr.isDark(row, col)) {
        path += `M${margin + col * cell} ${margin + row * cell}h${cell}v${cell}h-${cell}z`;
      }
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}">` +
    `<rect width="${dim}" height="${dim}" fill="#${light.replace("#", "")}"/>` +
    `<path d="${path}" fill="#${dark.replace("#", "")}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = parseInt(full.slice(0, 6) || "000000", 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

export function readableOn(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = parseInt(full.slice(0, 6) || "000000", 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b0b0c" : "#ffffff";
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => timer && clearTimeout(timer);
  return wrapped;
}

export function formatSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
