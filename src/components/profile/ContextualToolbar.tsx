import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Slot } from "@radix-ui/react-slot";
import type { Profile, ProfileLink } from "../../types/database";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Palette,
  MoreHorizontal,
  Trash,
  Square,
  Circle,
  Type,
  Image as ImageIcon2,
  CircleDashed,
  PenSquare,
} from "lucide-react";
import { PlatformPicker } from "./PlatformPicker";

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
      className="relative w-8 h-8 rounded-full overflow-hidden border border-border/50 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform mx-1.5"
      title={title}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-[-10px] w-[50px] h-[50px] cursor-pointer"
        aria-label={title}
      />
    </div>
  );

  const ActionButton = ({
    icon: Icon,
    label,
    onClick,
    active,
    title,
  }: {
    icon?: any;
    label?: string;
    onClick: () => void;
    active?: boolean;
    title: string;
  }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md transition-colors flex flex-col items-center justify-center gap-1 shrink-0 ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label && <span className="text-[10px] font-medium leading-none">{label}</span>}
    </button>
  );

  const Divider = () => <div className="w-px h-8 bg-border shrink-0 mx-1" />;

  const renderTitleToolbar = () => (
    <>
      <ActionButton
        icon={Type}
        label="Fuente"
        onClick={() => onOpenSidebar?.("text")}
        title="Cambiar Fuente"
      />
      <ActionButton
        label="Tam."
        onClick={() => {
          const sizes = ["sm", "md", "lg", "xl"];
          const next = sizes[(sizes.indexOf(profile.title_size || "lg") + 1) % sizes.length];
          onProfileChange?.({ title_size: next as any });
        }}
        title="Tamaño"
      />
      <ActionButton
        icon={Bold}
        label="Peso"
        active={profile.title_weight === "bold"}
        onClick={() =>
          onProfileChange?.({ title_weight: profile.title_weight === "bold" ? "normal" : "bold" })
        }
        title="Grosor"
      />
      <Divider />
      <ActionButton
        icon={AlignLeft}
        active={profile.title_align === "left"}
        onClick={() => onProfileChange?.({ title_align: "left" })}
        title="Izquierda"
      />
      <ActionButton
        icon={AlignCenter}
        active={profile.title_align === "center"}
        onClick={() => onProfileChange?.({ title_align: "center" })}
        title="Centro"
      />
      <ActionButton
        icon={AlignRight}
        active={profile.title_align === "right"}
        onClick={() => onProfileChange?.({ title_align: "right" })}
        title="Derecha"
      />
      <Divider />
      <div className="flex flex-col items-center justify-center min-w-[44px]">
        <ColorPicker
          value={profile.title_color || "#000000"}
          onChange={(v) => onProfileChange?.({ title_color: v })}
          title="Color"
        />
      </div>
      <Divider />
      <ActionButton
        icon={MoreHorizontal}
        label="Más"
        onClick={() => onOpenSidebar?.("text")}
        title="Más opciones"
      />
    </>
  );

  const renderBioToolbar = () => (
    <>
      <ActionButton
        label="Tam."
        onClick={() => {
          const sizes = ["sm", "md", "lg"];
          const next = sizes[(sizes.indexOf(profile.bio_size || "md") + 1) % sizes.length];
          onProfileChange?.({ bio_size: next as any });
        }}
        title="Tamaño"
      />
      <ActionButton
        icon={Bold}
        label="Peso"
        active={profile.bio_weight === "bold"}
        onClick={() =>
          onProfileChange?.({ bio_weight: profile.bio_weight === "bold" ? "normal" : "bold" })
        }
        title="Grosor"
      />
      <Divider />
      <ActionButton
        icon={AlignLeft}
        active={profile.bio_align === "left"}
        onClick={() => onProfileChange?.({ bio_align: "left" })}
        title="Izquierda"
      />
      <ActionButton
        icon={AlignCenter}
        active={profile.bio_align === "center"}
        onClick={() => onProfileChange?.({ bio_align: "center" })}
        title="Centro"
      />
      <ActionButton
        icon={AlignRight}
        active={profile.bio_align === "right"}
        onClick={() => onProfileChange?.({ bio_align: "right" })}
        title="Derecha"
      />
      <Divider />
      <div className="flex flex-col items-center justify-center min-w-[44px]">
        <ColorPicker
          value={profile.bio_color || "#000000"}
          onChange={(v) => onProfileChange?.({ bio_color: v })}
          title="Color"
        />
      </div>
      <Divider />
      <ActionButton
        icon={MoreHorizontal}
        label="Más"
        onClick={() => onOpenSidebar?.("text")}
        title="Más opciones"
      />
    </>
  );

  const renderAvatarToolbar = () => (
    <>
      <ActionButton
        icon={ImageIcon2}
        label="Cambiar"
        onClick={() => onOpenSidebar?.("profile")}
        title="Cambiar Avatar"
      />
      <Divider />
      <ActionButton
        icon={Circle}
        label="Circular"
        active={profile.avatar_shape === "circle"}
        onClick={() => onProfileChange?.({ avatar_shape: "circle" })}
        title="Circular"
      />
      <ActionButton
        icon={Square}
        label="Redondo"
        active={profile.avatar_shape === "rounded"}
        onClick={() => onProfileChange?.({ avatar_shape: "rounded" })}
        title="Redondeado"
      />
      <Divider />
      <ActionButton
        icon={CircleDashed}
        label="Ring"
        active={profile.ring_enabled}
        onClick={() => onProfileChange?.({ ring_enabled: !profile.ring_enabled })}
        title="Activar/Desactivar Ring"
      />
      <Divider />
      <ActionButton
        icon={MoreHorizontal}
        label="Más"
        onClick={() => onOpenSidebar?.("profile")}
        title="Más opciones"
      />
    </>
  );

  const renderCoverToolbar = () => (
    <>
      <ActionButton
        icon={ImageIcon2}
        label="Cambiar"
        onClick={() => onOpenSidebar?.("profile")}
        title="Cambiar Portada"
      />
      {profile.banner_url && (
        <ActionButton
          icon={Trash}
          label="Quitar"
          onClick={() => onProfileChange?.({ banner_url: null })}
          title="Quitar Portada"
        />
      )}
      <Divider />
      <ActionButton
        icon={MoreHorizontal}
        label="Más"
        onClick={() => onOpenSidebar?.("profile")}
        title="Más opciones"
      />
    </>
  );

  const renderBackgroundToolbar = () => (
    <>
      <div className="flex flex-col items-center justify-center min-w-[44px]">
        <ColorPicker
          value={profile.background_color || "#ffffff"}
          onChange={(v) => onProfileChange?.({ background_color: v })}
          title="Color de fondo"
        />
      </div>
      <Divider />
      <ActionButton
        icon={Palette}
        label="Diseño"
        onClick={() => onOpenSidebar?.("design")}
        title="Diseño"
      />
      <Divider />
      <ActionButton
        icon={MoreHorizontal}
        label="Más"
        onClick={() => onOpenSidebar?.("design")}
        title="Más opciones"
      />
    </>
  );

  const renderLinkToolbar = () => {
    if (!currentLink || !linkId) return null;
    return (
      <>
        <ActionButton
          icon={PenSquare}
          label="Editar"
          onClick={() => onOpenSidebar?.("links")}
          title="Editar Enlace"
        />
        <Divider />
        <div className="flex items-center min-h-[44px]">
          <PlatformPicker
            value={currentLink.platform || "website"}
            onChange={(platform) => onLinkChange?.(linkId, { platform })}
            asIcon
          />
        </div>
        <Divider />
        <div className="flex flex-col items-center justify-center min-w-[44px]">
          <ColorPicker
            value={profile.button_color || "#111111"}
            onChange={(v) => onProfileChange?.({ button_color: v })}
            title="Color Botones"
          />
        </div>
        <Divider />
        <ActionButton
          icon={Square}
          label="Forma"
          onClick={() => {
            const rads = ["none", "md", "full"];
            const next = rads[(rads.indexOf(profile.button_radius || "full") + 1) % rads.length];
            onProfileChange?.({ button_radius: next as any });
          }}
          title="Forma"
        />
        <ActionButton
          icon={Palette}
          label="Estilo"
          onClick={() => {
            const styles = ["solid", "outline", "ghost", "soft", "glass", "neon", "retro"];
            const next =
              styles[(styles.indexOf(profile.button_style || "solid") + 1) % styles.length];
            onProfileChange?.({ button_style: next as any });
          }}
          title="Estilo"
        />
        <Divider />
        <ActionButton
          icon={MoreHorizontal}
          label="Más"
          onClick={() => onOpenSidebar?.("links")}
          title="Más opciones"
        />
      </>
    );
  };

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
        <Slot
          className={`cursor-pointer outline-none transition-all ${
            type === "background"
              ? "data-[state=open]:shadow-[inset_0_0_0_2px_hsl(var(--primary))]"
              : "data-[state=open]:outline data-[state=open]:outline-2 data-[state=open]:outline-primary data-[state=open]:outline-offset-2 hover:outline hover:outline-1 hover:outline-primary/50 hover:outline-offset-2"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if ((e.target as HTMLElement).closest("a")) {
              e.preventDefault();
            }
            setOpen(true);
          }}
        >
          {children}
        </Slot>
      </PopoverTrigger>
      <PopoverContent
        side={type === "background" || type === "cover" ? "bottom" : "top"}
        sideOffset={8}
        className="w-[calc(100vw-24px)] max-w-max p-1 flex items-center bg-background/95 backdrop-blur-md shadow-xl border rounded-xl z-[100] overflow-x-auto no-scrollbar touch-pan-x"
        onClick={handleContentClick}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => setOpen(false)}
        onEscapeKeyDown={() => setOpen(false)}
      >
        {renderToolbarContent()}
      </PopoverContent>
    </Popover>
  );
}
