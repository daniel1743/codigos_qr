import { getServerSupabaseClient } from "../supabase/server";
import type { CanonicalPublicPagePort } from "./resolveCanonicalPublicPage";
import {
  createSupabaseCanonicalPublicPagePort,
  type CanonicalPublicReadClient,
} from "./supabaseCanonicalPublicPagePort.server";

/**
 * Server-only entry point for the canonical public resolver.
 *
 * PHASE 2: created but deliberately NOT consumed anywhere yet — no route,
 * QR generator, alias or renderer imports it, so production behaviour is
 * unchanged. Phase 3 will consume it from the public routes.
 */
export function getCanonicalPublicPagePort(): CanonicalPublicPagePort {
  const client = getServerSupabaseClient() as unknown as CanonicalPublicReadClient;
  return createSupabaseCanonicalPublicPagePort(client);
}
