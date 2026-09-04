/**
 * V1.5.1 — advanced design axis application.
 *
 * Connects the family-safe Design Axis Registry (design-axes.ts) and the
 * advanced palette bank (palettes-extended.ts) to advanced generation.
 *
 * Rules:
 *  - only values explicitly allowed for the resolved family are applied;
 *  - the selection is applied BEFORE user overrides and BEFORE compatibility,
 *    so explicit/locked user preferences and renderer capabilities always win;
 *  - baseline generation never supplies a selection, so V1 output is unchanged.
 */

import { isAllowedAxisValue } from "./design-axes";
import { isPaletteAccessible } from "./palettes-extended";
import type {
  AdvancedSelectionV1,
  FamilyId,
  RecipeDesign,
} from "./types";

/** Applies only family-legal, contrast-safe values. Returns applied axis ids. */
export function applyAdvancedSelection(
  design: RecipeDesign,
  family: FamilyId,
  selection: AdvancedSelectionV1 | undefined,
): string[] {
  if (!selection || typeof selection !== "object") return [];
  const applied: string[] = [];
  const axes = selection.axes ?? {};

  const allow = (axis: string, value: string | undefined): boolean =>
    typeof value === "string" && isAllowedAxisValue(family, axis as never, value);

  if (allow("radius", axes.radius)) {
    design.geometry.radius = axes.radius!;
    design.button.shape = axes.radius!;
    applied.push("axis:radius");
  }
  if (allow("border_style", axes.border_style)) {
    design.geometry.border_style = axes.border_style!;
    applied.push("axis:border_style");
  }
  if (allow("background_type", axes.background_type)) {
    const type = axes.background_type!;
    const p = design.palette;
    design.background =
      type === "linear-gradient"
        ? { type, value: { kind: "linear", angle: 180, from: p.background, to: p.surface } }
        : type === "radial-gradient"
          ? { type, value: { kind: "radial", position: "top", from: p.surface, to: p.background } }
          : { type: "solid", value: { kind: "solid", color: p.background } };
    applied.push("axis:background_type");
  }
  if (allow("avatar_shape", axes.avatar_shape)) {
    design.avatar.shape = axes.avatar_shape!;
    applied.push("axis:avatar_shape");
  }
  if (allow("avatar_ring", axes.avatar_ring)) {
    design.avatar.ring = axes.avatar_ring!;
    applied.push("axis:avatar_ring");
  }
  if (allow("button_style", axes.button_style)) {
    design.button.style = axes.button_style!;
    applied.push("axis:button_style");
  }
  if (allow("button_icon_position", axes.button_icon_position)) {
    design.button.icon_position = axes.button_icon_position!;
    applied.push("axis:button_icon_position");
  }
  if (allow("card_style", axes.card_style)) {
    design.card.style = axes.card_style!;
    applied.push("axis:card_style");
  }
  if (allow("card_action_style", axes.card_action_style)) {
    design.card.action_style = axes.card_action_style!;
    applied.push("axis:card_action_style");
  }
  if (allow("heading_scale", axes.heading_scale)) {
    design.typography.heading_scale = axes.heading_scale!;
    applied.push("axis:heading_scale");
  }
  if (allow("body_scale", axes.body_scale)) {
    design.typography.body_scale = axes.body_scale!;
    applied.push("axis:body_scale");
  }
  if (allow("spacing_rhythm", axes.spacing_rhythm)) {
    const rhythm = axes.spacing_rhythm!;
    design.spacing.section_gap = rhythm;
    design.spacing.item_gap = rhythm === "spacious" ? "balanced" : rhythm;
    // 320px viability: horizontal padding is never compact.
    design.spacing.horizontal_padding = rhythm === "compact" ? "balanced" : rhythm;
    applied.push("axis:spacing_rhythm");
  }

  if (selection.palette && isPaletteAccessible(selection.palette)) {
    design.palette = { ...selection.palette };
    // Keep any solid background in sync with the new palette.
    if (design.background.type === "solid") {
      design.background = {
        type: "solid",
        value: { kind: "solid", color: design.palette.background },
      };
    } else if (design.background.value.kind === "linear") {
      design.background = {
        type: "linear-gradient",
        value: {
          kind: "linear",
          angle: design.background.value.angle,
          from: design.palette.background,
          to: design.palette.surface,
        },
      };
    } else if (design.background.value.kind === "radial") {
      design.background = {
        type: "radial-gradient",
        value: {
          kind: "radial",
          position: design.background.value.position,
          from: design.palette.surface,
          to: design.palette.background,
        },
      };
    }
    applied.push("axis:palette");
  }

  return applied;
}
