// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G6.2/G6.3 tests: claim, media transfer and integrity.
 *
 * Everything runs with injected services, so every rule that protects real data can be
 * proven without touching Supabase: no empty Bio first, conflict protection, media
 * substitution, the "no local source in the saved document" rule, verification and
 * draft-clearing only on verified success.
 */
import { describe, expect, it, vi } from "vitest";
import {
  createInitialMagicPageDocument,
  type MagicPageDocumentV1,
} from "../../magic-page-editor-production/magic-document";
import { claimGuestDraft, localMediaProps, type GuestClaimDeps } from "../claimGuestDraft";
import { splitMediaProp } from "../guestMediaStore";
import { profileService } from "../../../services/profile.service";
import { pageService } from "../../../services/page.service";
import { magicPageService } from "../../../services/magic-page.service";

type ReadDocument = NonNullable<GuestClaimDeps["readDocument"]>;

function draftWithName(name: string, avatarSrc?: string): MagicPageDocumentV1 {
  const document = createInitialMagicPageDocument("bio");
  return {
    ...document,
    texts: { ...document.texts, "hero.name": name },
    props: avatarSrc ? { avatar: { src: avatarSrc } } : {},
  };
}

function deps(overrides: Partial<GuestClaimDeps> = {}): GuestClaimDeps {
  return {
    ensureProfile: vi.fn(async () => undefined) as never,
    createOrResumePage: vi.fn(async () => ({ page: { id: "page-1" }, resumed: false })) as never,
    readDocument: vi.fn(async () => createInitialMagicPageDocument("bio")),
    saveDocument: vi.fn(async () => draftWithName("Ana")) as never,
    clearDraft: vi.fn(),
    uploadMedia: vi.fn(async () => "https://cdn/permanent.jpg") as never,
    deleteMedia: vi.fn(async () => undefined) as never,
    ...overrides,
  };
}

const base = { userId: "user-1", email: "a@b.c", userMetadata: {}, supabase: {} as never };

describe("claim integrity (G6.3)", () => {
  it("claims a pristine page without writing an empty Bio first", async () => {
    const document = draftWithName("Ana");
    const order: string[] = [];
    const readDocument = vi
      .fn<ReadDocument>()
      .mockImplementationOnce(async () => {
        order.push("read");
        return createInitialMagicPageDocument("bio");
      })
      .mockImplementationOnce(async () => {
        order.push("recheck");
        return createInitialMagicPageDocument("bio");
      })
      .mockImplementationOnce(async () => {
        order.push("re-read");
        return document;
      });
    const saveDocument = vi.fn(async (_s: unknown, _p: unknown, _u: unknown, saved: unknown) => {
      order.push("save");
      return saved as MagicPageDocumentV1;
    });

    const result = await claimGuestDraft(
      { ...base, document },
      deps({ readDocument, saveDocument: saveDocument as never }),
    );

    expect(result.status).toBe("claimed");
    expect(result.verified).toBe(true);
    // Relee antes de escribir (ventana de concurrencia) y relee para verificar.
    expect(order).toEqual(["read", "recheck", "save", "re-read"]);
    expect(result.revalidated).toBe(true);
    expect(result.concurrency).toBe("check-then-write");
    expect(saveDocument.mock.calls[0]?.[3]).toEqual(document);
  });

  it("uploads the visitor's photo, substitutes the permanent URL and reports completion", async () => {
    const document = draftWithName("Ana", "blob:local/1");
    const substituted = draftWithName("Ana", "https://cdn/avatar-permanente.jpg");
    const uploadMedia = vi.fn(async () => "https://cdn/avatar-permanente.jpg");
    const saveDocument = vi.fn(
      async (_s: unknown, _p: unknown, _u: unknown, saved: unknown) => saved as MagicPageDocumentV1,
    );
    const readDocument = vi
      .fn<ReadDocument>()
      .mockResolvedValueOnce(createInitialMagicPageDocument("bio"))
      // revalidación previa a la escritura: sigue siendo el starter
      .mockResolvedValueOnce(createInitialMagicPageDocument("bio"))
      // El servidor devuelve lo que se escribió: el documento sustituido.
      .mockImplementationOnce(async () => substituted);

    const result = await claimGuestDraft(
      { ...base, document, mediaRefs: [{ prop: "avatar.src", id: "media-1" }] },
      deps({
        readDocument,
        uploadMedia: uploadMedia as never,
        saveDocument: saveDocument as never,
      }),
    );

    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("claimed");
    expect(result.mediaUploaded).toBe(1);
    expect(result.mediaPendingLocal).toEqual([]);
    const saved = saveDocument.mock.calls[0]?.[3] as MagicPageDocumentV1;
    expect(saved.props["avatar"]?.["src"]).toBe("https://cdn/avatar-permanente.jpg");
  });

  it("aborts without writing when a photo cannot be turned into a permanent URL", async () => {
    const document = draftWithName("Ana", "blob:local/1");
    const saveDocument = vi.fn();
    const clearDraft = vi.fn();
    const result = await claimGuestDraft(
      { ...base, document, mediaRefs: [{ prop: "avatar.src", id: "media-1" }] },
      deps({
        readDocument: vi.fn(async () => createInitialMagicPageDocument("bio")),
        uploadMedia: vi.fn(async () => null) as never,
        saveDocument: saveDocument as never,
        clearDraft,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("local-media-remaining");
    expect(result.mediaPendingLocal).toEqual(["avatar.src"]);
    expect(saveDocument).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("never overwrites an account that already has real content", async () => {
    const saveDocument = vi.fn();
    const clearDraft = vi.fn();
    const result = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      deps({
        readDocument: vi.fn(async () => draftWithName("Contenido real del dueño")),
        saveDocument: saveDocument as never,
        clearDraft,
      }),
    );

    expect(result.status).toBe("conflict");
    expect(saveDocument).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("is idempotent when the document is already applied", async () => {
    const document = draftWithName("Ana");
    const saveDocument = vi.fn();
    const clearDraft = vi.fn();
    const deleteMedia = vi.fn(async () => undefined);
    const result = await claimGuestDraft(
      { ...base, document, mediaRefs: [{ prop: "avatar.src", id: "media-1" }] },
      deps({
        readDocument: vi.fn(async () => document),
        saveDocument: saveDocument as never,
        clearDraft,
        deleteMedia: deleteMedia as never,
      }),
    );

    expect(result.status).toBe("claimed");
    expect(result.reason).toBe("already-applied");
    expect(saveDocument).not.toHaveBeenCalled();
    expect(clearDraft).toHaveBeenCalledTimes(1);
    expect(deleteMedia).toHaveBeenCalledWith(["media-1"]);
  });

  it("keeps the draft and the photos when the save fails", async () => {
    const clearDraft = vi.fn();
    const deleteMedia = vi.fn(async () => undefined);
    const result = await claimGuestDraft(
      { ...base, document: draftWithName("Ana") },
      deps({
        saveDocument: vi.fn(async () => {
          throw new Error("sin red");
        }) as never,
        clearDraft,
        deleteMedia: deleteMedia as never,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toBe("sin red");
    expect(clearDraft).not.toHaveBeenCalled();
    expect(deleteMedia).not.toHaveBeenCalled();
  });

  it("keeps the draft when the re-read does not match what was saved", async () => {
    const document = draftWithName("Ana");
    const clearDraft = vi.fn();
    const deleteMedia = vi.fn(async () => undefined);
    const result = await claimGuestDraft(
      { ...base, document },
      deps({
        readDocument: vi
          .fn<ReadDocument>()
          .mockResolvedValueOnce(createInitialMagicPageDocument("bio"))
          .mockResolvedValueOnce(createInitialMagicPageDocument("bio"))
          .mockResolvedValueOnce(draftWithName("Otra cosa")),
        saveDocument: vi.fn(async () => document) as never,
        clearDraft,
        deleteMedia: deleteMedia as never,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toBe("verification-mismatch");
    expect(clearDraft).not.toHaveBeenCalled();
    expect(deleteMedia).not.toHaveBeenCalled();
  });

  it("refuses a document that is not a Magic document, without calling any service", async () => {
    const ensureProfile = vi.fn();
    const result = await claimGuestDraft(
      { ...base, document: { nope: true } as never },
      deps({ ensureProfile: ensureProfile as never }),
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toBe("invalid-document");
    expect(ensureProfile).not.toHaveBeenCalled();
  });
  it("no escribe si el documento cambió entre la lectura y la escritura (sin sobrescribir)", async () => {
    const saveDocument = vi.fn();
    const clearDraft = vi.fn();
    const result = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      deps({
        readDocument: vi
          .fn<ReadDocument>()
          // primera lectura: starter intacto → parece transferible
          .mockResolvedValueOnce(createInitialMagicPageDocument("bio"))
          // revalidación: otra sesión ya escribió contenido real
          .mockResolvedValueOnce(draftWithName("Otra sesión ganó")),
        saveDocument: saveDocument as never,
        clearDraft,
      }),
    );

    expect(result.status).toBe("conflict");
    expect(result.reason).toBe("changed-since-read");
    expect(result.revalidated).toBe(true);
    expect(result.concurrency).toBe("check-then-write");
    expect(saveDocument).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("no sobrescribe un documento que no reconoce (estado incierto)", async () => {
    const saveDocument = vi.fn();
    const clearDraft = vi.fn();
    const result = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      deps({
        // Algo guardado que no es un documento Magic válido: p.ej. una versión futura.
        readDocument: vi.fn(async () => ({ version: 99, template: { id: "bio" } })),
        saveDocument: saveDocument as never,
        clearDraft,
      }),
    );

    expect(result.status).toBe("conflict");
    expect(result.reason).toBe("unrecognized-document");
    expect(saveDocument).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("declara la garantía y las rutas revalidadas incluso cuando rechaza el documento", async () => {
    const result = await claimGuestDraft({ ...base, document: { nope: true } as never }, deps());

    expect(result.concurrency).toBe("check-then-write");
    expect(result.revalidated).toBe(false);
  });
});

describe("wiring real de los servicios", () => {
  it("llama a los servicios REALES sobre su objeto (sin perder `this`)", async () => {
    // Regresión del fallo real detectado en el navegador: pasar `service.metodo`
    // desacoplado dejaba `this` indefinido y el claim moría con
    // "Cannot read properties of undefined". Aquí se espía el propio servicio.
    const document = draftWithName("Ana");
    const profileSpy = vi
      .spyOn(profileService, "ensurePrimaryProfileForUser")
      .mockResolvedValue({ id: "profile-1" } as never);
    const pageSpy = vi
      .spyOn(pageService, "createOrResumeInitialLandingPage")
      .mockResolvedValue({ page: { id: "page-1" }, resumed: false } as never);
    const readSpy = vi
      .spyOn(magicPageService, "getOwnedPage")
      .mockResolvedValueOnce({
        id: "page-1",
        template_config: createInitialMagicPageDocument("bio"),
      } as never)
      .mockResolvedValueOnce({
        id: "page-1",
        template_config: createInitialMagicPageDocument("bio"),
      } as never)
      .mockResolvedValueOnce({ id: "page-1", template_config: document } as never);
    // G7: el camino por defecto es el guardado ATÓMICO (compare-and-set).
    const saveSpy = vi.spyOn(magicPageService, "saveDraftIfUnchanged").mockResolvedValue(document);
    const legacySpy = vi.spyOn(magicPageService, "saveDraft");
    const clearDraft = vi.fn();

    try {
      const result = await claimGuestDraft({ ...base, document }, { clearDraft });

      expect(profileSpy).toHaveBeenCalledTimes(1);
      expect(pageSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenCalledTimes(3);
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(legacySpy).not.toHaveBeenCalled();
      expect(result.status).toBe("claimed");
      expect(result.concurrency).toBe("atomic");
      expect(result.reason).toBeUndefined();
    } finally {
      profileSpy.mockRestore();
      pageSpy.mockRestore();
      readSpy.mockRestore();
      saveSpy.mockRestore();
      legacySpy.mockRestore();
    }
  });
});

describe("media references", () => {
  it("splits a dotted prop path into element and prop", () => {
    expect(splitMediaProp("avatar.src")).toEqual({ elementId: "avatar", propName: "src" });
    expect(splitMediaProp("collection.0.surface.src")).toEqual({
      elementId: "collection.0.surface",
      propName: "src",
    });
    expect(splitMediaProp("noseparator")).toBeNull();
    expect(splitMediaProp("trailing.")).toBeNull();
  });

  it("finds every prop that still points at local media", () => {
    const document: MagicPageDocumentV1 = {
      ...createInitialMagicPageDocument("bio"),
      props: {
        avatar: { src: "blob:local/1", cropX: "40" },
        "block:hero": { src: "https://cdn/ok.jpg" },
        "collection.0.surface": { src: "data:image/png;base64,AAAA" },
      },
    };
    expect(localMediaProps(document).sort()).toEqual(["avatar.src", "collection.0.surface.src"]);
  });
});

/**
 * Almacén con compare-and-set REAL (modela el RPC `save_page_magic_draft`): escribe
 * solo si el documento almacenado sigue siendo el esperado. `armForeignWrite`
 * permite inyectar, de forma determinista, una escritura ajena que cae justo entre
 * la última lectura del cliente y la comparación de la base: la ventana exacta que
 * `saveDraft` no cubría.
 */
function casStore(initial: MagicPageDocumentV1 | null) {
  let stored = initial;
  const writes: Array<MagicPageDocumentV1 | null> = [];
  let beforeCas: (() => void) | null = null;
  return {
    get current() {
      return stored;
    },
    get writes() {
      return writes;
    },
    armForeignWrite(document: MagicPageDocumentV1 | null) {
      beforeCas = () => {
        stored = document;
      };
    },
    async save(expected: unknown, next: MagicPageDocumentV1) {
      beforeCas?.();
      beforeCas = null;
      if (JSON.stringify(expected ?? null) !== JSON.stringify(stored ?? null)) {
        throw new Error("DRAFT_CONFLICT: la tarjeta cambió en otra sesión.");
      }
      stored = next;
      writes.push(next);
      return next;
    },
    async writeUnconditionally(next: MagicPageDocumentV1) {
      beforeCas?.();
      beforeCas = null;
      stored = next; // last-write-wins: lo que hacía `saveDraft`
      writes.push(next);
      return next;
    },
  };
}

const starterDocument = () => createInitialMagicPageDocument("bio");

/** Ayudantes del camino atómico: por defecto el claim usa compare-and-set. */
const atomicDeps = (overrides: Partial<GuestClaimDeps> = {}): GuestClaimDeps => ({
  ensureProfile: vi.fn(async () => undefined) as never,
  createOrResumePage: vi.fn(async () => ({ page: { id: "page-1" }, resumed: false })) as never,
  readDocument: vi.fn(async () => starterDocument()),
  saveDocumentIfUnchanged: vi.fn(
    async (_s, _p, document) => document as MagicPageDocumentV1,
  ) as never,
  clearDraft: vi.fn(),
  uploadMedia: vi.fn(async () => "https://cdn/permanente.jpg") as never,
  deleteMedia: vi.fn(async () => undefined) as never,
  ...overrides,
});

describe("guardado atómico del claim (G7)", () => {
  const starter = starterDocument;

  it("usa compare-and-set por defecto y pasa el documento esperado", async () => {
    const document = draftWithName("Ana");
    const save = vi.fn(async (_s, _p, next: unknown) => next as MagicPageDocumentV1);
    const result = await claimGuestDraft(
      { ...base, document },
      atomicDeps({
        readDocument: vi
          .fn<ReadDocument>()
          .mockResolvedValueOnce(starter())
          .mockResolvedValueOnce(starter())
          .mockResolvedValueOnce(document),
        saveDocumentIfUnchanged: save as never,
      }),
    );

    expect(result.status).toBe("claimed");
    expect(result.concurrency).toBe("atomic");
    expect(save).toHaveBeenCalledTimes(1);
    const [, pageId, prepared, expected] = save.mock.calls[0] as unknown[];
    expect(pageId).toBe("page-1");
    expect(expected).toEqual(starter());
    expect((prepared as MagicPageDocumentV1).texts["hero.name"]).toBe("Ana");
  });

  it("compara de forma nulo-segura cuando la página aún no tenía documento", async () => {
    const document = draftWithName("Ana");
    const save = vi.fn(async (_s, _p, next: unknown) => next as MagicPageDocumentV1);
    const result = await claimGuestDraft(
      { ...base, document },
      atomicDeps({
        readDocument: vi
          .fn<ReadDocument>()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(document),
        saveDocumentIfUnchanged: save as never,
      }),
    );

    expect(result.status).toBe("claimed");
    expect((save.mock.calls[0] as unknown[])[3]).toBeNull();
  });
});

describe("concurrencia real del guardado atómico (G7)", () => {
  it("rechaza al segundo escritor y deja intacto el documento ajeno", async () => {
    const foreign = draftWithName("Otra sesión ganó");
    const store = casStore(starterDocument());
    const clearDraft = vi.fn();
    const deleteMedia = vi.fn(async () => undefined);
    // La escritura ajena cae EXACTAMENTE entre la revalidación y el CAS:
    // es la ventana que `saveDraft` no podía cubrir.
    store.armForeignWrite(foreign);

    const result = await claimGuestDraft(
      {
        ...base,
        document: draftWithName("Visitante"),
        mediaRefs: [{ prop: "avatar.src", id: "m1" }],
      },
      atomicDeps({
        readDocument: vi.fn(async () => store.current),
        saveDocumentIfUnchanged: ((_s: unknown, _p: unknown, next: unknown, expected: unknown) =>
          store.save(expected, next as never)) as never,
        clearDraft,
        deleteMedia: deleteMedia as never,
      }),
    );

    expect(result.status).toBe("conflict");
    expect(result.reason).toBe("atomic-conflict");
    expect(result.concurrency).toBe("atomic");
    // Sin sobrescritura silenciosa: el documento ajeno sigue ahí y no se escribió nada.
    expect(store.current).toEqual(foreign);
    expect(store.writes).toHaveLength(0);
    // El trabajo del invitado se conserva entero: borrador y fotos.
    expect(clearDraft).not.toHaveBeenCalled();
    expect(deleteMedia).not.toHaveBeenCalled();
  });

  it("sin la guarda, el mismo escenario SÍ perdería el trabajo ajeno (valor de la guarda)", async () => {
    const foreign = draftWithName("Otra sesión ganó");
    const store = casStore(starterDocument());
    store.armForeignWrite(foreign);

    const result = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      deps({
        // Camino antiguo: escritura incondicional (lo que hacía `saveDraft`).
        readDocument: vi.fn(async () => store.current),
        saveDocument: ((_s: unknown, _p: unknown, _u: unknown, next: unknown) =>
          store.writeUnconditionally(next as never)) as never,
      }),
    );

    expect(result.status).toBe("claimed");
    // Aquí se ve el daño que la guarda evita: lo escrito por la otra sesión se perdió.
    expect(store.current).not.toEqual(foreign);
    expect(store.writes).toHaveLength(1);
  });

  it("nulo-seguro de extremo a extremo: NULL solo coincide con NULL", async () => {
    const store = casStore(starterDocument());
    const okResult = await claimGuestDraft(
      { ...base, document: draftWithName("Ana") },
      atomicDeps({
        readDocument: vi.fn(async () => store.current),
        saveDocumentIfUnchanged: ((_s: unknown, _p: unknown, next: unknown, expected: unknown) =>
          store.save(expected, next as never)) as never,
      }),
    );
    expect(okResult.status).toBe("claimed");

    // Ahora hay documento: un esperado NULL ya no puede escribir.
    const staleStore = casStore(draftWithName("Contenido real"));
    const stale = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      atomicDeps({
        readDocument: vi.fn(async () => null),
        saveDocumentIfUnchanged: ((_s: unknown, _p: unknown, next: unknown, expected: unknown) =>
          staleStore.save(expected, next as never)) as never,
      }),
    );
    expect(stale.status).toBe("conflict");
    expect(stale.reason).toBe("atomic-conflict");
    // NULL solo coincide con NULL: el contenido real no se toca.
    expect(staleStore.current).toEqual(draftWithName("Contenido real"));
    expect(staleStore.writes).toHaveLength(0);
  });

  it("un error que no es conflicto no se disfraza de conflicto", async () => {
    const result = await claimGuestDraft(
      { ...base, document: draftWithName("Ana") },
      atomicDeps({
        saveDocumentIfUnchanged: (async () => {
          throw new Error("PAGE_NOT_FOUND: La página no existe o no pertenece al usuario.");
        }) as never,
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("PAGE_NOT_FOUND");
  });

  it("tras un conflicto el reintento decide con el estado real y nunca pisa lo ajeno", async () => {
    const store = casStore(starterDocument());
    const foreign = draftWithName("Otra sesión");
    store.armForeignWrite(foreign);
    const clearDraft = vi.fn();
    const first = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      atomicDeps({
        readDocument: vi.fn(async () => store.current),
        saveDocumentIfUnchanged: ((_s: unknown, _p: unknown, next: unknown, expected: unknown) =>
          store.save(expected, next as never)) as never,
        clearDraft,
      }),
    );
    expect(first.status).toBe("conflict");
    expect(first.reason).toBe("atomic-conflict");

    // Reintento: el documento de la otra sesión ya es contenido real, así que el
    // reintento vuelve a rechazar y NO lo sobrescribe (ni borra el borrador local).
    const retry = await claimGuestDraft(
      { ...base, document: draftWithName("Visitante") },
      atomicDeps({
        readDocument: vi.fn(async () => store.current),
        saveDocumentIfUnchanged: ((_s: unknown, _p: unknown, next: unknown, expected: unknown) =>
          store.save(expected, next as never)) as never,
        clearDraft,
      }),
    );
    expect(retry.status).toBe("conflict");
    expect(retry.reason).toBe("existing-content");
    expect(store.current).toEqual(foreign);
    expect(store.writes).toHaveLength(0);
    expect(clearDraft).not.toHaveBeenCalled();
  });
});
