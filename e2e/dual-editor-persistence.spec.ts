import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// `sy9whgm` is the QA profile alias; its current application slug is the
// deterministic profile used by the authenticated Phase 4/5 harness.
const PROFILE_SLUG = "qa-dual-editor-test";
const QA_USER_ID = "8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165";
const QA_NAME = "QA Dual Editor Test";

// JSON payloads are intentionally opaque to this persistence harness.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonRecord = Record<string, any>;
type BrowserSupabase = { url: string; anonKey: string };
type BrowserRequest = {
  path: string;
  method?: "GET" | "PATCH" | "POST";
  body?: unknown;
};

function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    return Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]),
    );
  } catch {
    return {};
  }
}

function env(name: string): string | undefined {
  return process.env[name] || loadEnvFile()[name];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertRecord(value: unknown, label: string): asserts value is JsonRecord {
  expect(value, label).toBeTruthy();
  expect(typeof value, label).toBe("object");
  expect(Array.isArray(value), label).toBe(false);
}

function engineConfigFromEntrypoint(): JsonRecord {
  const runner = resolve(process.cwd(), "e2e/run-engine-v2-entrypoint.mjs");
  const output = execFileSync(process.execPath, [runner], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const config = JSON.parse(output) as JsonRecord;
  assertRecord(config, "Engine V2 editorConfig");
  return config;
}

function advancedPowerConfig(base: JsonRecord): JsonRecord {
  const config = clone(base);
  config.theme.texture = { preset: "linen", opacity: 0.16, scale: 20 };
  config.theme.background = {
    type: "gradient",
    gradient: { kind: "linear", angle: 135, from: "#fff7ed", to: "#fee2e2" },
  };
  config.theme.cards = { ...config.theme.cards, preset: "luxury", shadow: "floating" };
  config.theme.buttons = { ...config.theme.buttons, variant: "gradient" };
  config.motion = {
    preset: "editorial",
    entrance: "soft-rise",
    hover: "lift",
    duration: 420,
    delay: 0,
    stagger: 45,
  };
  const firstBlock = config.blocks?.[0];
  if (firstBlock) firstBlock.style = { ...firstBlock.style, frame: "double" };
  return config;
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableJson(nested)]),
    );
  }
  return value;
}

function powerSignature(config: JsonRecord): string {
  return JSON.stringify(
    stableJson({
      texture: config.theme?.texture,
      background: config.theme?.background,
      cards: config.theme?.cards,
      buttons: config.theme?.buttons,
      motion: config.motion,
      blockFrames: (config.blocks ?? []).map((block: JsonRecord) => ({
        id: block.id,
        frame: block.style?.frame,
        responsive: block.responsive,
      })),
    }),
  );
}

async function browserSupabaseRequest(
  page: Page,
  supabase: BrowserSupabase,
  request: BrowserRequest,
): Promise<unknown> {
  return page.evaluate(
    async ({ supabase, request }) => {
      function parseSessionValue(raw: string): { access_token?: string } | null {
        const candidates = [raw, decodeURIComponent(raw)];
        if (raw.startsWith("base64-")) candidates.push(raw.slice("base64-".length));
        for (const candidate of [...candidates]) {
          try {
            const decoded = atob(candidate.replace(/-/g, "+").replace(/_/g, "/"));
            candidates.push(decoded);
          } catch {
            // The value may already be JSON.
          }
        }
        for (const candidate of candidates) {
          try {
            const parsed = JSON.parse(candidate) as { access_token?: string };
            if (parsed.access_token) return parsed;
          } catch {
            // Try the next storage representation.
          }
        }
        return null;
      }

      function accessToken(): string | null {
        const storageValues: string[] = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key?.includes("auth-token")) {
            const value = localStorage.getItem(key);
            if (value) storageValues.push(value);
          }
        }
        for (const value of storageValues) {
          const session = parseSessionValue(value);
          if (session?.access_token) return session.access_token;
        }

        const cookies = document.cookie
          .split("; ")
          .map((item) => item.split("="))
          .filter((parts): parts is [string, string] => parts.length >= 2)
          .filter(([name]) => name.includes("auth-token"));
        const groups = new Map<string, string[]>();
        for (const [name, value] of cookies) {
          const baseName = name.replace(/\.\d+$/, "");
          const values = groups.get(baseName) ?? [];
          values.push(`${name}\u0000${value}`);
          groups.set(baseName, values);
        }
        for (const values of groups.values()) {
          const combined = values
            .sort()
            .map((entry) => entry.slice(entry.indexOf("\u0000") + 1))
            .join("");
          const session = parseSessionValue(combined);
          if (session?.access_token) return session.access_token;
        }
        return null;
      }

      const token = accessToken();
      if (!token) throw new Error("BLOCKED: authenticated browser session token unavailable.");

      const headers: Record<string, string> = {
        apikey: supabase.anonKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };
      const init: RequestInit = { method: request.method ?? "GET", headers };
      if (request.body !== undefined) {
        headers["Content-Type"] = "application/json";
        headers.Prefer = "return=representation";
        init.body = JSON.stringify(request.body);
      }

      let response: Response;
      try {
        response = await fetch(`${supabase.url.replace(/\/$/, "")}/${request.path}`, init);
      } catch (error) {
        const message = error instanceof Error ? error.message : "browser fetch failed";
        throw new Error(`BLOCKED: browser Supabase request failed (${message}).`);
      }

      const raw = await response.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }
      if (!response.ok) {
        const detail =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as { message?: unknown }).message)
            : `HTTP ${response.status}`;
        throw new Error(`Browser Supabase request failed (${detail}).`);
      }
      return data;
    },
    { supabase, request },
  );
}

async function authenticatedUserId(page: Page, supabase: BrowserSupabase): Promise<string> {
  const data = await browserSupabaseRequest(page, supabase, { path: "auth/v1/user" });
  assertRecord(data, "authenticated browser user");
  expect(typeof data.id).toBe("string");
  return data.id as string;
}

async function readProfile(
  page: Page,
  supabase: BrowserSupabase,
  userId: string,
): Promise<JsonRecord> {
  const select = "id,user_id,slug,display_name,profession,bio,avatar_url,template_config";
  const data = await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profiles?select=${select}&user_id=eq.${encodeURIComponent(userId)}`,
  });
  const matches = Array.isArray(data)
    ? data.filter((candidate): candidate is JsonRecord => {
        return (
          typeof candidate === "object" && candidate !== null && candidate.slug === PROFILE_SLUG
        );
      })
    : [];
  if (matches.length !== 1) {
    const ownedCount = Array.isArray(data) ? data.length : 0;
    const ownedSlugs = Array.isArray(data)
      ? data
          .filter(
            (candidate): candidate is JsonRecord =>
              typeof candidate === "object" && candidate !== null,
          )
          .map((candidate) => String(candidate.slug ?? ""))
          .join(",")
      : "";
    throw new Error(
      `BLOCKED: QA profile lookup did not return exactly one profile (owned=${ownedCount}; slugs=${ownedSlugs}).`,
    );
  }
  const profile = matches[0];
  assertRecord(profile, "Authenticated QA profile");
  expect(profile.slug).toBe(PROFILE_SLUG);
  expect(profile.user_id).toBe(userId);
  expect(userId).toBe(QA_USER_ID);
  return profile;
}

async function readLinks(
  page: Page,
  supabase: BrowserSupabase,
  profileId: string,
): Promise<JsonRecord[]> {
  const data = await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profile_links?select=id,platform,label,url,enabled,sort_order&profile_id=eq.${encodeURIComponent(profileId)}&order=sort_order.asc`,
  });
  if (!Array.isArray(data)) throw new Error("Browser profile links response was not an array.");
  return data as JsonRecord[];
}

async function saveCanonical(
  page: Page,
  supabase: BrowserSupabase,
  profileId: string,
  editorConfig: JsonRecord,
): Promise<void> {
  await browserSupabaseRequest(page, supabase, {
    path: "rest/v1/rpc/set_profile_canonical_editor_config",
    method: "POST",
    body: { p_profile_id: profileId, p_editor_config: editorConfig },
  });
}

async function restoreProfile(
  page: Page,
  supabase: BrowserSupabase,
  profileId: string,
  userId: string,
  bio: unknown,
  templateConfig: unknown,
): Promise<void> {
  await browserSupabaseRequest(page, supabase, {
    path: `rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}&user_id=eq.${encodeURIComponent(userId)}`,
    method: "PATCH",
    body: { bio, template_config: templateConfig },
  });
}

async function saveBasicThroughUi(page: Page, bio: string): Promise<void> {
  await page.goto("/editor");
  await expect(page.getByLabel("Nombre para mostrar")).toHaveValue(QA_NAME, { timeout: 15_000 });
  await page.locator("#bio").fill(bio);
  const save = page.getByRole("button", { name: "Guardar borrador", exact: true }).first();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Borrador guardado").last()).toBeVisible({ timeout: 15_000 });
}

test("executes browser-only isolated Basic ↔ Power ↔ Engine V2 persistence gate", async ({
  page,
}) => {
  const supabaseUrl = env("VITE_SUPABASE_URL");
  const supabaseAnonKey = env("VITE_SUPABASE_ANON_KEY");
  const qaEmail = env("QA_EMAIL");
  const qaPassword = env("QA_PASSWORD");
  const results = {
    LOGIN: "FAIL",
    BASIC_SAVE: "FAIL",
    BASIC_TO_POWER: "FAIL",
    POWER_READS_BASIC_DATA: "FAIL",
    POWER_SAVE: "FAIL",
    POWER_TO_BASIC: "FAIL",
    DATA_PRESERVATION: "FAIL",
    ENGINE_V2_TO_BASIC: "NOT_TESTABLE",
  };

  test.skip(
    !supabaseUrl || !supabaseAnonKey || !qaEmail || !qaPassword,
    "BLOCKED: local Supabase/browser QA variables are incomplete; credentials are never printed or committed.",
  );
  const supabase: BrowserSupabase = { url: supabaseUrl!, anonKey: supabaseAnonKey! };
  let profileId = "";
  let userId = "";
  let originalBio: unknown;
  let originalTemplateConfig: unknown;
  let originalLinks: JsonRecord[] = [];
  let cleanupRequired = false;

  try {
    await page.goto("/editor");
    const loginForm = page.getByLabel("Correo electrónico");
    const profileNameField = page.getByLabel("Nombre para mostrar");
    await expect(loginForm.or(profileNameField)).toBeVisible({ timeout: 45_000 });
    if (await loginForm.isVisible()) {
      await loginForm.fill(qaEmail!);
      await page.getByLabel("Contraseña").fill(qaPassword!);
      await page.getByRole("button", { name: "Entrar al editor" }).click();
    }
    await expect(page).toHaveURL(/\/editor/);
    await expect(profileNameField).toHaveValue(QA_NAME, { timeout: 30_000 });
    userId = await authenticatedUserId(page, supabase);
    results.LOGIN = "PASS";
    const uiSlug = await page
      .locator("#public_alias")
      .inputValue()
      .catch(() => "");
    console.log(`[Gate] UI_PROFILE_SLUG=${uiSlug || "<empty>"}`);
    const profile = await readProfile(page, supabase, userId);
    profileId = profile.id as string;
    originalBio = profile.bio;
    originalTemplateConfig = clone(profile.template_config ?? null);
    originalLinks = await readLinks(page, supabase, profileId);
    expect(originalLinks.length).toBeGreaterThanOrEqual(3);
    cleanupRequired = true;

    const generatedBase = engineConfigFromEntrypoint();
    const powerA = advancedPowerConfig(generatedBase);
    // This canonical seed is performed by browser fetch only so Basic's real
    // UI save can prove it retains premium/unknown fields. It is not reported
    // as a Power Editor save because the current host has no Power route.
    await saveCanonical(page, supabase, profileId, powerA);
    const seeded = await readProfile(page, supabase, userId);
    assertRecord(seeded.template_config, "browser canonical seed");
    expect(seeded.template_config.schemaVersion).toBe(1);
    assertRecord(seeded.template_config.editorConfig, "browser canonical seed editorConfig");

    await saveBasicThroughUi(page, "Basic QA browser edit A — canonical fields survive.");
    results.BASIC_SAVE = "PASS";
    const afterBasic = await readProfile(page, supabase, userId);
    expect(afterBasic.bio).toBe("Basic QA browser edit A — canonical fields survive.");
    assertRecord(afterBasic.template_config?.editorConfig, "after Basic editorConfig");
    expect(powerSignature(afterBasic.template_config.editorConfig)).toBe(powerSignature(powerA));
    results.DATA_PRESERVATION = "PASS";

    await page.goto(`/internal/power-editor?profile=${encodeURIComponent(PROFILE_SLUG)}`);
    await expect(page.getByTestId("internal-power-editor")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("power-editor-profile")).toContainText(PROFILE_SLUG);
    await expect(page.getByTestId("power-editor-basic-bio")).toHaveText(
      "Basic QA browser edit A — canonical fields survive.",
    );
    results.BASIC_TO_POWER = "PASS";
    results.POWER_READS_BASIC_DATA = "PASS";

    const powerBeforeUiSave = await readProfile(page, supabase, userId);
    expect(powerSignature(powerBeforeUiSave.template_config.editorConfig)).toBe(
      powerSignature(powerA),
    );

    // Change a reversible Power-owned value through the real Studio UI.
    await page.getByRole("button", { name: "Design", exact: true }).click();
    await page.locator("select").last().selectOption("mesh");
    await page.keyboard.press("Control+s");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 15_000 });

    const afterPower = await readProfile(page, supabase, userId);
    expect(afterPower.bio).toBe("Basic QA browser edit A — canonical fields survive.");
    assertRecord(afterPower.template_config?.editorConfig, "after Power editorConfig");
    expect(afterPower.template_config.editorConfig.theme.texture.preset).toBe("mesh");
    expect(powerSignature(afterPower.template_config.editorConfig)).not.toBe(
      powerSignature(powerA),
    );
    results.POWER_SAVE = "PASS";

    await page.goto("/editor");
    await expect(page.getByLabel("Nombre para mostrar")).toHaveValue(QA_NAME, {
      timeout: 30_000,
    });
    await expect(page.locator("#bio")).toHaveValue(
      "Basic QA browser edit A — canonical fields survive.",
    );
    results.POWER_TO_BASIC = "PASS";

    await saveBasicThroughUi(page, "Basic QA browser edit B — Power fields survive.");
    const afterSecondBasic = await readProfile(page, supabase, userId);
    expect(afterSecondBasic.bio).toBe("Basic QA browser edit B — Power fields survive.");
    expect(powerSignature(afterSecondBasic.template_config.editorConfig)).toBe(
      powerSignature(afterPower.template_config.editorConfig),
    );
    results.DATA_PRESERVATION = "PASS";

    const engineConfig = engineConfigFromEntrypoint();
    await saveCanonical(page, supabase, profileId, engineConfig);
    const engineSnapshot = await readProfile(page, supabase, userId);
    assertRecord(engineSnapshot.template_config?.editorConfig, "Engine V2 editorConfig");
    const engineSignature = powerSignature(engineSnapshot.template_config.editorConfig);
    await saveBasicThroughUi(page, "Basic QA browser edit C — Engine V2 fields survive.");
    const engineAfterBasic = await readProfile(page, supabase, userId);
    expect(engineAfterBasic.bio).toBe("Basic QA browser edit C — Engine V2 fields survive.");
    expect(engineAfterBasic.template_config.schemaVersion).toBe(1);
    expect(powerSignature(engineAfterBasic.template_config.editorConfig)).toBe(engineSignature);
    results.ENGINE_V2_TO_BASIC = "PASS";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[Gate] ${message}`);
    if (message.includes("browser Supabase request failed") || message.includes("certificate")) {
      throw new Error(
        `BLOCKED: browser HTTPS/Supabase request failed; TLS was not bypassed. ${message}`,
      );
    }
    throw error;
  } finally {
    if (cleanupRequired) {
      await restoreProfile(page, supabase, profileId, userId, originalBio, originalTemplateConfig);
      const restoredLinks = await readLinks(page, supabase, profileId);
      expect(restoredLinks.map((link) => link.url)).toEqual(originalLinks.map((link) => link.url));
    }
    console.log(`[Gate] PROFILE=${PROFILE_SLUG}`);
    console.log(`[Gate] WRITES=browser UI Basic saves + browser canonical RPCs; cleanup restored`);
    console.log(`[Gate] ${JSON.stringify(results)}`);
    console.log("[Gate] service-role=NO");
    console.log("[Gate] NODE_TLS_REJECT_UNAUTHORIZED=0=NO");
  }
});
