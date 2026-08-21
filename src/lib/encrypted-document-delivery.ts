// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { getServiceRoleSupabaseClient } from "./supabase/server";

const SIGNED_URL_TTL_SECONDS = 45;

type DocumentStatus =
  | "available"
  | "authorized"
  | "not_found"
  | "revoked"
  | "expired"
  | "limit_reached"
  | "invalid_password"
  | "temporary_error";

type SecureDocumentRequest =
  | { action: "metadata"; shortUrl: string }
  | { action: "authorize"; shortUrl: string; password?: string };

export type SecureDocumentResponse =
  | {
      ok: true;
      action: "metadata";
      status: "available";
      name: string;
      originalFilename: string;
      fileType: string;
      fileSizeBytes: number;
      passwordRequired: boolean;
    }
  | {
      ok: true;
      action: "authorize";
      status: "authorized";
      signedUrl: string;
      originalFilename: string;
      mimeType: string;
      iv: string;
      salt: string | null;
      expiresIn: number;
    }
  | {
      ok: false;
      action: "metadata" | "authorize";
      status: Exclude<DocumentStatus, "available" | "authorized">;
    };

function isValidInput(input: SecureDocumentRequest): SecureDocumentRequest {
  if (!input || (input.action !== "metadata" && input.action !== "authorize")) {
    throw new Error("invalid_request");
  }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(input.shortUrl)) {
    throw new Error("invalid_request");
  }
  if (input.action === "authorize" && input.password && input.password.length > 512) {
    throw new Error("invalid_request");
  }
  return input;
}

function firstRow<T>(data: T[] | T | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

export const secureEncryptedDocument = createServerFn({ method: "POST" })
  .validator(isValidInput)
  .handler(async ({ data }): Promise<SecureDocumentResponse> => {
    setResponseHeader("Cache-Control", "no-store");
    const supabase = getServiceRoleSupabaseClient();

    if (data.action === "metadata") {
      const { data: metadataData, error } = await supabase.rpc(
        "get_encrypted_document_public_metadata",
        { p_short_url: data.shortUrl },
      );

      if (error) {
        console.error("Encrypted document metadata failed", error);
        return { ok: false, action: "metadata", status: "temporary_error" };
      }

      const metadata = firstRow(metadataData) as {
        status: DocumentStatus;
        name: string | null;
        original_filename: string | null;
        file_type: string | null;
        file_size_bytes: number | null;
        password_required: boolean | null;
      } | null;

      if (!metadata || metadata.status !== "available") {
        return {
          ok: false,
          action: "metadata",
          status: metadata?.status === "revoked"
            || metadata?.status === "expired"
            || metadata?.status === "limit_reached"
            ? metadata.status
            : "not_found",
        };
      }

      return {
        ok: true,
        action: "metadata",
        status: "available",
        name: metadata.name ?? "Documento cifrado",
        originalFilename: metadata.original_filename ?? "documento",
        fileType: metadata.file_type ?? "other",
        fileSizeBytes: Number(metadata.file_size_bytes ?? 0),
        passwordRequired: Boolean(metadata.password_required),
      };
    }

    const userAgent = getRequestHeader("user-agent") ?? "unknown";
    const { data: authorizationData, error: authorizationError } = await supabase.rpc(
      "authorize_encrypted_document_download",
      {
        p_short_url: data.shortUrl,
        p_password: data.password ?? null,
        p_user_agent: userAgent,
      },
    );

    if (authorizationError) {
      console.error("Encrypted document authorization failed", authorizationError);
      return { ok: false, action: "authorize", status: "temporary_error" };
    }

    const authorization = firstRow(authorizationData) as {
      status: DocumentStatus;
      document_id: string | null;
      original_filename: string | null;
      mime_type: string | null;
      encrypted_file_path: string | null;
      iv: string | null;
      salt: string | null;
    } | null;

    if (
      !authorization
      || authorization.status !== "authorized"
      || !authorization.document_id
      || !authorization.encrypted_file_path
      || !authorization.iv
    ) {
      const status = authorization?.status;
      return {
        ok: false,
        action: "authorize",
        status: status === "invalid_password"
          || status === "revoked"
          || status === "expired"
          || status === "limit_reached"
          ? status
          : "not_found",
      };
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("encrypted-documents")
      .createSignedUrl(authorization.encrypted_file_path, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signedData?.signedUrl) {
      await supabase.rpc("release_encrypted_document_download", {
        p_document_id: authorization.document_id,
      });
      console.error("Encrypted document signed URL failed", signedError);
      return { ok: false, action: "authorize", status: "temporary_error" };
    }

    return {
      ok: true,
      action: "authorize",
      status: "authorized",
      signedUrl: signedData.signedUrl,
      originalFilename: authorization.original_filename ?? "documento",
      mimeType: authorization.mime_type ?? "application/octet-stream",
      iv: authorization.iv,
      salt: authorization.salt,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    };
  });
