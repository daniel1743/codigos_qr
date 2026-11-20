/**
 * Guest Editor V1 - local media preview for anonymous visitors (G3).
 *
 * A guest may try their own photo, but nothing is uploaded: the file is turned into
 * an **object URL** that lives only in this tab. No Storage write, no public URL, no
 * remote trace before the visitor creates an account.
 *
 * Consequences, stated so nobody has to guess:
 *   - the object URL must be revoked when the editor closes (done by the host);
 *   - it must NEVER be persisted in the draft (guestDraft strips `blob:`/`data:`);
 *   - after a reload the photo is gone and the element falls back to its previous
 *     source: the visitor is told that a photo needs to be uploaded after signing up.
 */
export const LOCAL_MEDIA_MAX_BYTES = 10 * 1024 * 1024;

export interface LocalMediaStore {
  /** Object URL for a local file. Throws a human-readable error when rejected. */
  createLocalSource(file: File): Promise<string>;
  /** How many object URLs are still alive (used for the pending-media notice). */
  pendingCount(): number;
  /** Revokes every URL created by this store. Safe to call more than once. */
  revokeAll(): void;
}

interface LocalMediaFactories {
  createObjectUrl?: (file: File) => string;
  revokeObjectUrl?: (url: string) => void;
}

export function createLocalMediaStore({
  createObjectUrl,
  revokeObjectUrl,
}: LocalMediaFactories = {}): LocalMediaStore {
  const created = new Set<string>();
  const create =
    createObjectUrl ??
    ((file: File) => {
      if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        throw new Error("Este navegador no permite previsualizar fotos locales.");
      }
      return URL.createObjectURL(file);
    });
  const revoke =
    revokeObjectUrl ??
    ((url: string) => {
      if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(url);
      }
    });

  return {
    async createLocalSource(file: File) {
      if (!file.type.startsWith("image/")) {
        throw new Error("Selecciona una imagen válida.");
      }
      if (file.size > LOCAL_MEDIA_MAX_BYTES) {
        throw new Error("La imagen no puede superar los 10 MB.");
      }
      const url = create(file);
      created.add(url);
      return url;
    },
    pendingCount() {
      return created.size;
    },
    revokeAll() {
      for (const url of created) revoke(url);
      created.clear();
    },
  };
}
