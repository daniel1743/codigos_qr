/**
 * V1.5.1 — PERMANENT 20-INDUSTRY CLASSIFICATION REGRESSION MATRIX.
 *
 * Each case pins the deterministic archetype the engine must keep inferring
 * for a real-world trade/profession. If a keyword table changes and one of
 * these drifts, the self-check fails. These are regression inputs, not a
 * production template catalog.
 */

import type { BusinessArchetype } from "../business-signals";
import type { OnboardingIntentV1 } from "../types";

const AT = "2026-01-01T00:00:00.000Z";

export interface IndustryClassificationCase {
  id: string;
  profession: string;
  expected_archetype: BusinessArchetype;
  intent: OnboardingIntentV1;
}

function intentFor(profession: string): OnboardingIntentV1 {
  return {
    business_type: "otro",
    business_other: profession,
    primary_goal: "whatsapp",
    visual_personality: "professional",
    identity: {
      name: "Cripqer Demo",
      profession,
      bio: "Servicio local con atencion personalizada y respuesta rapida.",
      avatar_preview: null,
      banner_preview: null,
    },
    primary_action: { type: "whatsapp", value: "+34600111222" },
    meta: { version: "1", completed_at: AT },
  };
}

function c(
  id: string,
  profession: string,
  expected_archetype: BusinessArchetype,
): IndustryClassificationCase {
  return { id, profession, expected_archetype, intent: intentFor(profession) };
}

export const INDUSTRY_CLASSIFICATION_CASES: IndustryClassificationCase[] = [
  c("plumber", "Fontanero / plumber", "home_service"),
  c("gardener", "Jardinero / gardener", "home_service"),
  c("blacksmith", "Herrero / blacksmith", "custom_craft"),
  c("electrician", "Electricista / electrician", "home_service"),
  c("carpenter", "Carpintero / carpenter", "custom_craft"),
  c("painter", "Pintor / painter", "home_service"),
  c("cleaning", "Servicio de limpieza / cleaning service", "home_service"),
  c("auto_repair", "Taller mecanico / auto repair", "local_business"),
  c("pet_groomer", "Peluqueria canina / pet groomer", "appointment_service"),
  c("photographer", "Fotografo / photographer", "portfolio_service"),
  c("lawyer", "Abogado / lawyer", "professional_service"),
  c("accountant", "Contador / accountant", "professional_service"),
  c("real_estate", "Agente inmobiliario / real estate agent", "real_estate"),
  c("event_planner", "Organizador de eventos / event planner", "events"),
  c("tutor", "Profesor particular / tutor", "education"),
  c("restaurant", "Restaurante / restaurant", "food_service"),
  c("barber", "Barbero / barber", "appointment_service"),
  c("tattoo", "Tatuador / tattoo artist", "appointment_service"),
  c("fitness_coach", "Entrenador personal / fitness coach", "wellness"),
  c("local_store", "Tienda local / local store", "retail"),
];
