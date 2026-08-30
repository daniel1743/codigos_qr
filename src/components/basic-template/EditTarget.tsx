import { useCallback } from "react";
import type { ReactNode } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import type { EditTargetRegistry } from "@/types/basic-templates";

interface EditableTargetProps {
  id: string;
  registry?: EditTargetRegistry | undefined;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Small, renderer-agnostic bridge between a control and its visual output.
 * It does not change template data or geometry; the outline only exists while
 * the Template Lab is actively focusing an element.
 */
export function EditableTarget({
  id,
  registry,
  active = false,
  className,
  style,
  children,
}: EditableTargetProps) {
  const ref = useCallback(
    (element: HTMLDivElement | null) => registry?.register(id, element),
    [id, registry],
  );

  const select = (event: MouseEvent<HTMLDivElement>) => {
    if (!registry?.select) return;
    event.preventDefault();
    registry.select(id);
  };

  const selectWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!registry?.select || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    registry.select(id);
  };

  return (
    <div
      ref={ref}
      data-edit-target={id}
      role={registry?.select ? "button" : undefined}
      tabIndex={registry?.select ? 0 : undefined}
      onClickCapture={select}
      onKeyDown={selectWithKeyboard}
      className={className}
      style={{
        ...style,
        ...(active
          ? {
              outline: "2px solid color-mix(in srgb, #d946ef 68%, white)",
              outlineOffset: "3px",
              borderRadius: "12px",
              transition: "outline-color 180ms ease-out",
            }
          : undefined),
      }}
    >
      {children}
    </div>
  );
}
