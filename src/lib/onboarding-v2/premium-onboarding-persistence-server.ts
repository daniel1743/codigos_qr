import { createServerFn } from "@tanstack/react-start";

import type { BioTemplateConfig } from "@/premium-template-studio/types";
import type { PersistPremiumOnboardingGeneratedPageResult } from "./premium-onboarding-persistence";
import type { PageType } from "@/types/database";

export interface PremiumOnboardingPersistenceRpcInput {
  profileId: string;
  editorConfig: BioTemplateConfig;
  title: string;
  pageType: PageType;
  generation: {
    candidateId: string;
    score: number;
    family: string;
    layout: string;
  };
  /** Session credential; the server verifies it with Supabase and never trusts a userId from the browser. */
  accessToken: string;
}

const PAGE_TYPES: readonly PageType[] = [
  "landing",
  "promotion",
  "menu",
  "campaign",
  "event",
  "services",
  "catalog",
  "portfolio",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateInput(value: unknown): PremiumOnboardingPersistenceRpcInput {
  if (!isRecord(value)) throw new Error("Los datos para guardar la página no son válidos.");

  const pageType = value["pageType"];
  const generation = value["generation"];
  const accessToken = typeof value["accessToken"] === "string" ? value["accessToken"].trim() : "";
  if (
    typeof value["profileId"] !== "string" ||
    typeof value["title"] !== "string" ||
    !value["title"].trim() ||
    typeof pageType !== "string" ||
    !PAGE_TYPES.includes(pageType as PageType) ||
    !accessToken ||
    !isRecord(generation) ||
    typeof generation["candidateId"] !== "string" ||
    typeof generation["score"] !== "number" ||
    typeof generation["family"] !== "string" ||
    typeof generation["layout"] !== "string"
  ) {
    throw new Error("Faltan datos para guardar la página generada.");
  }

  return {
    profileId: value["profileId"],
    editorConfig: value["editorConfig"] as BioTemplateConfig,
    title: value["title"],
    pageType: pageType as PageType,
    generation: {
      candidateId: generation["candidateId"],
      score: generation["score"],
      family: generation["family"],
      layout: generation["layout"],
    },
    accessToken,
  };
}

/**
 * Server boundary for the premium persistence coordinator. The browser sends
 * only its session credential; ownership and the authenticated user are
 * resolved server-side by Supabase.
 */
export const persistPremiumOnboardingGeneratedPageFn = createServerFn({
  method: "POST",
  strict: false,
})
  .validator(validateInput)
  .handler(async ({ data }): Promise<PersistPremiumOnboardingGeneratedPageResult> => {
    const [{ createClient }, { env }, { persistPremiumOnboardingGeneratedPage }] =
      await Promise.all([
        import("@supabase/supabase-js"),
        import("../env"),
        import("./premium-onboarding-persistence"),
      ]);
    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
    });

    return persistPremiumOnboardingGeneratedPage({
      supabase,
      profileId: data.profileId,
      editorConfig: data.editorConfig,
      title: data.title,
      pageType: data.pageType,
      generation: data.generation,
    });
  });
