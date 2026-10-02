import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(ROOT, file), "utf8");

describe("internal route protection contract", () => {
  it("keeps authenticated routes behind the shared guard", () => {
    expect(read("src/routes/onboarding-preview.tsx")).toContain(
      '<ProtectedRoute access="authenticated">',
    );
    expect(read("src/routes/power-editor.tsx")).toContain(
      '<ProtectedRoute access="authenticated">',
    );
  });

  it("keeps admin-only routes behind the admin guard", () => {
    expect(read("src/routes/internal.power-editor.tsx")).toContain(
      '<ProtectedRoute access="admin">',
    );
    expect(read("src/routes/template-lab.tsx")).toContain(
      '<ProtectedRoute access="admin">',
    );
  });

  it("keeps experimental routes unavailable outside DEV", () => {
    for (const file of [
      "src/routes/labs.magic-editor.tsx",
      "src/routes/onboarding-test.tsx",
      "src/routes/pages.$pageId.edit-prototype.tsx",
      "src/routes/pages.$pageId.fuxion-demo.tsx",
    ]) {
      expect(read(file)).toContain("if (!import.meta.env.DEV) throw notFound();");
    }
  });

  it("does not broaden canonical editor or catalog routes", () => {
    expect(read("src/routes/pages.$pageId.edit.tsx")).not.toContain(
      "ProtectedRoute",
    );
    expect(read("src/routes/pages.$pageId.catalog.tsx")).not.toContain(
      "ProtectedRoute",
    );
  });
});
