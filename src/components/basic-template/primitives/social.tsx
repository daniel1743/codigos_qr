import {
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EDIT_TARGETS, socialEditTarget } from "@/types/basic-templates";
import type {
  EditTargetRegistry,
  PaletteConfig,
  SocialItem,
  SocialPlatform,
} from "@/types/basic-templates";
import { EditableTarget } from "../EditTarget";

const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
  whatsapp: MessageCircle,
  website: Globe,
  email: Mail,
};

interface SocialRowProps {
  socials: SocialItem[];
  palette: PaletteConfig;
  targetRegistry?: EditTargetRegistry | undefined;
  highlightedTarget?: string | null | undefined;
}

export function SocialRow({ socials, palette, targetRegistry, highlightedTarget }: SocialRowProps) {
  const visible = socials.filter((s) => s.enabled && s.url);
  if (visible.length === 0) return null;

  return (
    <EditableTarget
      id={EDIT_TARGETS.socials}
      registry={targetRegistry}
      active={highlightedTarget === EDIT_TARGETS.socials}
      className="flex w-full flex-wrap items-center justify-center gap-3"
    >
      {visible.map((social) => {
        const Icon = SOCIAL_ICONS[social.platform];
        return (
          <EditableTarget
            key={social.id}
            id={socialEditTarget(social.id)}
            registry={targetRegistry}
            active={highlightedTarget === socialEditTarget(social.id)}
          >
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.platform}
              className="grid h-10 w-10 place-items-center rounded-full transition-opacity hover:opacity-80"
              style={{ background: palette.accent, color: palette.accentText }}
            >
              <Icon className="h-5 w-5" />
            </a>
          </EditableTarget>
        );
      })}
    </EditableTarget>
  );
}
