/**
 * CA-5 — action security matrix. No provider, no network, no UI.
 */
import { describe, expect, it } from "vitest";

import type { AdvisorResponse } from "../../advisor/response";
import {
  ALLOWED_DESTINATIONS,
  EXECUTABLE_NAVIGATION_DESTINATIONS,
  validateDescriptor,
  type ActionDescriptor,
} from "../registry";
import {
  resolveAdvisorAction,
  revalidateDescriptor,
  revalidateExecutableAction,
  type ActionContext,
} from "../policy";

const grounded = (patch: Partial<AdvisorResponse> = {}): AdvisorResponse => ({
  reply: "CRIPQER reúne tus enlaces en una página con QR.",
  detected_intents: ["DISCOVERY"],
  relevant_capability_ids: ["tarjetas_bio"],
  suggested_action: "EXPLAIN",
  confidence: 0.8,
  limitations: [],
  grounding_status: "GROUNDED",
  ...patch,
});

const verifiedEvidence: ActionContext["integrationEvidence"] = {
  guestEditor: {
    route: "/crear-tarjeta",
    verified: true,
    verified_at: "2026-10-14T12:00:00.000Z",
    environment: "preview",
    evidence_ref: "evidence-conversion-advisor-ca5/guest-editor.json",
  },
};

const NOW = new Date("2026-10-14T18:00:00.000Z");

describe("CA5_6 — informational actions", () => {
  it("EXPLAIN_FEATURE with a verified capability is ALLOWED", () => {
    const decision = resolveAdvisorAction(grounded(), { now: NOW });
    expect(decision.status).toBe("ALLOWED");
    expect(decision.descriptor.action_id).toBe("EXPLAIN_FEATURE");
    expect(decision.descriptor.destination_id).toBeNull();
  });

  it("EXPLAIN_FREE_PREMIUM uses the registry's own label — never model text, never a price", () => {
    const decision = resolveAdvisorAction(
      grounded({
        detected_intents: ["PRICING"],
        suggested_action: "EXPLAIN",
        relevant_capability_ids: ["plan_free"],
      }),
      { now: NOW },
    );
    expect(decision.descriptor.action_id).toBe("EXPLAIN_FREE_PREMIUM");
    expect(decision.descriptor.label).toBe("Comparar plan gratuito y de pago");
    expect(decision.descriptor.label).not.toMatch(/\d/);
  });

  it("OFFER_HELP resolves to the ONE executable action, with the registry's destination", () => {
    const decision = resolveAdvisorAction(
      grounded({ suggested_action: "OFFER_HELP", relevant_capability_ids: ["magic_editor"] }),
      { now: NOW },
    );
    expect(decision.status).toBe("ALLOWED");
    expect(decision.descriptor.action_id).toBe("OPEN_HELP");
    expect(decision.descriptor.action_type).toBe("NAVIGATION_INTENT");
    expect(decision.descriptor.destination_id).toBe("/help");
    expect(decision.reason_code).toBe("INTERNAL_NAVIGATION_ALLOWED");
  });

  it("keeps SHOW_EDITOR_HELP informational if a descriptor ever names it", () => {
    // The informational entry remains in the registry for the descriptors that
    // already reference it, but it is not executable: the revalidator refuses.
    const informational: ActionDescriptor = {
      action_id: "SHOW_EDITOR_HELP",
      action_type: "INFORMATION",
      status: "ALLOWED",
      label: "Ver ayuda del editor",
      capability_ids: [],
      destination_id: null,
      reason_code: "INFORMATION_ONLY",
    };
    expect(validateDescriptor(informational).ok).toBe(true);
    expect(revalidateExecutableAction(informational).ok).toBe(false);
  });

  it("a capability that is not sellable blocks every action", () => {
    const decision = resolveAdvisorAction(
      grounded({ relevant_capability_ids: ["dominio_personalizado"] }),
      { now: NOW },
    );
    expect(decision.status).toBe("DENIED");
    expect(decision.reason_code).toMatch(/CAPABILITY_NOT_SELLABLE/);
  });

  it("an unknown capability id blocks every action", () => {
    const decision = resolveAdvisorAction(
      grounded({ relevant_capability_ids: ["invented_feature"] }),
      { now: NOW },
    );
    expect(decision.reason_code).toMatch(/UNKNOWN_CAPABILITY/);
  });
});

describe("CA5_6 — template preview", () => {
  const context: ActionContext = {
    now: NOW,
    surfaceFlags: { advisorTemplatePreview: true },
    knownTemplateIds: ["bio-v1", "portfolio-v2"],
  };

  it("a known template with a compatible surface is ALLOWED", () => {
    const decision = resolveAdvisorAction(
      grounded({ suggested_action: "SUGGEST_FEATURE", relevant_capability_ids: ["tarjetas_bio"] }),
      { ...context, requestedTemplateId: "bio-v1" },
    );
    expect(decision.status).toBe("ALLOWED");
    expect(decision.descriptor.verified_template_id).toBe("bio-v1");
  });

  it("an unknown template id is DENIED", () => {
    const decision = resolveAdvisorAction(grounded({ suggested_action: "SUGGEST_FEATURE" }), {
      ...context,
      requestedTemplateId: "plantilla-inventada",
    });
    expect(decision.status).toBe("DENIED");
    expect(decision.reason_code).toBe("UNKNOWN_TEMPLATE");
  });

  it("a surface that cannot verify templates gets NEEDS_VERIFICATION, not an assumption", () => {
    const decision = resolveAdvisorAction(grounded({ suggested_action: "SUGGEST_FEATURE" }), {
      now: NOW,
      surfaceFlags: { advisorTemplatePreview: true },
      requestedTemplateId: "bio-v1",
    });
    expect(decision.status).toBe("NEEDS_VERIFICATION");
  });
});

describe("CA5_6 — the Guest Editor gate", () => {
  const askEditor = () =>
    grounded({
      detected_intents: ["START_CREATION"],
      suggested_action: "OFFER_GUEST_EDITOR",
      relevant_capability_ids: ["crear_pagina"],
    });

  it("unverified integration → NEEDS_VERIFICATION (never a broken button)", () => {
    const decision = resolveAdvisorAction(askEditor(), {
      now: NOW,
      surfaceFlags: { advisorGuestEditor: true },
    });
    expect(decision.status).toBe("NEEDS_VERIFICATION");
    expect(decision.reason_code).toBe("EVIDENCE_MISSING");
  });

  it("evidence that exists but is not verified → NEEDS_VERIFICATION", () => {
    const decision = resolveAdvisorAction(askEditor(), {
      now: NOW,
      surfaceFlags: { advisorGuestEditor: true },
      integrationEvidence: { guestEditor: { ...verifiedEvidence.guestEditor, verified: false } },
    });
    expect(decision.status).toBe("NEEDS_VERIFICATION");
    expect(decision.reason_code).toBe("EVIDENCE_NOT_VERIFIED");
  });

  it("expired evidence requires re-verification", () => {
    const decision = resolveAdvisorAction(askEditor(), {
      now: NOW,
      surfaceFlags: { advisorGuestEditor: true },
      integrationEvidence: {
        guestEditor: { ...verifiedEvidence.guestEditor, verified_at: "2026-08-01T00:00:00.000Z" },
      },
    });
    expect(decision.status).toBe("NEEDS_VERIFICATION");
    expect(decision.reason_code).toBe("EVIDENCE_EXPIRED");
  });

  it("evidence pointing at another route is refused", () => {
    const decision = resolveAdvisorAction(askEditor(), {
      now: NOW,
      surfaceFlags: { advisorGuestEditor: true },
      integrationEvidence: {
        guestEditor: { ...verifiedEvidence.guestEditor, route: "/otra-ruta" },
      },
    });
    expect(decision.status).toBe("NEEDS_VERIFICATION");
    expect(decision.reason_code).toBe("ROUTE_MISMATCH");
  });

  it("verified evidence produces an ALLOWED descriptor — and nothing navigates", () => {
    const decision = resolveAdvisorAction(askEditor(), {
      now: NOW,
      surfaceFlags: { advisorGuestEditor: true },
      integrationEvidence: verifiedEvidence,
    });
    expect(decision.status).toBe("ALLOWED");
    expect(decision.descriptor.destination_id).toBe("/crear-tarjeta");
    // The descriptor is data: no callback, no URL, no executable field.
    expect(JSON.stringify(decision.descriptor)).not.toMatch(/onClick|function|=>/);
  });

  it("a disabled flag blocks even with perfect evidence", () => {
    const decision = resolveAdvisorAction(askEditor(), {
      now: NOW,
      surfaceFlags: { advisorGuestEditor: false },
      integrationEvidence: verifiedEvidence,
    });
    expect(decision.status).toBe("UNAVAILABLE");
    expect(decision.reason_code).toBe("FLAG_DISABLED");
  });
});

describe("CA10B — the ONE executable navigation action", () => {
  const offerHelp = (patch: Partial<AdvisorResponse> = {}) =>
    grounded({ suggested_action: "OFFER_HELP", relevant_capability_ids: ["tarjetas_bio"], ...patch });

  const canonical = (): ActionDescriptor => {
    const decision = resolveAdvisorAction(offerHelp());
    if (decision.status !== "ALLOWED") throw new Error("fixture must resolve");
    return decision.descriptor;
  };

  it("keeps the EXECUTABLE allowlist at exactly /help, stricter than the named one", () => {
    // The two permissions are different on purpose: `/crear-tarjeta` may be
    // NAMED in a descriptor (for the Guest Editor's conditional flow) but may
    // never be executed by CA-10B's navigation action.
    expect(EXECUTABLE_NAVIGATION_DESTINATIONS).toEqual(["/help"]);
    expect(ALLOWED_DESTINATIONS).toContain("/crear-tarjeta");
    expect(ALLOWED_DESTINATIONS).toContain("/help");
  });

  it("the registry's descriptor is exactly OPEN_HELP → NAVIGATION_INTENT → /help", () => {
    const descriptor = canonical();
    expect(descriptor.action_id).toBe("OPEN_HELP");
    expect(descriptor.action_type).toBe("NAVIGATION_INTENT");
    expect(descriptor.status).toBe("ALLOWED");
    expect(descriptor.destination_id).toBe("/help");
    expect(validateDescriptor(descriptor).ok).toBe(true);
    expect(revalidateExecutableAction(descriptor)).toEqual({ ok: true, problems: [] });
  });

  it("resolves without any clock: navigation is not time-gated", () => {
    // Deliberately NO `now` in the context. The Guest Editor branch reads the
    // clock to age its evidence; OPEN_HELP must not, or a projection would stop
    // being clock-free.
    const decision = resolveAdvisorAction(offerHelp());
    expect(decision.status).toBe("ALLOWED");
    expect(decision.descriptor.destination_id).toBe("/help");
  });

  it("rejects every tampered destination", () => {
    for (const destination of [
      "/pages",
      "https://example.com",
      "http://example.com/help",
      "//evil.test/help",
      "javascript:alert(1)",
      "data:text/html,x",
      "blob:https://evil.test/x",
      "../help",
      "/%2e%2e/help",
      "/help?next=https://evil.test",
      "/help#//evil.test",
    ]) {
      expect(revalidateExecutableAction({ ...canonical(), destination_id: destination }).ok, destination).toBe(false);
    }
  });

  it("rejects a tampered kind, a tampered id and a null destination", () => {
    expect(revalidateExecutableAction({ ...canonical(), action_type: "INFORMATION" }).ok).toBe(false);
    expect(revalidateExecutableAction({ ...canonical(), action_id: "SHOW_EDITOR_HELP" }).ok).toBe(false);
    expect(revalidateExecutableAction({ ...canonical(), destination_id: null }).ok).toBe(false);
  });

  it("model text cannot move the destination", () => {
    // A reply full of URLs, and a capability id the model chose: the resolved
    // descriptor still carries the registry's `/help`, never anything the reply
    // said. `AdvisorResponse` has no destination field at all.
    const decision = resolveAdvisorAction(
      offerHelp({
        reply: "Abre https://evil.test/help, o ve a /pages, o usa javascript:alert(1).",
      }),
    );
    expect(decision.status).toBe("ALLOWED");
    expect(decision.descriptor.destination_id).toBe("/help");
    expect(JSON.stringify(decision.descriptor)).not.toContain("evil.test");
    expect(JSON.stringify(decision.descriptor)).not.toContain("/pages");
  });
});

describe("CA5_6 — fallback and privilege boundaries", () => {
  it("a FALLBACK advisor response yields no action", () => {
    const decision = resolveAdvisorAction(grounded({ grounding_status: "FALLBACK" }), { now: NOW });
    expect(decision.status).toBe("DENIED");
    expect(decision.reason_code).toBe("ADVISOR_NOT_GROUNDED");
    expect(decision.descriptor.action_id).toBe("NONE");
  });

  it("neither the visitor nor the model can enable the editor by asking", () => {
    // The only enabling inputs live in `context`, which the server owns: a
    // response that *claims* readiness changes nothing.
    const claiming = grounded({
      detected_intents: ["START_CREATION"],
      suggested_action: "OFFER_GUEST_EDITOR",
      relevant_capability_ids: ["crear_pagina"],
      reply: "Ya activé el editor para ti y abrí tu tarjeta.",
    });
    const decision = resolveAdvisorAction(claiming, { now: NOW });
    expect(decision.status).not.toBe("ALLOWED");
    expect(decision.descriptor.destination_id).toBeNull();
  });

  it("malicious destinations are rejected by the descriptor validator", () => {
    const base: ActionDescriptor = {
      action_id: "OFFER_GUEST_EDITOR",
      action_type: "NAVIGATION_INTENT",
      status: "ALLOWED",
      label: "Empezar gratis",
      capability_ids: ["crear_pagina"],
      destination_id: "/crear-tarjeta",
      reason_code: "INTEGRATION_VERIFIED",
    };
    for (const destination of [
      "javascript:alert(1)",
      "//evil.test",
      "https://evil.test",
      "/../etc/passwd",
      "data:text/html,x",
      "\\windows",
    ]) {
      const verdict = validateDescriptor({ ...base, destination_id: destination });
      expect(verdict.ok, destination).toBe(false);
    }
    expect(validateDescriptor(base).ok).toBe(true);
  });

  it("malformed template ids are rejected", () => {
    const base: ActionDescriptor = {
      action_id: "SHOW_TEMPLATE_PREVIEW",
      action_type: "UI_INTENT",
      status: "ALLOWED",
      label: "Ver una plantilla",
      capability_ids: [],
      destination_id: null,
      reason_code: "TEMPLATE_VERIFIED",
      verified_template_id: "bio-v1",
    };
    for (const id of ["../../secret", "javascript:x", "Bio V1", "a".repeat(80)]) {
      expect(validateDescriptor({ ...base, verified_template_id: id }).ok, id).toBe(false);
    }
    expect(validateDescriptor(base).ok).toBe(true);
  });

  it("revalidation is available and agrees with the first pass", () => {
    const decision = resolveAdvisorAction(grounded(), { now: NOW });
    expect(revalidateDescriptor(decision.descriptor)).toEqual({ ok: true, problems: [] });
  });
});

describe("CA5_6 — the descriptor is data, and the module cannot mutate anything", () => {
  it("carries only the declared fields, all of them plain data", () => {
    const decision = resolveAdvisorAction(grounded(), { now: NOW });
    const keys = Object.keys(decision.descriptor).sort();
    expect(keys).toEqual(
      [
        "action_id",
        "action_type",
        "capability_ids",
        "destination_id",
        "label",
        "reason_code",
        "status",
      ].sort(),
    );
    for (const value of Object.values(decision.descriptor)) {
      const kind = Array.isArray(value) ? "array" : typeof value;
      expect(["string", "object", "array"]).toContain(kind);
    }
  });

  it("exposes no side-effecting entry point at all", async () => {
    const module = await import("../policy");
    // The surface is exactly: the resolver, the two revalidators, one notice and
    // the default. There is no client, no fetch, no write, no navigation.
    expect(Object.keys(module).sort()).toEqual(
      [
        "DEFAULT_MAX_EVIDENCE_AGE_DAYS",
        "EXPLAIN_ONLY_NOTICE",
        "revalidateDescriptor",
        "revalidateExecutableAction",
        "resolveAdvisorAction",
      ].sort(),
    );
  });
});
