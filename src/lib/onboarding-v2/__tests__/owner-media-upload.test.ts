import { describe, expect, it, vi } from "vitest";

import {
  OWNER_MEDIA_RULES,
  removeOwnerMediaReference,
  uploadOwnerMediaReference,
  validateOwnerMediaFile,
  type OwnerMediaStorageClient,
} from "../owner-media-upload";

function storageClient(
  options: {
    session?: { user?: { id?: string }; access_token?: string } | null;
    uploadError?: { message: string } | null;
    removeError?: { message: string } | null;
  } = {},
): OwnerMediaStorageClient & {
  uploads: Array<{ bucket: string; path: string; file: File }>;
  removals: Array<{ bucket: string; paths: string[] }>;
} {
  const uploads: Array<{ bucket: string; path: string; file: File }> = [];
  const removals: Array<{ bucket: string; paths: string[] }> = [];
  return {
    uploads,
    removals,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: options.session ?? null } }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: vi.fn(async (path: string, file: File) => {
          uploads.push({ bucket, path, file });
          return { error: options.uploadError ?? null };
        }),
        getPublicUrl: vi.fn((path: string) => ({
          data: {
            publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}`,
          },
        })),
        remove: vi.fn(async (paths: string[]) => {
          removals.push({ bucket, paths });
          return { error: options.removeError ?? null };
        }),
      }),
    },
  };
}

describe("durable premium owner media upload", () => {
  it("uses the authenticated user path and existing avatar bucket", async () => {
    const client = storageClient({ session: { user: { id: "user-123" } } });
    const file = new File(["avatar"], "Mi Foto!.jpg", { type: "image/jpeg" });

    const reference = await uploadOwnerMediaReference(client, file, "avatar", "Retrato");

    expect(reference).toMatchObject({
      id: expect.stringMatching(/^user-123\/power-editor\/avatar-/),
      kind: "image",
      alt: "Retrato",
    });
    expect(reference.url).toContain("https://");
    expect(client.uploads[0]).toMatchObject({ bucket: "avatars", file });
  });

  it("uses the existing banners bucket for a cover", async () => {
    const client = storageClient({ session: { user: { id: "user-123" } } });
    const file = new File(["cover"], "cover.webp", { type: "image/webp" });

    await uploadOwnerMediaReference(client, file, "cover");

    expect(client.uploads[0]?.bucket).toBe("banners");
    expect(client.uploads[0]?.path).toMatch(/^user-123\/power-editor\/cover-/);
  });

  it("enforces the existing MIME and per-slot size limits", () => {
    const unsupported = new File(["x"], "animation.gif", { type: "image/gif" });
    const oversized = new File(
      [new Uint8Array(OWNER_MEDIA_RULES.avatar.maxBytes + 1)],
      "huge.png",
      {
        type: "image/png",
      },
    );

    expect(validateOwnerMediaFile(unsupported, "avatar")).toMatchObject({ valid: false });
    expect(validateOwnerMediaFile(oversized, "avatar")).toMatchObject({ valid: false });
  });

  it("does not create a reference without an authenticated session or after upload failure", async () => {
    const unauthenticated = storageClient();
    const file = new File(["x"], "photo.png", { type: "image/png" });
    await expect(uploadOwnerMediaReference(unauthenticated, file, "item")).rejects.toThrow(
      "Debes iniciar sesión",
    );

    const failed = storageClient({
      session: { user: { id: "user-123" } },
      uploadError: { message: "Storage unavailable" },
    });
    await expect(uploadOwnerMediaReference(failed, file, "item")).rejects.toThrow(
      "Storage unavailable",
    );
    expect(failed.uploads).toHaveLength(1);
  });

  it("removes only a reference below the authenticated user's own path", async () => {
    const client = storageClient({ session: { user: { id: "user-123" } } });
    await removeOwnerMediaReference(
      client,
      { id: "user-123/power-editor/item-1.png", url: "https://cdn.test/item.png", kind: "image" },
      "item",
    );

    expect(client.removals).toEqual([
      { bucket: "avatars", paths: ["user-123/power-editor/item-1.png"] },
    ]);
    await expect(
      removeOwnerMediaReference(
        client,
        {
          id: "other-user/power-editor/item-1.png",
          url: "https://cdn.test/item.png",
          kind: "image",
        },
        "item",
      ),
    ).rejects.toThrow("no pertenece");
    expect(client.removals).toHaveLength(1);
  });
});
