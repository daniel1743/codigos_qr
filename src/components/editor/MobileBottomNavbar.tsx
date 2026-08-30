import { Images, Link as LinkIcon, Plus, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "../ui/button";
import "./mobile-bottom-navbar.css";

export type BasicEditorSectionId = "profile" | "links" | "appearance";

type MobileNavItem = {
  id: BasicEditorSectionId | "template";
  label: string;
  icon: LucideIcon;
  featured?: boolean;
};

const NAV_ITEMS: MobileNavItem[] = [
  { id: "profile", label: "Perfil", icon: UserCircle },
  { id: "links", label: "Enlaces", icon: LinkIcon },
  { id: "template", label: "Editor de plantilla", icon: Plus, featured: true },
  { id: "appearance", label: "Galería", icon: Images },
];

interface MobileBottomNavbarProps {
  activeSection: BasicEditorSectionId;
  onSectionChange: (section: BasicEditorSectionId) => void;
}

export function MobileBottomNavbar({ activeSection, onSectionChange }: MobileBottomNavbarProps) {
  return (
    <nav className="mobile-bottom-navbar" aria-label="Navegación móvil del editor básico">
      <div className="mobile-bottom-navbar__items">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          const handleSelect = () => {
            if (item.id === "template") {
              // El editor de plantilla básico parte de las opciones de Apariencia existentes.
              onSectionChange("appearance");
              return;
            }

            onSectionChange(item.id);
          };

          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onClick={handleSelect}
              className={`mobile-bottom-navbar__item${item.featured ? " is-featured" : ""}${
                isActive ? " is-active" : ""
              }`}
            >
              <span className="mobile-bottom-navbar__icon">
                <Icon aria-hidden="true" />
              </span>
              {!item.featured && <span>{item.label}</span>}
            </Button>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          aria-label="Mi perfil"
          className="mobile-bottom-navbar__item"
          asChild
        >
          <a href="/profile">
            <span className="mobile-bottom-navbar__icon">
              <UserCircle aria-hidden="true" />
            </span>
            <span>Mi perfil</span>
          </a>
        </Button>
      </div>
    </nav>
  );
}
