/**
 * Acceso a datos para usuarios y metadatos de Documentos Seguros.
 */
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSecureDocument, InsertUser, secureDocuments, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      database = null;
    }
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };

  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listSecureDocuments(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");

  return db
    .select()
    .from(secureDocuments)
    .where(and(eq(secureDocuments.ownerId, ownerId), eq(secureDocuments.status, "active")))
    .orderBy(desc(secureDocuments.createdAt));
}

export async function createSecureDocument(document: InsertSecureDocument) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");

  await db.insert(secureDocuments).values(document);
  const records = await db.select().from(secureDocuments).where(eq(secureDocuments.fileKey, document.fileKey)).limit(1);
  return records[0];
}

export async function getSecureDocumentForOwner(documentId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está disponible.");

  const records = await db
    .select()
    .from(secureDocuments)
    .where(and(eq(secureDocuments.id, documentId), eq(secureDocuments.ownerId, ownerId), eq(secureDocuments.status, "active")))
    .limit(1);

  return records[0];
}
