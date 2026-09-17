/**
 * Durable owner-media upload for the premium onboarding flow.
 *
 * This is a thin adapter over the existing authenticated Supabase Storage
 * buckets used by the editor. It returns the existing OwnerMediaReference
 * shape; it is not a second media contract or upload system.
 */

import type { OwnerMediaReference } from "@/lib/page-generator/owner-content";

export type OwnerMediaSlot = "avatar" | "cover" | "item";
export type OwnerMediaUploadStatus = "idle" | "uploading" | "uploaded" | "failed";

export const OWNER_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const OWNER_MEDIA_ACCEPT = OWNER_MEDIA_TYPES.join(",");

export const OWNER_MEDIA_RULES: Record<
  OwnerMediaSlot,
  { bucket: "avatars" | "banners"; maxBytes: number }
> = {
  avatar: { bucket: "avatars", maxBytes: 3 * 1024 * 1024 },
  cover: { bucket: "banners", maxBytes: 4 * 1024 * 1024 },
  item: { bucket: "avatars", maxBytes: 3 * 1024 * 1024 },
};

export interface OwnerMediaStorageClient {
  auth: {
    getSession: () => Promise<{
      data: { session: { user?: { id?: string }; access_token?: string } | null };
    }>;
  };
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: { message?: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl?: string } };
      remove: (paths: string[]) => Promise<{ error: { message?: string } | null }>;
    };
  };
}

export interface OwnerMediaValidationResult {
  valid: boolean;
  error?: string;
}

function extensionForType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function safeBaseName(name: string): string {
  const base = name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase();
  return (
    base
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "owner-media"
  );
}

function errorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() || fallback;
}

export function validateOwnerMediaFile(
  file: File | null | undefined,
  slot: OwnerMediaSlot,
): OwnerMediaValidationResult {
  if (!file) return { valid: false, error: "Elige una imagen para continuar." };
  const rule = OWNER_MEDIA_RULES[slot];
  if (!(OWNER_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return { valid: false, error: "Usa una imagen JPG, PNG o WebP." };
  }
  if (file.size > rule.maxBytes) {
    const limit = slot === "cover" ? "4 MB" : "3 MB";
    return { valid: false, error: `La imagen no puede superar ${limit}.` };
  }
  return { valid: true };
}

function uploadedPath(userId: string, slot: OwnerMediaSlot, file: File): string {
  return `${userId}/power-editor/${slot}-${Date.now()}-${safeBaseName(file.name)}.${extensionForType(file.type)}`;
}

/** Uploads only to the existing user-scoped editor storage paths. */
export async function uploadOwnerMediaReference(
  supabase: OwnerMediaStorageClient,
  file: File,
  slot: OwnerMediaSlot,
  alt?: string,
): Promise<OwnerMediaReference> {
  const validation = validateOwnerMediaFile(file, slot);
  if (!validation.valid) throw new Error(validation.error);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id?.trim();
  if (!userId) throw new Error("Debes iniciar sesión para subir imágenes.");

  const rule = OWNER_MEDIA_RULES[slot];
  const path = uploadedPath(userId, slot, file);
  const { error } = await supabase.storage.from(rule.bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(errorMessage(error, "No se pudo subir la imagen."));

  const { data } = supabase.storage.from(rule.bucket).getPublicUrl(path);
  const url = data.publicUrl?.trim();
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) {
    throw new Error("La imagen no devolvió una referencia durable.");
  }

  return {
    id: path,
    url,
    kind: "image",
    ...(alt?.trim() || file.name.trim() ? { alt: alt?.trim() || file.name.trim() } : {}),
  };
}

/** Removes only a reference created below the authenticated user's own path. */
export async function removeOwnerMediaReference(
  supabase: OwnerMediaStorageClient,
  reference: OwnerMediaReference | undefined,
  slot: OwnerMediaSlot,
): Promise<void> {
  const path = reference?.id?.trim();
  if (!path) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id?.trim();
  if (!userId) throw new Error("Debes iniciar sesión para quitar imágenes.");
  if (!path.startsWith(`${userId}/`)) {
    throw new Error("No puedes quitar una imagen que no pertenece a tu cuenta.");
  }

  const { error } = await supabase.storage.from(OWNER_MEDIA_RULES[slot].bucket).remove([path]);
  if (error) throw new Error(errorMessage(error, "No se pudo quitar la imagen."));
}
