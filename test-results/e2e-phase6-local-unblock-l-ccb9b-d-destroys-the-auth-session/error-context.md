# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\phase6-local-unblock.spec.ts >> logout dispatches a real click and destroys the auth session
- Location: e2e\phase6-local-unblock.spec.ts:23:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/editor
Call log:
  - navigating to "http://localhost:8081/editor", waiting until "load"

```

# Test source

```ts
  1   | import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
  2   | import { resolve } from "node:path";
  3   | import { expect, type Page } from "@playwright/test";
  4   | 
  5   | export const QA_PROFILE_ID = "ff0cd302-07a4-4106-9a13-a14f9ded2f4b";
  6   | export const QA_USER_ID = "8b1f25ff-ec0a-4cf2-93e2-f67c62a5a165";
  7   | export const QA_SLUG = "qa-dual-editor-test";
  8   | // Database JSON is intentionally opaque in this test-only snapshot helper.
  9   | // eslint-disable-next-line @typescript-eslint/no-explicit-any
  10  | export type QaRecord = Record<string, any>;
  11  | export type QaSnapshot = { profile: QaRecord; links: QaRecord[] };
  12  | 
  13  | export function qaEnv(name: string): string {
  14  |   const value = process.env[name] || readFileSync(resolve(".env.local"), "utf8")
  15  |     .split(/\r?\n/)
  16  |     .find((line) => line.startsWith(`${name}=`))
  17  |     ?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "");
  18  |   if (!value) throw new Error(`BLOCKED: missing QA variable ${name}`);
  19  |   return value;
  20  | }
  21  | 
  22  | export async function qaRequest(page: Page, path: string, method = "GET", body?: unknown): Promise<QaRecord | QaRecord[]> {
  23  |   return page.evaluate(async ({ url, anonKey, path, method, body }) => {
  24  |     function parse(raw: string): string | undefined {
  25  |       const candidates = [raw, decodeURIComponent(raw)];
  26  |       for (const candidate of [...candidates]) {
  27  |         try {
  28  |           candidates.push(atob(candidate.replace(/^base64-/, "").replace(/-/g, "+").replace(/_/g, "/")));
  29  |         } catch { /* Already JSON. */ }
  30  |       }
  31  |       for (const candidate of candidates) {
  32  |         try { const value = JSON.parse(candidate); if (value.access_token) return value.access_token; } catch { /* Next representation. */ }
  33  |       }
  34  |       return undefined;
  35  |     }
  36  |     let token: string | undefined;
  37  |     for (const key of Object.keys(localStorage)) {
  38  |       if (key.includes("auth-token")) token ||= parse(localStorage.getItem(key) ?? "");
  39  |     }
  40  |     const groups: Record<string, Array<[string, string]>> = {};
  41  |     for (const cookie of document.cookie.split("; ")) {
  42  |       const separator = cookie.indexOf("=");
  43  |       const key = cookie.slice(0, separator);
  44  |       if (!key.includes("auth-token")) continue;
  45  |       (groups[key.replace(/\.\d+$/, "")] ||= []).push([key, cookie.slice(separator + 1)]);
  46  |     }
  47  |     for (const parts of Object.values(groups)) token ||= parse(parts.sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).join(""));
  48  |     if (!token) throw new Error("BLOCKED: browser auth session unavailable");
  49  |     const response = await fetch(`${url}/${path}`, {
  50  |       method,
  51  |       headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
  52  |       ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  53  |       signal: AbortSignal.timeout(20_000),
  54  |     });
  55  |     if (!response.ok) throw new Error(`QA request ${method} failed: ${response.status}`);
  56  |     const raw = await response.text();
  57  |     return raw ? JSON.parse(raw) : null;
  58  |   }, { url: qaEnv("VITE_SUPABASE_URL").replace(/\/$/, ""), anonKey: qaEnv("VITE_SUPABASE_ANON_KEY"), path, method, body });
  59  | }
  60  | 
  61  | export async function login(page: Page, baseURL: string): Promise<void> {
> 62  |   await page.goto(`${baseURL}/editor`);
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8081/editor
  63  |   const email = page.getByLabel("Correo electrónico");
  64  |   await expect(email.or(page.getByRole("button", { name: "Guardar borrador", exact: true }).first())).toBeVisible({ timeout: 45_000 });
  65  |   if (await email.isVisible()) {
  66  |     await email.fill(qaEnv("QA_EMAIL"));
  67  |     await page.getByLabel("Contraseña").fill(qaEnv("QA_PASSWORD"));
  68  |     await page.getByRole("button", { name: "Entrar al editor" }).click();
  69  |   }
  70  |   await expect(page.getByRole("button", { name: "Guardar borrador", exact: true }).first()).toBeVisible({ timeout: 45_000 });
  71  |   const user = (await qaRequest(page, "auth/v1/user")) as QaRecord;
  72  |   expect(user.id).toBe(QA_USER_ID);
  73  | }
  74  | 
  75  | export async function snapshot(page: Page): Promise<QaSnapshot> {
  76  |   const profiles = await qaRequest(page, `rest/v1/profiles?select=*&user_id=eq.${QA_USER_ID}`) as QaRecord[];
  77  |   expect(profiles.map((profile) => profile.id)).toEqual([QA_PROFILE_ID]);
  78  |   const profile = profiles[0]!;
  79  |   expect(profile.slug).toBe(QA_SLUG);
  80  |   expect(profile.user_id).toBe(QA_USER_ID);
  81  |   const links = await qaRequest(page, `rest/v1/profile_links?select=*&profile_id=eq.${QA_PROFILE_ID}&order=sort_order.asc,id.asc`) as QaRecord[];
  82  |   return { profile, links };
  83  | }
  84  | 
  85  | export function captureBaseline(value: QaSnapshot): void {
  86  |   const baselinePath = resolve("logs/phase6-unblock/NEW_BASELINE_SNAPSHOT.json");
  87  |   if (existsSync(baselinePath)) {
  88  |     const existing = JSON.parse(readFileSync(baselinePath, "utf8")) as QaSnapshot;
  89  |     sameStoredData(value, existing);
  90  |     return;
  91  |   }
  92  | 
  93  |   mkdirSync(resolve("logs/phase6-unblock"), { recursive: true });
  94  |   // Durable recovery artifact: no browser cookies, tokens or credentials.
  95  |   // A subsequent run must match this snapshot rather than overwrite it.
  96  |   writeFileSync(baselinePath, JSON.stringify(value, null, 2), { flag: "wx" });
  97  | }
  98  | 
  99  | export function sameStoredData(actual: QaSnapshot, expected: QaSnapshot): void {
  100 |   const withoutClock = ({ updated_at: _updated, ...record }: QaRecord) => record;
  101 |   expect(withoutClock(actual.profile)).toEqual(withoutClock(expected.profile));
  102 |   expect(actual.links.map(withoutClock)).toEqual(expected.links.map(withoutClock));
  103 | }
  104 | 
  105 | export async function restoreBaseline(page: Page, baseline: QaSnapshot): Promise<void> {
  106 |   await snapshot(page); // Re-check the authenticated owner and exact target before writes.
  107 |   const { profile } = baseline;
  108 |   expect(profile.id).toBe(QA_PROFILE_ID);
  109 |   expect(profile.user_id).toBe(QA_USER_ID);
  110 |   await qaRequest(page, `rest/v1/profiles?id=eq.${QA_PROFILE_ID}&user_id=eq.${QA_USER_ID}`, "PATCH", {
  111 |     display_name: profile.display_name, profession: profile.profession, bio: profile.bio,
  112 |     published: profile.published, template_config: profile.template_config,
  113 |   });
  114 |   const current = await snapshot(page);
  115 |   const baselineIds = new Set(baseline.links.map((link) => link.id));
  116 |   for (const link of current.links) {
  117 |     if (!baselineIds.has(link.id)) await qaRequest(page, `rest/v1/profile_links?id=eq.${link.id}&profile_id=eq.${QA_PROFILE_ID}`, "DELETE");
  118 |   }
  119 |   // No baseline links are edited by this harness. Missing/changed links fail loudly.
  120 |   sameStoredData(await snapshot(page), baseline);
  121 |   console.log("[Phase6] BASELINE_RESTORED=YES non-QA-writes=NO duplicate-profiles=NO");
  122 | }
  123 | 
```