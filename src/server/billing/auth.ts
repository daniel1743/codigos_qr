import "@tanstack/react-start/server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getCookies, setCookie } from "@tanstack/react-start/server";
import { env } from "../../lib/env";

export const BILLING_AUTH_STRATEGY = "cookies" as const;

export class BillingUnauthorizedError extends Error {
  readonly code = "BILLING_UNAUTHORIZED" as const;
  readonly status = 401 as const;

  constructor() {
    super("Authentication is required for billing operations.");
    this.name = "BillingUnauthorizedError";
  }
}

export class BillingServerConfigurationError extends Error {
  readonly code = "BILLING_SERVER_CONFIGURATION_ERROR" as const;
  readonly status = 500 as const;

  constructor(message: string) {
    super(message);
    this.name = "BillingServerConfigurationError";
  }
}

export interface BillingUser {
  user: User;
  userId: string;
  email: string | null;
}

type BillingAuthClient = Pick<SupabaseClient, "auth">;

function getRequestCookies(): { name: string; value: string }[] {
  try {
    return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
  } catch {
    // No request context means there are no usable credentials. The caller
    // must fail closed instead of manufacturing an anonymous billing user.
    return [];
  }
}

/**
 * Creates a Supabase client bound to the current server request's cookies.
 * This helper must only be called from a TanStack Start server context.
 */
export function createBillingServerSupabaseClient() {
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: getRequestCookies,
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(name, value, options);
        }
      },
    },
  });
}

/**
 * Resolves the authenticated Supabase user from validated server credentials.
 * The optional client argument exists only to keep the identity mapping
 * unit-testable; production callers should use the default request-bound
 * client.
 */
export async function getBillingUser(
  supabase: BillingAuthClient = createBillingServerSupabaseClient(),
): Promise<BillingUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) return null;

    return {
      user,
      userId: user.id,
      email: user.email ?? null,
    };
  } catch {
    // Authentication failures are deliberately indistinguishable from an
    // absent session at this boundary. Billing must fail closed.
    return null;
  }
}

/**
 * Requires a validated Supabase identity for a billing operation.
 */
export async function requireBillingUser(supabase?: BillingAuthClient): Promise<BillingUser> {
  const billingUser = await getBillingUser(supabase ?? createBillingServerSupabaseClient());
  if (!billingUser) throw new BillingUnauthorizedError();
  return billingUser;
}

function getServiceRoleKey(): string {
  const serviceRoleKey =
    typeof process !== "undefined" && process.env
      ? process.env["SUPABASE_SERVICE_ROLE_KEY"]
      : undefined;

  if (!serviceRoleKey?.trim()) {
    throw new BillingServerConfigurationError(
      "SUPABASE_SERVICE_ROLE_KEY is required for billing privileged operations.",
    );
  }

  return serviceRoleKey;
}

/**
 * Creates the billing-only privileged client. It never falls back to anon
 * credentials when the service-role secret is missing.
 */
export function getBillingPrivilegedSupabaseClient() {
  const serviceRoleKey = getServiceRoleKey();

  return createClient(env.supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
