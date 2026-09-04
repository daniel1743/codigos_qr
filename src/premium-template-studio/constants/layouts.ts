import type { LayoutId, TemplateLayout } from "../types";

/**
 * LAYOUT EXTENSION POINT
 * Layouts are data: they describe columns/gutters/alignment per breakpoint and
 * how the header composes. The renderer reads this — never hardcodes structure.
 */

function layout(
  id: LayoutId,
  name: string,
  header: TemplateLayout["header"],
  desktopColumns: number,
  tabletColumns: number,
  align: TemplateLayout["responsive"]["desktop"]["align"] = "center",
  padding = 24,
): TemplateLayout {
  const isBento = id === "bento";
  const isGrid = id === "portfolio" || id === "split";
  return {
    id,
    name,
    header,
    type: isBento ? "bento" : isGrid ? "grid" : "stack",
    responsive: {
      desktop: { columns: isBento ? 4 : desktopColumns, gutter: 14, align, padding },
      tablet: { columns: isBento ? 2 : tabletColumns, gutter: 12, align, padding },
      mobile: { columns: 1, gutter: 12, align, padding: 18 },
    },
  };
}

export const LAYOUTS: TemplateLayout[] = [
  layout("centered", "Centered", "overlap", 1, 1, "center"),
  layout("editorial", "Editorial", "stacked", 1, 1, "left", 32),
  layout("bento", "Bento", "hero", 2, 2, "left"),
  layout("split", "Split", "inline", 2, 1, "left"),
  layout("compact", "Compact", "inline", 1, 1, "left", 18),
  layout("full-width", "Full width", "hero", 1, 1, "center", 0),
  layout("profile-card", "Profile card", "overlap", 1, 1, "center"),
  layout("portfolio", "Portfolio", "stacked", 2, 2, "left"),
  layout("executive", "Executive", "stacked", 1, 1, "left", 28),
];

export const LAYOUT_MAP: Record<string, TemplateLayout> = Object.fromEntries(
  LAYOUTS.map((l) => [l.id, l]),
);

export function getLayout(id: string): TemplateLayout {
  return LAYOUT_MAP[id] ?? LAYOUTS[0]!;
}

export const BREAKPOINT_WIDTHS = {
  desktop: 1180,
  tablet: 834,
  mobile: 390,
} as const;
