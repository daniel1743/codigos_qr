import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Edit3, Image as ImageIcon, Type, Palette, Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { parseEditorTarget } from "../../hooks/useTouchGesture";

interface FloatingContextToolbarProps {
  selectedTarget: string | null;
  onActionClick: (action: string) => void;
  visible: boolean;
}

interface ToolbarPosition {
  top?: number;
  bottom?: number;
  left: number;
  right: number;
}

/**
 * Floating Context Toolbar - Premium Mobile UX
 *
 * Rules:
 * - Default state: HIDDEN
 * - Shows ONLY when an editable element is selected
 * - Position: Dynamic (near selected element, like Canva)
 * - Touch targets: 48px+ (generous, zero friction)
 * - Hides when: tap outside, selection cleared, sheet closes
 */
export function FloatingContextToolbar({
  selectedTarget,
  onActionClick,
  visible,
}: FloatingContextToolbarProps) {
  const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>({
    left: 12,
    right: 12,
    bottom: 80,
  });

  // Calculate dynamic position near selected element
  useEffect(() => {
    if (!visible || !selectedTarget) return;

    const calculatePosition = () => {
      const element = document.querySelector(`[data-editor-target="${selectedTarget}"]`);
      if (!element) {
        // Fallback to fixed bottom
        setToolbarPosition({ left: 12, right: 12, bottom: 80 });
        return;
      }

      const rect = element.getBoundingClientRect();
      const toolbarHeight = 68; // Estimated height with new generous size
      const safeArea = {
        top: 16,
        bottom: 88, // Navigation (72) + padding (16)
        left: 12,
        right: 12,
      };

      const spaceAbove = rect.top - safeArea.top;
      const spaceBelow = window.innerHeight - rect.bottom - safeArea.bottom;

      let position: ToolbarPosition;

      // Preference: Above element (like Canva)
      if (spaceAbove > toolbarHeight + 16) {
        position = {
          bottom: window.innerHeight - rect.top + 8,
          left: safeArea.left,
          right: safeArea.right,
        };
      }
      // Second preference: Below element
      else if (spaceBelow > toolbarHeight + 16) {
        position = {
          top: rect.bottom + 8,
          left: safeArea.left,
          right: safeArea.right,
        };
      }
      // Fallback: Fixed bottom
      else {
        position = {
          bottom: safeArea.bottom,
          left: safeArea.left,
          right: safeArea.right,
        };
      }

      setToolbarPosition(position);
    };

    calculatePosition();

    // Recalculate on scroll or resize
    const handleUpdate = () => calculatePosition();
    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [selectedTarget, visible]);

  if (!visible || !selectedTarget) return null;

  const { type } = parseEditorTarget(selectedTarget);

  // Determine actions based on selected element type
  const getActions = () => {
    switch (type) {
      case "profile.photo":
      case "profile.cover":
        return [
          { key: "replace", label: "Reemplazar", icon: ImageIcon },
          { key: "adjust", label: "Ajustar", icon: Edit3 },
          { key: "more", label: "Más", icon: MoreHorizontal },
        ];

      case "profile.name":
      case "profile.bio":
        return [
          { key: "edit", label: "Editar", icon: Edit3 },
          { key: "font", label: "Fuente", icon: Type },
          { key: "color", label: "Color", icon: Palette },
          { key: "more", label: "Más", icon: MoreHorizontal },
        ];

      case "link":
        return [
          { key: "edit", label: "Texto", icon: Edit3 },
          { key: "url", label: "URL", icon: LinkIcon },
          { key: "more", label: "Más", icon: MoreHorizontal },
        ];

      case "appearance.background":
        return [
          { key: "color", label: "Color", icon: Palette },
          { key: "gradient", label: "Fondo", icon: Palette },
          { key: "more", label: "Más", icon: MoreHorizontal },
        ];

      default:
        return [
          { key: "edit", label: "Editar", icon: Edit3 },
          { key: "more", label: "Más", icon: MoreHorizontal },
        ];
    }
  };

  const actions = getActions();

  // Get label for selected element
  const getTargetLabel = () => {
    switch (type) {
      case "profile.photo":
        return "Foto de perfil";
      case "profile.cover":
        return "Portada";
      case "profile.name":
        return "Nombre";
      case "profile.bio":
        return "Biografía";
      case "link":
        return "Enlace";
      case "appearance.background":
        return "Fondo";
      default:
        return "Elemento";
    }
  };

  return (
    <div
      className="pointer-events-none fixed z-30 px-3 md:hidden"
      style={{
        top: toolbarPosition.top,
        bottom: toolbarPosition.bottom,
        left: toolbarPosition.left,
        right: toolbarPosition.right,
        animation: "fade-in-scale 250ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2.5 rounded-2xl border-2 bg-card/98 p-2.5 shadow-2xl backdrop-blur-xl">
        <div className="min-w-0 flex-1 px-2.5">
          <p className="truncate text-sm font-bold">{getTargetLabel()}</p>
          <p className="truncate text-[11px] text-muted-foreground">Toca para editar</p>
        </div>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.key}
              type="button"
              variant={action.key === "more" ? "default" : "ghost"}
              size="lg"
              className="min-h-12 min-w-12 shrink-0 rounded-xl px-4 text-sm font-semibold"
              onClick={() => onActionClick(action.key)}
            >
              <Icon className="mr-2 h-5 w-5" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
