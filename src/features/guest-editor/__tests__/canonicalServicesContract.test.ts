// @vitest-environment happy-dom
/**
 * Guest Editor V1 - G7.1/G7.2 contract tests on the CANONICAL shared services.
 *
 * The persistence path must not be certified from this feature's own doubles alone: the
 * real writers are `magicPageService` / `pageQrService`, so their behaviour is pinned here
 * with a Supabase query double (no network, no production write). What is proven:
 *
 *   - every write is scoped to `owner_user_id` (the same boundary RLS enforces);
 *   - a write that matches no owned row THROWS instead of reporting success;
 *   - `saveDraft` writes only `template_config`;
 *   - `publish` bumps the revision and REFUSES to publish when the revision moved
 *     (optimistic concurrency exists for publication);
 *   - `saveDraft` has NO optimistic lock: check-then-write is a declared residual risk.
 */
import { describe, expect, it } from "vitest";
import { createInitialMagicPageDocument } from "../../magic-page-editor-production/magic-document";
import { magicPageService } from "../../../services/magic-page.service";
import { pageQrService } from "../../../services/page-qr.service";

interface RecordedOp {
  table: string;
  payload?: Record<string, unknown>;
  eqs: Array<[string, unknown]>;
  select?: string;
}

function makeClient(response: { data: unknown; error: unknown }) {
  const ops: RecordedOp[] = [];
  const query = (table: string, payload?: Record<string, unknown>) => {
    const op: RecordedOp = { table, ...(payload ? { payload } : {}), eqs: [] };
    ops.push(op);
    const chain = {
      eq(column: string, value: unknown) {
        op.eqs.push([column, value]);
        return chain;
      },
      select(columns?: string) {
        op.select = columns ?? "*";
        return chain;
      },
      maybeSingle: async () => response,
    };
    return chain;
  };
  const client = {
    from: (table: string) => ({
      update: (payload: Record<string, unknown>) => query(table, payload),
      select: (columns: string) => query(table, columns as never),
    }),
  };
  return { client: client as never, ops };
}

const PAGE_ID = "page-1";
const USER_ID = "user-1";

describe("magicPageService.saveDraft (canonical writer)", () => {
  it("writes only template_config, scoped to id + owner, and returns the re-read document", async () => {
    const document = createInitialMagicPageDocument("bio");
    const { client, ops } = makeClient({ data: { template_config: document }, error: null });

    const saved = await magicPageService.saveDraft(client, PAGE_ID, USER_ID, document);

    expect(saved).toEqual(document);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.table).toBe("pages");
    expect(Object.keys(ops[0]?.payload ?? {})).toEqual(["template_config"]);
    expect(ops[0]?.eqs).toEqual([
      ["id", PAGE_ID],
      ["owner_user_id", USER_ID],
    ]);
  });

  it("throws instead of reporting success when the page is not owned (RLS boundary)", async () => {
    const document = createInitialMagicPageDocument("bio");
    const { client } = makeClient({ data: null, error: null });

    await expect(magicPageService.saveDraft(client, PAGE_ID, USER_ID, document)).rejects.toThrow(
      /no pertenece al usuario/i,
    );
  });

  it("has NO optimistic lock: declaring check-then-write a residual risk is honest", async () => {
    const document = createInitialMagicPageDocument("bio");
    const { client, ops } = makeClient({ data: { template_config: document }, error: null });

    await magicPageService.saveDraft(client, PAGE_ID, USER_ID, document);

    const guardColumns = (ops[0]?.eqs ?? []).map(([column]) => column);
    expect(guardColumns).not.toContain("updated_at");
    expect(guardColumns).not.toContain("revision");
    expect(guardColumns).not.toContain("published_revision");
  });
});

describe("magicPageService.publish (canonical publication)", () => {
  it("bumps the revision and refuses to publish when the revision moved", async () => {
    const document = createInitialMagicPageDocument("bio");
    const { client, ops } = makeClient({ data: null, error: null });

    await expect(magicPageService.publish(client, PAGE_ID, USER_ID, document, 4)).rejects.toThrow(
      /cambió en otra sesión/i,
    );

    expect(ops[0]?.payload).toMatchObject({
      published: true,
      published_revision: 5,
    });
    expect(ops[0]?.eqs).toEqual([
      ["id", PAGE_ID],
      ["owner_user_id", USER_ID],
      ["published_revision", 4],
    ]);
  });

  it("returns the published row when the revision matches", async () => {
    const document = createInitialMagicPageDocument("bio");
    const row = { id: PAGE_ID, published: true, published_revision: 5 };
    const { client } = makeClient({ data: row, error: null });

    await expect(
      magicPageService.publish(client, PAGE_ID, USER_ID, document, 4),
    ).resolves.toMatchObject(row);
  });
});

describe("pageQrService.saveQrConfig (QR persistence)", () => {
  it("writes only qr_config, scoped to the owner, and never the canonical page fields", async () => {
    const { client, ops } = makeClient({ data: { qr_config: { fg: "#000" } }, error: null });

    await pageQrService.saveQrConfig(client, PAGE_ID, USER_ID, { fg: "#000" } as never);

    expect(Object.keys(ops[0]?.payload ?? {})).toEqual(["qr_config"]);
    expect(ops[0]?.eqs).toEqual([
      ["id", PAGE_ID],
      ["owner_user_id", USER_ID],
    ]);
  });

  it("throws when the page is not owned", async () => {
    const { client } = makeClient({ data: null, error: null });
    await expect(
      pageQrService.saveQrConfig(client, PAGE_ID, USER_ID, { fg: "#000" } as never),
    ).rejects.toThrow(/no pertenece al usuario/i);
  });
});
