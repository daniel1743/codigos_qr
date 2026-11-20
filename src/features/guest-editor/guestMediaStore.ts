/**
 * Guest Editor V1 - G6.2: keep the visitor's photos until the transfer is verified.
 *
 * The problem: an `object URL` dies with the page, and a `data:` URL inside the 512 KB
 * draft is exactly what the rules forbid. So the FILE itself is kept in IndexedDB,
 * which holds Blobs natively and never touches the network:
 *
 *   - nothing is uploaded before the visitor has an account;
 *   - the draft only stores a REFERENCE (`{ prop, id, name, type, size }`), never a blob;
 *   - after a reload the host can rebuild the preview from the stored file;
 *   - the claim uploads those files through the canonical uploader and then deletes them.
 *
 * The real IndexedDB access lives behind `MediaAdapter`, so the orchestration is fully
 * unit-testable (the test environment has no IndexedDB) and the adapter stays a thin,
 * reviewed layer that the browser QA exercises end to end.
 */
export const GUEST_MEDIA_DB = "cripqer-guest-editor";
export const GUEST_MEDIA_STORE = "media";
export const GUEST_MEDIA_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredMedia {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  blob: Blob;
}

/** The reference a draft carries for a photo that still lives only in this browser. */
export interface MediaRef {
  /** `"<elementId>.<prop>"`, e.g. `"avatar.src"`. */
  prop: string;
  /** `null` when the file could not be associated (the visitor must pick it again). */
  id: string | null;
  name?: string;
  type?: string;
  size?: number;
}

export interface MediaAdapter {
  put(entry: StoredMedia): Promise<void>;
  get(id: string): Promise<StoredMedia | null>;
  list(ids: string[]): Promise<StoredMedia[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
  pruneBefore(timestamp: number): Promise<number>;
}

/** Availability probe: private mode or a hostile browser simply has no IndexedDB. */
export function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

/** Thin IndexedDB adapter. Every method rejects on a real storage failure. */
export function createIndexedDbAdapter(): MediaAdapter {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(GUEST_MEDIA_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(GUEST_MEDIA_STORE)) {
          db.createObjectStore(GUEST_MEDIA_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB no disponible."));
    });

  const withStore = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(GUEST_MEDIA_STORE, mode);
        const request = run(transaction.objectStore(GUEST_MEDIA_STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Operación de medios fallida."));
      });
    } finally {
      db.close();
    }
  };

  return {
    async put(entry) {
      await withStore("readwrite", (store) => store.put(entry));
    },
    async get(id) {
      const value = await withStore<StoredMedia | undefined>("readonly", (store) => store.get(id));
      return value ?? null;
    },
    async list(ids) {
      const found: StoredMedia[] = [];
      for (const id of ids) {
        const value = await withStore<StoredMedia | undefined>("readonly", (store) =>
          store.get(id),
        );
        if (value) found.push(value);
      }
      return found;
    },
    async delete(ids) {
      for (const id of ids) {
        await withStore("readwrite", (store) => store.delete(id));
      }
    },
    async clear() {
      await withStore("readwrite", (store) => store.clear());
    },
    async pruneBefore(timestamp) {
      const all = await withStore<StoredMedia[]>("readonly", (store) => store.getAll());
      const stale = all.filter((entry) => entry.createdAt < timestamp).map((entry) => entry.id);
      if (stale.length > 0) await this.delete(stale);
      return stale.length;
    },
  };
}

/** `"collection.0.surface.src"` -> element `"collection.0.surface"`, prop `"src"`. */
export function splitMediaProp(prop: string): { elementId: string; propName: string } | null {
  const at = prop.lastIndexOf(".");
  if (at <= 0 || at === prop.length - 1) return null;
  return { elementId: prop.slice(0, at), propName: prop.slice(at + 1) };
}

export interface GuestMediaStore {
  available: boolean;
  putFile(file: File, id: string, now?: number): Promise<MediaRef["id"]>;
  restore(ids: string[]): Promise<Map<string, Blob>>;
  remove(ids: string[]): Promise<void>;
  clear(): Promise<void>;
  prune(now?: number): Promise<number>;
}

export function createGuestMediaStore(adapter?: MediaAdapter): GuestMediaStore {
  const available = hasIndexedDb();
  const real: MediaAdapter =
    adapter ?? (available ? createIndexedDbAdapter() : ({} as MediaAdapter));

  const guard = async <T>(run: () => Promise<T>, fallback: T): Promise<T> => {
    if (!adapter && !available) return fallback;
    try {
      return await run();
    } catch {
      return fallback;
    }
  };

  return {
    available: Boolean(adapter) || available,
    async putFile(file, id, now = Date.now()) {
      await guard(
        () =>
          real.put({
            id,
            name: file.name,
            type: file.type,
            size: file.size,
            createdAt: now,
            blob: file,
          }),
        undefined,
      );
      return id;
    },
    async restore(ids) {
      const found = await guard(() => real.list(ids), []);
      return new Map(found.map((entry) => [entry.id, entry.blob]));
    },
    async remove(ids) {
      await guard(() => real.delete(ids), undefined);
    },
    async clear() {
      await guard(() => real.clear(), undefined);
    },
    async prune(now = Date.now()) {
      return guard(() => real.pruneBefore(now - GUEST_MEDIA_TTL_MS), 0);
    },
  };
}
