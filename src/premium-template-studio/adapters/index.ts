import type { BioTemplateConfig, StudioUser, UploadedAsset } from "../types";

/**
 * ADAPTER PATTERN — the studio never talks to a backend directly.
 * The host platform injects these; the defaults below are in-memory/localStorage
 * implementations so the module also runs standalone in a demo route.
 */

export interface StorageAdapter {
  load(pageInstanceId: string): Promise<BioTemplateConfig | null>;
  save(config: BioTemplateConfig): Promise<void>;
  publish?(config: BioTemplateConfig): Promise<{ url?: string }>;
}

export interface AssetAdapter {
  upload(file: File): Promise<UploadedAsset>;
  list?(): Promise<UploadedAsset[]>;
  remove?(id: string): Promise<void>;
}

export interface AnalyticsAdapter {
  track(event: {
    type: string;
    blockId?: string | undefined;
    url?: string | undefined;
    meta?: Record<string, unknown>;
  }): void;
}

export interface AuthAdapter {
  getUser(): StudioUser | null;
}

export interface StudioAdapters {
  storage: StorageAdapter;
  assets: AssetAdapter;
  analytics: AnalyticsAdapter;
  auth: AuthAdapter;
}

const STORAGE_PREFIX = "pts:config:";

export const localStorageAdapter: StorageAdapter = {
  async load(pageInstanceId) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_PREFIX + pageInstanceId);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BioTemplateConfig;
    } catch {
      return null;
    }
  },
  async save(config) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_PREFIX + config.pageInstanceId, JSON.stringify(config));
  },
  async publish(config) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`pts:published:${config.settings.slug}`, JSON.stringify(config));
    }
    return { url: `/p/${config.settings.slug}` };
  },
};

export const objectUrlAssetAdapter: AssetAdapter = {
  async upload(file) {
    const url = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
    const kind: UploadedAsset["type"] = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : "document";
    return { id: `${Date.now()}`, url, name: file.name, size: file.size, type: kind };
  },
};

export const consoleAnalyticsAdapter: AnalyticsAdapter = {
  track(event) {
    if (typeof window !== "undefined") {
      (window as unknown as { __ptsEvents?: unknown[] }).__ptsEvents ??= [];
      (window as unknown as { __ptsEvents: unknown[] }).__ptsEvents.push({
        ...event,
        at: Date.now(),
      });
    }
  },
};

export const anonymousAuthAdapter: AuthAdapter = {
  getUser: () => ({ id: "demo-user", name: "Demo user", plan: "pro" }),
};

export const defaultAdapters: StudioAdapters = {
  storage: localStorageAdapter,
  assets: objectUrlAssetAdapter,
  analytics: consoleAnalyticsAdapter,
  auth: anonymousAuthAdapter,
};

export function resolveAdapters(partial?: Partial<StudioAdapters>): StudioAdapters {
  return { ...defaultAdapters, ...(partial ?? {}) };
}
