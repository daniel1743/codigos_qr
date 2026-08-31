import { Images, Link as LinkIcon, Palette, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { BasicEditorSectionId } from "./MobileBottomNavbar";

type DesktopNavItem = {
  id: BasicEditorSectionId;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: DesktopNavItem[] = [
  { id: "profile", label: "Perfil", icon: UserCircle },
  { id: "links", label: "Enlaces", icon: LinkIcon },
  { id: "appearance", label: "Diseño", icon: Palette },
  { id: "gallery", label: "Galería", icon: Images },
];

interface DesktopSectionNavProps {
  activeSection: BasicEditorSectionId;
  onSectionChange: (section: BasicEditorSectionId) => void;
}

export function DesktopSectionNav({ activeSection, onSectionChange }: DesktopSectionNavProps) {
  return (
    <nav
      className="flex w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Navegación del editor básico"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onSectionChange(item.id)}
            className={`h-10 shrink-0 gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-[#1d1d1b] text-[#fffefa] hover:bg-[#343432] hover:text-[#fffefa]"
                : "text-stone-500 hover:bg-stone-100 hover:text-[#1d1d1b]"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
