/**
 * CRIPQER — Onboarding static configuration.
 * Pure data: option catalogues and destination field metadata.
 */

import type { PrimaryActionType, PrimaryGoal, VisualPersonality } from "./types";

export const OTHER_BUSINESS_ID = "otro";

export const BUSINESS_TYPES: { id: string; label: string; caption: string }[] = [
  { id: "belleza", label: "Belleza", caption: "Salón, uñas, estética" },
  { id: "profesional", label: "Profesional", caption: "Consulta, asesoría, salud" },
  { id: "creador", label: "Creador", caption: "Contenido y comunidad" },
  { id: "restaurante", label: "Restaurante / comida", caption: "Carta, pedidos, delivery" },
  { id: "fitness", label: "Fitness / bienestar", caption: "Entrenamiento, terapias" },
  { id: "local", label: "Negocio local", caption: "Tienda o servicio de barrio" },
  { id: "freelancer", label: "Freelancer", caption: "Servicios independientes" },
  { id: OTHER_BUSINESS_ID, label: "Otro", caption: "Cuéntanos en una línea" },
];

export const GOALS: { id: PrimaryGoal; label: string; caption: string }[] = [
  { id: "whatsapp", label: "Recibir mensajes", caption: "Conversaciones directas" },
  { id: "booking", label: "Conseguir reservas", caption: "Agenda llena" },
  { id: "sell", label: "Vender", caption: "Productos o servicios" },
  { id: "leads", label: "Conseguir clientes", caption: "Datos de contacto" },
  { id: "portfolio", label: "Mostrar mi trabajo", caption: "Portafolio visual" },
  { id: "social", label: "Llevar personas a mis redes", caption: "Más seguidores" },
];

export const PERSONALITIES: {
  id: VisualPersonality;
  label: string;
  caption: string;
  swatch: [string, string];
  radius: number;
  weight: number;
}[] = [
  { id: "elegant", label: "Elegante", caption: "Serena y cuidada", swatch: ["#1B2A41", "#C9B37E"], radius: 14, weight: 600 },
  { id: "minimal", label: "Minimalista", caption: "Aire y silencio", swatch: ["#111827", "#E5E7EB"], radius: 4, weight: 400 },
  { id: "modern", label: "Moderna", caption: "Limpia y actual", swatch: ["#0D47A1", "#7FB2F0"], radius: 18, weight: 600 },
  { id: "professional", label: "Profesional", caption: "Confiable y clara", swatch: ["#233044", "#9AA6B2"], radius: 8, weight: 500 },
  { id: "energetic", label: "Energética", caption: "Directa y viva", swatch: ["#B45309", "#F0B36B"], radius: 20, weight: 700 },
  { id: "premium", label: "Premium", caption: "Alto valor", swatch: ["#0B1A2E", "#D4AF37"], radius: 12, weight: 700 },
];

export const ACTIONS: { id: PrimaryActionType; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "booking", label: "Reservar" },
  { id: "website", label: "Sitio web" },
  { id: "instagram", label: "Instagram" },
  { id: "email", label: "Correo" },
];

export const ACTION_FIELDS: Record<
  PrimaryActionType,
  { label: string; placeholder: string; hint: string; inputMode?: "tel" | "email" | "url" | "text" }
> = {
  whatsapp: {
    label: "Número de WhatsApp",
    placeholder: "+56 9 1234 5678",
    hint: "Incluye el código de país.",
    inputMode: "tel",
  },
  booking: {
    label: "Enlace de reservas",
    placeholder: "https://calendly.com/tu-nombre",
    hint: "Pega el enlace donde te reservan.",
    inputMode: "url",
  },
  website: {
    label: "Tu sitio web",
    placeholder: "https://tunegocio.cl",
    hint: "Dirección completa del sitio.",
    inputMode: "url",
  },
  instagram: {
    label: "Usuario de Instagram",
    placeholder: "@tucuenta",
    hint: "Solo el nombre de usuario.",
    inputMode: "text",
  },
  email: {
    label: "Correo de contacto",
    placeholder: "hola@tunegocio.cl",
    hint: "Aquí llegarán los mensajes.",
    inputMode: "email",
  },
};

export const TOTAL_STEPS = 6;
export const STORAGE_KEY = "cripqer.onboarding.draft.v1";
