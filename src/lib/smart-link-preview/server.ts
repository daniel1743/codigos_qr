import { createServerFn } from "@tanstack/react-start";
import type { SmartLinkPreview } from "./index";

export const resolveSmartLinkPreviewFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (
      !input ||
      typeof input !== "object" ||
      typeof (input as { url?: unknown }).url !== "string"
    ) {
      throw new Error("Solicitud de vista previa inválida.");
    }
    return input as { url: string };
  })
  .handler(async ({ data }): Promise<SmartLinkPreview> => {
    // Import the server-only module lazily to avoid Vite import-protection issues in the client
    const { resolveSmartLinkPreview } = await import("./core.server");
    return resolveSmartLinkPreview(data.url);
  });
