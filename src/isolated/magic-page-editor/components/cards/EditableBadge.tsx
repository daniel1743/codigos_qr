import React from "react";
import { useEditor } from "../../contexts/EditorContext";
import { useThemeTokens } from "../../hooks/useThemeTokens";
import { Editable } from "../editor/Editable";
import { EditableText } from "../editor/EditableText";
import { cx } from "../../utils/cx";

export type BadgeStyle = "solid" | "soft" | "outline";

interface EditableBadgeProps {
  id: string;
  label: string;
  defaultStyle?: BadgeStyle;
  onMedia?: boolean;
  className?: string;
}

/** Small label (Nuevo, -25%, Vegano…). Tap to select; double-tap or «Texto» to type. */
export function EditableBadge({
  id,
  label,
  defaultStyle = "soft",
  onMedia = false,
  className,
}: EditableBadgeProps) {
  const { doc } = useEditor();
  const t = useThemeTokens();
  const style = (doc.props[id]?.variant as BadgeStyle) ?? defaultStyle;

  const css: React.CSSProperties =
    style === "solid"
      ? { background: t.accent, color: t.accentFg }
      : style === "outline"
        ? {
            boxShadow: "inset 0 0 0 1px currentColor",
            color: onMedia ? "#FFFFFF" : "var(--fg)",
            background: onMedia ? "rgba(12,12,11,0.4)" : "transparent",
          }
        : onMedia
          ? { background: "rgba(255,255,255,0.94)", color: "#15171C" }
          : {
              background: "var(--surface)",
              color: "var(--fg)",
              boxShadow: "0 0 0 1px var(--line)",
            };

  return (
    <Editable
      id={id}
      kind="badge"
      label="Etiqueta"
      as="span"
      data-variant={style}
      className={cx(
        "inline-flex h-6 w-fit items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold tracking-[0.02em]",
        className,
      )}
      style={css}
    >
      <EditableText id={`${id}.label`} value={label} as="span" selectable={false} />
    </Editable>
  );
}
