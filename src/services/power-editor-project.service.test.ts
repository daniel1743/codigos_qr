import { describe, expect, it, vi } from "vitest";
import { powerEditorProjectService } from "./power-editor-project.service";

const pageConfig = {
  version: 5,
  blocks: [],
  capabilities: {},
  branding: {},
  theme: {},
  background: {},
  presets: [],
} as never;

function buildQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    order: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.maybeSingle.mockResolvedValue(result);
  query.single.mockResolvedValue(result);
  return query;
}

describe("powerEditorProjectService.saveDraft", () => {
  it("persiste sólo page_config de un proyecto propio que sigue draft o published", async () => {
    const query = buildQuery({
      data: { id: "project-1", owner_user_id: "user-1", status: "draft", page_config: pageConfig },
      error: null,
    });
    const supabase = { from: vi.fn(() => query) } as never;

    await powerEditorProjectService.saveDraft(supabase, "project-1", "user-1", pageConfig);

    expect(query.update).toHaveBeenCalledWith({ page_config: pageConfig });
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "project-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "owner_user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("status", ["draft", "published"]);
    expect(query.update.mock.calls[0][0]).not.toHaveProperty("template_id");
    expect(query.update.mock.calls[0][0]).not.toHaveProperty("profile_id");
    expect(query.update.mock.calls[0][0]).not.toHaveProperty("owner_user_id");
    expect(query.update.mock.calls[0][0]).not.toHaveProperty("status");
    expect(query.update.mock.calls[0][0]).not.toHaveProperty("published_page_config");
    expect(query.update.mock.calls[0][0]).not.toHaveProperty("published_at");
  });

  it("conserva un árbol V6 dentro de page_config y no convierte la actualización en publicación", async () => {
    const v6PageConfig = {
      ...pageConfig,
      version: 6,
      composition: {
        id: "root",
        kind: "root",
        enabled: true,
        children: [{ id: "fixed-cta", kind: "fixed", enabled: true, style: { fixed: { edge: "bottom", inset: 14, zIndex: 16, safeArea: true, reserveSpace: true } }, children: [] }],
      },
    } as never;
    const query = buildQuery({ data: { id: "project-v6", owner_user_id: "user-1", status: "draft", page_config: v6PageConfig }, error: null });
    const supabase = { from: vi.fn(() => query) } as never;

    await powerEditorProjectService.saveDraft(supabase, "project-v6", "user-1", v6PageConfig);

    const payload = query.update.mock.calls[0]?.[0] as { page_config?: { version?: number; composition?: { kind?: string } } } | undefined;
    expect(payload?.page_config).toMatchObject({ version: 6, composition: { kind: "root" } });
    expect(payload).not.toHaveProperty("published_page_config");
    expect(payload).not.toHaveProperty("status");
  });
});

describe("powerEditorProjectService.getOwnedEditableProject", () => {
  it("rechaza un proyecto archivado antes de permitir su edición", async () => {
    const projectQuery = buildQuery({
      data: {
        id: "project-1",
        owner_user_id: "user-1",
        profile_id: "profile-1",
        status: "archived",
      },
      error: null,
    });
    const supabase = { from: vi.fn(() => projectQuery) } as never;

    await expect(
      powerEditorProjectService.getOwnedEditableProject(supabase, "project-1", "user-1"),
    ).rejects.toThrow("archivado");
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("comprueba que profile_id pertenece al mismo usuario autenticado", async () => {
    const projectQuery = buildQuery({
      data: {
        id: "project-1",
        owner_user_id: "user-1",
        profile_id: "profile-1",
        status: "published",
      },
      error: null,
    });
    const profileQuery = buildQuery({ data: { id: "profile-1" }, error: null });
    const supabase = {
      from: vi.fn((table: string) =>
        table === "power_editor_projects" ? projectQuery : profileQuery,
      ),
    } as never;

    await expect(
      powerEditorProjectService.getOwnedEditableProject(supabase, "project-1", "user-1"),
    ).resolves.toMatchObject({ id: "project-1" });
    expect(supabase.from).toHaveBeenNthCalledWith(1, "power_editor_projects");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "profiles");
    expect(profileQuery.eq).toHaveBeenNthCalledWith(1, "id", "profile-1");
    expect(profileQuery.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
