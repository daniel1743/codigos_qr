import type { CSSProperties, ReactNode } from "react";

/** Shared contextual surface for frequent canvas editing actions. */
export function ContextualEditingToolbar({
  ariaLabel,
  children,
  onClick,
  style,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}) {
  return (
    <div
      className="pts-contextual-toolbar"
      role="toolbar"
      aria-label={ariaLabel}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
