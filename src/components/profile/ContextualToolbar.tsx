import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import type { Profile, ProfileLink } from "../../types/database";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Palette,
  MoreHorizontal,
  ImageIcon,
  Trash,
  Square,
  Circle,
  GripHorizontal,
  Type,
  Image as ImageIcon2,
  CircleDashed,
} from "lucide-react";
import { PlatformPicker } from "./PlatformPicker";
import { getPlatformDef } from "../../constants/platforms";

interface ContextualToolbarProps {
  type: "title" | "bio" | "avatar" | "cover" | "background" | "link";
  linkId?: string | undefined;
  profile: Profile;
  currentLink?: Partial<ProfileLink>;
  onProfileChange?: (updates: Partial<Profile>) => void;
  onLinkChange?: (linkId: string, updates: Partial<ProfileLink>) => void;
  onOpenSidebar?: (tabId: string) => void;
  children: React.ReactNode;
}

export function ContextualToolbar({
  type,
  linkId,
  profile,
  currentLink,
  onProfileChange,
  onLinkChange,
  onOpenSidebar,
  children,
}: ContextualToolbarProps) {
  const [open, setOpen] = React.useState(false);

  const handleContentClick = (e: React.MouseEvent) => e.stopPropagation();

  // Helper for color input
  const ColorPicker = ({
    value,
    onChange,
    title,
  }: {
    value: string;
    onChange: (v: string) => void;
    title: string;
  }) => (
    <div
      className="relative w-8 h-8 rounded-md overflow-hidden border border-border/50 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
      title={title}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-[-10px] w-[50px] h-[50px] cursor-pointer"
      />
    </div>
  );

  const IconButton = ({
    icon: Icon,
    onClick,
    active,
    title,
  }: {
    icon: any;
    onClick: () => void;
    active?: boolean;
    title: string;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      className={`p-2 rounded-md transition-colors flex items-center justify-center ${active ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const renderTitleToolbar = () => (
    <>
      <IconButton
        icon={AlignLeft}
        active={profile.title_align === "left"}
        onClick={() => onProfileChange?.({ title_align: "left" })}
        title="Izquierda"
      />
      <IconButton
        icon={AlignCenter}
        active={profile.title_align === "center"}
        onClick={() => onProfileChange?.({ title_align: "center" })}
        title="Centro"
      />
      <IconButton
        icon={AlignRight}
        active={profile.title_align === "right"}
        onClick={() => onProfileChange?.({ title_align: "right" })}
        title="Derecha"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={Bold}
        active={profile.title_weight === "bold"}
        onClick={() =>
          onProfileChange?.({ title_weight: profile.title_weight === "bold" ? "normal" : "bold" })
        }
        title="Negrita"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <ColorPicker
        value={profile.title_color || "#000000"}
        onChange={(v) => onProfileChange?.({ title_color: v })}
        title="Color del título"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={MoreHorizontal}
        onClick={() => onOpenSidebar?.("text")}
        title="Más opciones"
      />
    </>
  );

  const renderBioToolbar = () => (
    <>
      <IconButton
        icon={AlignLeft}
        active={profile.bio_align === "left"}
        onClick={() => onProfileChange?.({ bio_align: "left" })}
        title="Izquierda"
      />
      <IconButton
        icon={AlignCenter}
        active={profile.bio_align === "center"}
        onClick={() => onProfileChange?.({ bio_align: "center" })}
        title="Centro"
      />
      <IconButton
        icon={AlignRight}
        active={profile.bio_align === "right"}
        onClick={() => onProfileChange?.({ bio_align: "right" })}
        title="Derecha"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <ColorPicker
        value={profile.bio_color || "#000000"}
        onChange={(v) => onProfileChange?.({ bio_color: v })}
        title="Color de la descripción"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={MoreHorizontal}
        onClick={() => onOpenSidebar?.("text")}
        title="Más opciones"
      />
    </>
  );

  const renderAvatarToolbar = () => (
    <>
      <IconButton
        icon={Circle}
        active={profile.avatar_shape === "circle"}
        onClick={() => onProfileChange?.({ avatar_shape: "circle" })}
        title="Circular"
      />
      <IconButton
        icon={Square}
        active={profile.avatar_shape === "rounded"}
        onClick={() => onProfileChange?.({ avatar_shape: "rounded" })}
        title="Redondeado"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={CircleDashed}
        active={profile.ring_enabled}
        onClick={() => onProfileChange?.({ ring_enabled: !profile.ring_enabled })}
        title="Activar/Desactivar Ring"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={MoreHorizontal}
        onClick={() => onOpenSidebar?.("profile")}
        title="Más opciones"
      />
    </>
  );

  const renderCoverToolbar = () => (
    <>
      <IconButton
        icon={ImageIcon2}
        onClick={() => onOpenSidebar?.("profile")}
        title="Cambiar Portada"
      />
      {profile.banner_url && (
        <IconButton
          icon={Trash}
          onClick={() => onProfileChange?.({ banner_url: null })}
          title="Quitar Portada"
        />
      )}
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={MoreHorizontal}
        onClick={() => onOpenSidebar?.("profile")}
        title="Más opciones"
      />
    </>
  );

  const renderBackgroundToolbar = () => (
    <>
      <ColorPicker
        value={profile.background_color || "#ffffff"}
        onChange={(v) => onProfileChange?.({ background_color: v })}
        title="Color de fondo"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={Palette}
        onClick={() => onOpenSidebar?.("design")}
        title="Plantillas y Gradientes"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={MoreHorizontal}
        onClick={() => onOpenSidebar?.("design")}
        title="Más opciones"
      />
    </>
  );

  const renderLinkToolbar = () => (
    <>
      {currentLink && (
        <>
          <div className="w-[180px] pr-1">
            <PlatformPicker
              value={currentLink.platform as string}
              className="h-8 shadow-none"
              onChange={(val) => {
                if (!linkId || !onLinkChange) return;
                const newDef = getPlatformDef(val);
                const currentLabel = currentLink.label?.trim() || "";
                const isAutoLabel =
                  currentLabel === "" ||
                  currentLabel === "Mi Enlace" ||
                  currentLabel === "Otro" ||
                  currentLabel === "Sitio Web" ||
                  currentLabel === "X (Twitter)" ||
                  getPlatformDef(currentLink.platform as string)?.label === currentLabel;

                if (isAutoLabel) {
                  onLinkChange(linkId, { platform: val, label: newDef.label });
                } else {
                  onLinkChange(linkId, { platform: val });
                }
              }}
            />
          </div>
          <div className="w-px h-5 bg-border mx-1" />
        </>
      )}
      <ColorPicker
        value={profile.button_color || "#000000"}
        onChange={(v) => onProfileChange?.({ button_color: v })}
        title="Color de los botones (Global)"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={Square}
        active={profile.button_radius === "none"}
        onClick={() => onProfileChange?.({ button_radius: "none" })}
        title="Cuadrado (Global)"
      />
      <IconButton
        icon={GripHorizontal}
        active={profile.button_radius === "rounded"}
        onClick={() => onProfileChange?.({ button_radius: "rounded" })}
        title="Esquinas (Global)"
      />
      <IconButton
        icon={Circle}
        active={profile.button_radius === "full"}
        onClick={() => onProfileChange?.({ button_radius: "full" })}
        title="Redondo (Global)"
      />
      <div className="w-px h-5 bg-border mx-1" />
      <IconButton
        icon={MoreHorizontal}
        onClick={() => onOpenSidebar?.("links")}
        title="Editar enlace o más opciones"
      />
    </>
  );

  const renderToolbarContent = () => {
    switch (type) {
      case "title":
        return renderTitleToolbar();
      case "bio":
        return renderBioToolbar();
      case "avatar":
        return renderAvatarToolbar();
      case "cover":
        return renderCoverToolbar();
      case "background":
        return renderBackgroundToolbar();
      case "link":
        return renderLinkToolbar();
      default:
        return null;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={`group contents cursor-pointer outline-none ${type === "background" ? "block h-full min-h-[100dvh] w-full" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        side={type === "background" || type === "cover" ? "bottom" : "top"}
        sideOffset={8}
        className="w-auto p-1.5 flex items-center gap-1 bg-background/95 backdrop-blur-md shadow-xl border rounded-xl z-[100]"
        onClick={handleContentClick}
        onOpenAutoFocus={(e) => e.preventDefault()} // don't steal focus
      >
        {renderToolbarContent()}
      </PopoverContent>
    </Popover>
  );
}
