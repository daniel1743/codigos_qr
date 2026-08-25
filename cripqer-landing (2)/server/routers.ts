/**
 * Contratos tRPC para autenticación, documentos de usuario y pruebas aisladas de Cripqer.
 * Los datos de demostración se separan por un propietario técnico y se deshabilitan en producción.
 */
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createSecureDocument, getSecureDocumentForOwner, getUserByOpenId, listSecureDocuments, upsertUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { DEMO_DOCUMENT_OWNER_OPEN_ID, demoModeAvailable } from "./demoDocuments";
import { decodeDocumentBase64, isAcceptedDocumentType, MAX_DOCUMENT_BYTES, sanitizeDocumentName } from "./documents";
import { storageGetSignedUrl, storagePut } from "./storage";

const documentUploadInput = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  byteSize: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
  dataBase64: z.string().min(8),
});

type DocumentUploadInput = z.infer<typeof documentUploadInput>;

async function storeDocumentForOwner(ownerId: number, input: DocumentUploadInput) {
  if (!isAcceptedDocumentType(input.mimeType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Solo puedes cargar PDF, TXT o DOCX." });
  }

  let content: Buffer;
  try {
    content = decodeDocumentBase64(input.dataBase64, input.byteSize);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "No se pudo leer el archivo.",
    });
  }

  const fileName = sanitizeDocumentName(input.fileName);
  const uploaded = await storagePut(`secure-documents/${ownerId}/${Date.now()}-${fileName}`, content, input.mimeType);
  return createSecureDocument({
    ownerId,
    fileKey: uploaded.key,
    fileName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
    status: "active",
  });
}

async function getDemoDocumentOwner() {
  if (!demoModeAvailable(ENV.isProduction)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "El modo de demostración no está disponible." });
  }

  await upsertUser({
    openId: DEMO_DOCUMENT_OWNER_OPEN_ID,
    name: "Cripqer Demo",
    loginMethod: "development-demo",
    role: "user",
    lastSignedIn: new Date(),
  });
  const demoUser = await getUserByOpenId(DEMO_DOCUMENT_OWNER_OPEN_ID);
  if (!demoUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo inicializar la bóveda de demostración." });
  return demoUser;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  documents: router({
    list: protectedProcedure.query(({ ctx }) => listSecureDocuments(ctx.user.id)),
    upload: protectedProcedure.input(documentUploadInput).mutation(({ ctx, input }) => storeDocumentForOwner(ctx.user.id, input)),
    downloadUrl: protectedProcedure
      .input(z.object({ documentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const document = await getSecureDocumentForOwner(input.documentId, ctx.user.id);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Documento no encontrado." });
        return { documentId: document.id, url: await storageGetSignedUrl(document.fileKey) };
      }),
  }),
  demoDocuments: router({
    list: publicProcedure.query(async () => listSecureDocuments((await getDemoDocumentOwner()).id)),
    upload: publicProcedure.input(documentUploadInput).mutation(async ({ input }) => storeDocumentForOwner((await getDemoDocumentOwner()).id, input)),
    downloadUrl: publicProcedure
      .input(z.object({ documentId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const owner = await getDemoDocumentOwner();
        const document = await getSecureDocumentForOwner(input.documentId, owner.id);
        if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Documento de demostración no encontrado." });
        return { documentId: document.id, url: await storageGetSignedUrl(document.fileKey) };
      }),
  }),
});

export type AppRouter = typeof appRouter;
