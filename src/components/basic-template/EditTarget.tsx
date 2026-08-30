import { useCallback } from "react";
import type { ReactNode } from "react";
import type { EditTargetRegistry } from "@/types/basic-templates";

interface EditableTargetProps {
  id: string;
  registry?: EditTargetRegistry | undefined;
  active?: boolean;
  className?: string;
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
  children,
}: EditableTargetProps) {
  const ref = useCallback(
    (element: HTMLDivElement | null) => registry?.register(id, element),
    [id, registry],
  );

  return (
    <div
      ref={ref}
      data-edit-target={id}
      className={className}
      style={
        active
          ? {
              outline: "2px solid color-mix(in srgb, #d946ef 68%, white)",
              outlineOffset: "3px",
              borderRadius: "12px",
              transition: "outline-color 180ms ease-out",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
