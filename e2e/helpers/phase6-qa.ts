import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Page } from "@playwright/test";

export const QA_PROFILE_ID = "ff0cd302-07a4-4106-9a13-a14f9ded2f4b";
export const QA_USER_ID = "8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165";
export const QA_SLUG = "qa-dual-editor-test";
// Database JSON is intentionally opaque in this test-only snapshot helper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QaRecord = Record<string, any>;
export type QaSnapshot = { profile: QaRecord; links: QaRecord[] };

export function qaEnv(name: string): string {
  const value = process.env[name] || readFileSync(resolve(".env.local"), "utf8")
    .split(/\r?\n/)
    .find((line) => line.startsWith(`${name}=`))
    ?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "");
  if (!value) throw new Error(`BLOCKED: missing QA variable ${name}`);
  return value;
}

export async function qaRequest(page: Page, path: string, method = "GET", body?: unknown): Promise<QaRecord | QaRecord[]> {
  return page.evaluate(async ({ url, anonKey, path, method, body }) => {
    function parse(raw: string): string | undefined {
      const candidates = [raw, decodeURIComponent(raw)];
      for (const candidate of [...candidates]) {
        try {
          candidates.push(atob(candidate.replace(/^base64-/, "").replace(/-/g, "+").replace(/_/g, "/")));
        } catch { /* Already JSON. */ }
      }
      for (const candidate of candidates) {
        try { const value = JSON.parse(candidate); if (value.access_token) return value.access_token; } catch { /* Next representation. */ }
      }
      return undefined;
    }
    let token: string | undefined;
    for (const key of Object.keys(localStorage)) {
      if (key.includes("auth-token")) token ||= parse(localStorage.getItem(key) ?? "");
    }
    const groups: Record<string, Array<[string, string]>> = {};
    for (const cookie of document.cookie.split("; ")) {
      const separator = cookie.indexOf("=");
      const key = cookie.slice(0, separator);
      if (!key.includes("auth-token")) continue;
      (groups[key.replace(/\.\d+$/, "")] ||= []).push([key, cookie.slice(separator + 1)]);
    }
    for (const parts of Object.values(groups)) token ||= parse(parts.sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).join(""));
    if (!token) throw new Error("BLOCKED: browser auth session unavailable");
    const response = await fetch(`${url}/${path}`, {
      method,
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`QA request ${method} failed: ${response.status}`);
    const raw = await response.text();
    return raw ? JSON.parse(raw) : null;
  }, { url: qaEnv("VITE_SUPABASE_URL").replace(/\/$/, ""), anonKey: qaEnv("VITE_SUPABASE_ANON_KEY"), path, method, body });
}

export async function login(page: Page, baseURL: string): Promise<void> {
  await page.goto(`${baseURL}/editor`);
  const email = page.getByLabel("Correo electrónico");
  await expect(email.or(page.getByRole("button", { name: "Guardar borrador", exact: true }).first())).toBeVisible({ timeout: 45_000 });
  if (await email.isVisible()) {
    await email.fill(qaEnv("QA_EMAIL"));
    await page.getByLabel("Contraseña").fill(qaEnv("QA_PASSWORD"));
    await page.getByRole("button", { name: "Entrar al editor" }).click();
  }
  await expect(page.getByRole("button", { name: "Guardar borrador", exact: true }).first()).toBeVisible({ timeout: 45_000 });
  const user = (await qaRequest(page, "auth/v1/user")) as QaRecord;
  expect(user.id).toBe(QA_USER_ID);
}

export async function snapshot(page: Page): Promise<QaSnapshot> {
  const profiles = await qaRequest(page, `rest/v1/profiles?select=*&user_id=eq.${QA_USER_ID}`) as QaRecord[];
  expect(profiles.map((profile) => profile.id)).toEqual([QA_PROFILE_ID]);
  const profile = profiles[0]!;
  expect(profile.slug).toBe(QA_SLUG);
  expect(profile.user_id).toBe(QA_USER_ID);
  const links = await qaRequest(page, `rest/v1/profile_links?select=*&profile_id=eq.${QA_PROFILE_ID}&order=sort_order.asc,id.asc`) as QaRecord[];
  return { profile, links };
}

export function captureBaseline(value: QaSnapshot): void {
  const baselinePath = resolve("logs/phase6-unblock/NEW_BASELINE_SNAPSHOT.json");
  if (existsSync(baselinePath)) {
    const existing = JSON.parse(readFileSync(baselinePath, "utf8")) as QaSnapshot;
    sameStoredData(value, existing);
    return;
  }

  mkdirSync(resolve("logs/phase6-unblock"), { recursive: true });
  // Durable recovery artifact: no browser cookies, tokens or credentials.
  // A subsequent run must match this snapshot rather than overwrite it.
  writeFileSync(baselinePath, JSON.stringify(value, null, 2), { flag: "wx" });
}

export function sameStoredData(actual: QaSnapshot, expected: QaSnapshot): void {
  const withoutClock = ({ updated_at: _updated, ...record }: QaRecord) => record;
  expect(withoutClock(actual.profile)).toEqual(withoutClock(expected.profile));
  expect(actual.links.map(withoutClock)).toEqual(expected.links.map(withoutClock));
}

export async function restoreBaseline(page: Page, baseline: QaSnapshot): Promise<void> {
  await snapshot(page); // Re-check the authenticated owner and exact target before writes.
  const { profile } = baseline;
  expect(profile.id).toBe(QA_PROFILE_ID);
  expect(profile.user_id).toBe(QA_USER_ID);
  await qaRequest(page, `rest/v1/profiles?id=eq.${QA_PROFILE_ID}&user_id=eq.${QA_USER_ID}`, "PATCH", {
    display_name: profile.display_name, profession: profile.profession, bio: profile.bio,
    published: profile.published, template_config: profile.template_config,
  });
  const current = await snapshot(page);
  const baselineIds = new Set(baseline.links.map((link) => link.id));
  for (const link of current.links) {
    if (!baselineIds.has(link.id)) await qaRequest(page, `rest/v1/profile_links?id=eq.${link.id}&profile_id=eq.${QA_PROFILE_ID}`, "DELETE");
  }
  // No baseline links are edited by this harness. Missing/changed links fail loudly.
  sameStoredData(await snapshot(page), baseline);
  console.log("[Phase6] BASELINE_RESTORED=YES non-QA-writes=NO duplicate-profiles=NO");
}
