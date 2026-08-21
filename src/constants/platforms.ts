import {
  SiInstagram,
  SiWhatsapp,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiX,
  SiTelegram,
  SiDiscord,
  SiReddit,
  SiSnapchat,
  SiThreads,
  SiMessenger,
  SiGithub,
  SiBehance,
  SiDribbble,
  SiMedium,
  SiSubstack,
  SiPatreon,
  SiKofi,
  SiSpotify,
  SiSoundcloud,
  SiApplemusic,
  SiTwitch,
  SiPinterest,
  SiEtsy,
  SiGooglemaps,
  SiVimeo,
  SiTumblr,
  SiFlickr,
  SiVk,
  SiLine,
  SiWechat,
  SiSignal,
} from "@icons-pack/react-simple-icons";
import {
  AppWindow,
  Mail,
  Phone,
  Link as LinkIcon,
  LucideIcon,
  Linkedin,
  ShoppingCart,
} from "lucide-react";
import React from "react";

export type PlatformCategory =
  | "populares"
  | "mensajeria_comunidades"
  | "profesional_creadores"
  | "musica_streaming"
  | "descubrimiento_comercio"
  | "contacto"
  | "otros";

export interface PlatformDef {
  id: string;
  label: string;
  category: PlatformCategory;
  icon: any;
}

export const PLATFORMS_CATALOG: PlatformDef[] = [
  // populares
  { id: "instagram", label: "Instagram", category: "populares", icon: SiInstagram },
  { id: "whatsapp", label: "WhatsApp", category: "populares", icon: SiWhatsapp },
  { id: "tiktok", label: "TikTok", category: "populares", icon: SiTiktok },
  { id: "youtube", label: "YouTube", category: "populares", icon: SiYoutube },
  { id: "facebook", label: "Facebook", category: "populares", icon: SiFacebook },
  { id: "twitter", label: "X / Twitter", category: "populares", icon: SiX },
  { id: "linkedin", label: "LinkedIn", category: "populares", icon: Linkedin },

  // mensajeria_comunidades
  { id: "telegram", label: "Telegram", category: "mensajeria_comunidades", icon: SiTelegram },
  { id: "discord", label: "Discord", category: "mensajeria_comunidades", icon: SiDiscord },
  { id: "reddit", label: "Reddit", category: "mensajeria_comunidades", icon: SiReddit },
  { id: "snapchat", label: "Snapchat", category: "mensajeria_comunidades", icon: SiSnapchat },
  { id: "threads", label: "Threads", category: "mensajeria_comunidades", icon: SiThreads },
  { id: "messenger", label: "Messenger", category: "mensajeria_comunidades", icon: SiMessenger },
  { id: "signal", label: "Signal", category: "mensajeria_comunidades", icon: SiSignal },
  { id: "line", label: "Line", category: "mensajeria_comunidades", icon: SiLine },
  { id: "wechat", label: "WeChat", category: "mensajeria_comunidades", icon: SiWechat },

  // profesional_creadores
  { id: "github", label: "GitHub", category: "profesional_creadores", icon: SiGithub },
  { id: "behance", label: "Behance", category: "profesional_creadores", icon: SiBehance },
  { id: "dribbble", label: "Dribbble", category: "profesional_creadores", icon: SiDribbble },
  { id: "medium", label: "Medium", category: "profesional_creadores", icon: SiMedium },
  { id: "substack", label: "Substack", category: "profesional_creadores", icon: SiSubstack },
  { id: "patreon", label: "Patreon", category: "profesional_creadores", icon: SiPatreon },
  { id: "kofi", label: "Ko-fi", category: "profesional_creadores", icon: SiKofi },

  // musica_streaming
  { id: "spotify", label: "Spotify", category: "musica_streaming", icon: SiSpotify },
  { id: "soundcloud", label: "SoundCloud", category: "musica_streaming", icon: SiSoundcloud },
  { id: "applemusic", label: "Apple Music", category: "musica_streaming", icon: SiApplemusic },
  { id: "twitch", label: "Twitch", category: "musica_streaming", icon: SiTwitch },
  { id: "vimeo", label: "Vimeo", category: "musica_streaming", icon: SiVimeo },

  // descubrimiento_comercio
  { id: "pinterest", label: "Pinterest", category: "descubrimiento_comercio", icon: SiPinterest },
  { id: "etsy", label: "Etsy", category: "descubrimiento_comercio", icon: SiEtsy },
  { id: "amazon", label: "Amazon", category: "descubrimiento_comercio", icon: ShoppingCart },
  {
    id: "googlemaps",
    label: "Google Maps",
    category: "descubrimiento_comercio",
    icon: SiGooglemaps,
  },
  { id: "tumblr", label: "Tumblr", category: "descubrimiento_comercio", icon: SiTumblr },
  { id: "flickr", label: "Flickr", category: "descubrimiento_comercio", icon: SiFlickr },
  { id: "vk", label: "VK", category: "descubrimiento_comercio", icon: SiVk },

  // contacto
  // Modified by Codex — SOCIAL-BADGES-IMAGE-MODE
  { id: "website", label: "Sitio web", category: "contacto", icon: AppWindow },
  { id: "email", label: "Email", category: "contacto", icon: Mail },
  { id: "phone", label: "Teléfono", category: "contacto", icon: Phone },

  // otros
  { id: "other", label: "Enlace personalizado", category: "otros", icon: LinkIcon },
];

export const CATEGORY_LABELS: Record<PlatformCategory, string> = {
  populares: "Populares",
  mensajeria_comunidades: "Mensajería y Comunidades",
  profesional_creadores: "Profesional y Creadores",
  musica_streaming: "Música y Streaming",
  descubrimiento_comercio: "Descubrimiento y Comercio",
  contacto: "Contacto",
  otros: "Otros",
};

export const getPlatformDef = (id: string): PlatformDef => {
  if (id === "x") id = "twitter"; // backward compatibility
  return (
    PLATFORMS_CATALOG.find((p) => p.id === id) ||
    (PLATFORMS_CATALOG[PLATFORMS_CATALOG.length - 1] as PlatformDef)
  ); // defaults to "other"
};
