/**
 * CRIPQER Analytics V1.1 — Phase C2B3 literal browser -> DB roundtrip.
 *
 * Drives a REAL Chromium browser against the QA-mode dev server whose
 * VITE_SUPABASE_URL resolves to cripqer-qa, so the canonical writer activates.
 * It loads the public QA page (emitting session_start + page_view) and clicks
 * whatever external / WhatsApp / Instagram anchors are present, capturing the
 * exact `track_analytics_event` RPC payloads the browser fires.
 */
import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:5199";
const PUBLIC_PATH = "/pg/qa-c2b2-canonical-page";

const rpcCalls = [];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Abort top-level navigation to external sites so the page stays in place
// after each click while the onClick -> RPC still fires.
await context.route("**/*", (route) => {
  const req = route.request();
  const url = req.url();
  if (req.isNavigationRequest() && !url.startsWith(BASE) && !url.includes(".supabase.co")) {
    return route.abort();
  }
  return route.continue();
});

page.on("request", (req) => {
  if (req.url().includes("/rpc/track_analytics_event")) {
    rpcCalls.push(req.postDataJSON());
  }
});

await page.goto(`${BASE}${PUBLIC_PATH}`, { waitUntil: "load", timeout: 90_000 });

// Wait for the pseudonymous session id to be created by the canonical writer.
await page.waitForFunction(() => window.sessionStorage.getItem("qr_session_id"), null, { timeout: 60_000 });
const sessionId = await page.evaluate(() => window.sessionStorage.getItem("qr_session_id"));

// Give the two initial writes a moment to land.
await page.waitForTimeout(3000);

// Dump every anchor rendered on the public page.
const anchors = await page.evaluate(() =>
  Array.from(document.querySelectorAll("a")).map((a) => ({
    href: a.getAttribute("href"),
    text: (a.textContent ?? "").trim().slice(0, 60),
  })),
);

// Click each external/social anchor by dispatching a bubbling click event.
// React's delegated onClick fires (-> onTrack -> RPC), but because the event
// is untrusted the browser does NOT follow the href, so the page stays put.
const seen = new Set();
const clicks = [];
for (const a of anchors) {
  const href = a.href ?? "";
  if (!href || href === "#" || href.startsWith(BASE)) continue;
  if (seen.has(href)) continue;
  seen.add(href);
  const result = await page.evaluate((target) => {
    const el = Array.from(document.querySelectorAll("a")).find(
      (node) => node.getAttribute("href") === target,
    );
    if (!el) return { found: false };
    // Neutralize the href before dispatching so the browser cannot navigate.
    // React's onClick reads the URL from its closure (item.ctaUrl), so the
    // tracked target stays correct.
    const original = el.getAttribute("href");
    el.setAttribute("href", "#");
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    el.setAttribute("href", original);
    return { found: true };
  }, href);
  clicks.push({ href, text: a.text, ...result });
  await page.waitForTimeout(1200);
}

await page.screenshot({ path: "qa-c2b3-browser.png", fullPage: true });

const events = rpcCalls.map((c) => ({
  eventType: c?.p_event_type,
  sessionId: c?.p_session_id,
  targetUrl: c?.p_target_url,
}));

console.log(
  JSON.stringify(
    {
      browserSessionId: sessionId,
      anchors,
      clicks,
      rpcCalls: events,
      verification: {
        session_start: events.filter((e) => e.eventType === "session_start").length,
        page_view: events.filter((e) => e.eventType === "page_view").length,
        external_link_click: events.filter((e) => e.eventType === "external_link_click").length,
        whatsapp_click: events.filter((e) => e.eventType === "whatsapp_click").length,
        instagram_click: events.filter((e) => e.eventType === "instagram_click").length,
        all_share_session_id: events.every((e) => e.sessionId === sessionId),
      },
    },
    null,
    2,
  ),
);

await browser.close();
