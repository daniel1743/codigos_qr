import { Images, Link as LinkIcon, Lock, Palette, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import "./mobile-bottom-navbar.css";

export type BasicEditorSectionId = "profile" | "links" | "appearance" | "gallery";

type MobileNavItem = {
  id: BasicEditorSectionId;
  label: string;
  icon: LucideIcon;
};

const NAV_ITEMS: MobileNavItem[] = [
  { id: "profile", label: "Perfil", icon: UserCircle },
  { id: "links", label: "Enlaces", icon: LinkIcon },
  { id: "appearance", label: "Diseño", icon: Palette },
  { id: "gallery", label: "Galería", icon: Images },
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

          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onClick={() => onSectionChange(item.id)}
              className={`mobile-bottom-navbar__item${isActive ? " is-active" : ""}`}
            >
              <span className="mobile-bottom-navbar__icon">
                <Icon aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </Button>
          );
        })}
        <Link
          to="/encrypted-documents"
          aria-label="Cifrados"
          className="mobile-bottom-navbar__item mobile-bottom-navbar__link"
        >
          <span className="mobile-bottom-navbar__icon">
            <Lock aria-hidden="true" />
          </span>
          <span>Cifrados</span>
        </Link>
      </div>
    </nav>
  );
}
