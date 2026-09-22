// QA-only runtime verification of the restored billing persistence.
// Uses the service-role key internally; never prints secrets.
// Verifies table presence + claim_billing_event idempotency, then cleans up.
const fs = require("fs");
const path = require("path");

const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const base = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error("MISSING_ENV");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const suffix = Date.now();
const provider = "stripe";
const e1 = `qa-restore-claim-${suffix}`;
const e2 = `qa-restore-claim-${suffix}-b`;

async function rpc(name, params) {
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  return { status: res.status, body: await res.text() };
}
async function tableHead(table) {
  const res = await fetch(`${base}/rest/v1/${table}?select=id&limit=0`, { headers });
  return res.status;
}
async function delEvent(eventId) {
  const res = await fetch(
    `${base}/rest/v1/billing_events?provider=eq.${provider}&event_id=eq.${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers },
  );
  return res.status;
}

(async () => {
  console.log("=== TABLE PRESENCE (service_role HEAD) ===");
  for (const t of [
    "billing_customers",
    "billing_subscriptions",
    "billing_checkouts",
    "billing_events",
  ]) {
    console.log(`${t}: HTTP ${await tableHead(t)}`);
  }

  console.log("=== claim_billing_event idempotency ===");
  const results = {};
  try {
    const c1 = await rpc("claim_billing_event", { p_provider: provider, p_event_id: e1 });
    results.first = { status: c1.status, body: c1.body };
    console.log(`first claim      : HTTP ${c1.status} -> ${c1.body}`);

    const c2 = await rpc("claim_billing_event", { p_provider: provider, p_event_id: e1 });
    results.duplicate = { status: c2.status, body: c2.body };
    console.log(`duplicate claim  : HTTP ${c2.status} -> ${c2.body}`);

    const c3 = await rpc("claim_billing_event", { p_provider: provider, p_event_id: e2 });
    results.different = { status: c3.status, body: c3.body };
    console.log(`different event  : HTTP ${c3.status} -> ${c3.body}`);
  } finally {
    console.log("=== CLEANUP ===");
    console.log(`delete ${e1}: HTTP ${await delEvent(e1)}`);
    console.log(`delete ${e2}: HTTP ${await delEvent(e2)}`);
  }
})().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
