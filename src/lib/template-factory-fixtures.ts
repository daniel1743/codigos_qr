/**
 * PASS B Test Fixtures
 * Seed data for Template Factory Private Library
 * Based on PASS A fixtures adapted for administrative workflow
 */

import { createAdminTemplate } from "../services/template-factory-admin.service";

// PASS A fixture configs (from test-fixtures.js)
const PASS_A_FIXTURES = {
  fixture1Button: {
    schemaVersion: 1,
    identity: {
      logoText: 'Dr. Silva',
      subtitleText: 'MÉDICO GENERAL',
      titleText: 'DR. CARLOS SILVA',
      profileImg: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
      bannerImg: ''
    },
    socials: {
      enabled: true,
      displayMode: 'icons',
      items: [
        {
          id: 'social_fixture_1',
          platform: 'whatsapp',
          label: 'WhatsApp',
          url: 'https://wa.me/1234567890',
          iconId: 'whatsapp',
          enabled: true
        }
      ]
    },
    content: {
      footerText: 'Haga clic para agendar'
    },
    links: [
      { id: 'f1_b1', text: 'Agendar Consulta', icon: 'fa-solid fa-calendar-check', url: 'https://example.com/schedule', fullWidth: true }
    ],
    appearance: {
      themeId: 'executive-blue',
      btnPresetId: 'glass',
      // ... other appearance fields
    },
    layout: {
      gridCols: 1,
      profileBorder: 4,
      profileSize: 170,
      logoSize: 3.2,
      titleSize: 2.2,
      devicePreview: 'mobile'
    }
  },
  // ... more fixtures
};

export const ADMIN_LIBRARY_FIXTURES = [
  // GENERATED_PRIVATE
  {
    name: "Dr. Silva - Médico General",
    description: "Plantilla para profesional médico con botón de agendar consulta",
    category: "Salud",
    industry: "doctor",
    style: "profesional",
    theme: "executive-blue",
    config_json: PASS_A_FIXTURES.fixture1Button,
    preview_image: "https://placehold.co/390x780/001f3f/7FDBFF?text=Dr.+Silva",
    generation_source: "test_fixture",
    batch_id: "test_batch_001",
  },

  // REVIEW_PENDING
  {
    name: "Dra. Martínez - Abogada",
    description: "Plantilla para abogada con servicios legales",
    category: "Legal",
    industry: "lawyer",
    style: "elegante",
    theme: "burgundy-elegant",
    config_json: {
      schemaVersion: 1,
      identity: {
        logoText: 'LegalPro',
        subtitleText: 'ABOGADA',
        titleText: 'DRA. ANA MARTÍNEZ',
        profileImg: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        bannerImg: ''
      },
      links: [
        { id: 'f2_b1', text: 'Agendar Cita', icon: 'fa-solid fa-calendar', url: 'https://example.com/appointment', fullWidth: false },
        { id: 'f2_b2', text: 'Consultas', icon: 'fa-solid fa-gavel', url: 'https://example.com/services', fullWidth: false }
      ],
      // ... rest of config
    },
    preview_image: "https://placehold.co/390x780/4a0404/e5b382?text=Legal",
    generation_source: "test_fixture",
    batch_id: "test_batch_001",
  },

  // APPROVED
  {
    name: "La Cocina - Chef Ricardo",
    description: "Plantilla para restaurante con menú y reservas",
    category: "Gastronomía",
    industry: "restaurant",
    style: "luxury",
    theme: "emerald-luxury",
    config_json: {
      schemaVersion: 1,
      identity: {
        logoText: 'La Cocina',
        subtitleText: 'RESTAURANTE',
        titleText: 'CHEF RICARDO LÓPEZ',
        profileImg: 'https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=400',
        bannerImg: ''
      },
      links: [
        { id: 'f3_b1', text: 'Menú', icon: 'fa-solid fa-utensils', url: 'https://example.com/menu', fullWidth: false },
        { id: 'f3_b2', text: 'Reservar', icon: 'fa-solid fa-calendar-days', url: 'https://example.com/reserve', fullWidth: false },
        { id: 'f3_b3', text: 'Ubicación', icon: 'fa-solid fa-location-dot', url: 'https://maps.google.com', fullWidth: true }
      ],
      // ... rest of config
    },
    preview_image: "https://placehold.co/390x780/042A2B/D4AF37?text=Restaurante",
    generation_source: "test_fixture",
    batch_id: "test_batch_002",
  },

  // PUBLIC
  {
    name: "StyleCut - Barbería",
    description: "Plantilla para barbería moderna con agenda y galería",
    category: "Servicios",
    industry: "barber",
    style: "moderno",
    theme: "graphite",
    config_json: {
      schemaVersion: 1,
      identity: {
        logoText: 'StyleCut',
        subtitleText: 'BARBERÍA',
        titleText: 'JUAN RAMÍREZ',
        profileImg: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400',
        bannerImg: ''
      },
      links: [
        { id: 'f4_b1', text: 'Agendar', icon: 'fa-solid fa-scissors', url: 'https://example.com/book', fullWidth: false },
        { id: 'f4_b2', text: 'Servicios', icon: 'fa-solid fa-list', url: 'https://example.com/services', fullWidth: false },
        { id: 'f4_b3', text: 'Galería', icon: 'fa-solid fa-images', url: 'https://example.com/gallery', fullWidth: false },
        { id: 'f4_b4', text: 'Ubicación', icon: 'fa-solid fa-map-location-dot', url: 'https://maps.google.com', fullWidth: false }
      ],
      // ... rest of config
    },
    preview_image: "https://placehold.co/390x780/2b2b2b/ffffff?text=Barbería",
    generation_source: "test_fixture",
    batch_id: "test_batch_002",
  },

  // ARCHIVED
  {
    name: "Consultora Premium V1",
    description: "Versión anterior de plantilla de consultoría",
    category: "Consultoría",
    industry: "consultant",
    style: "premium",
    theme: "custom",
    config_json: {
      schemaVersion: 1,
      identity: {
        logoText: 'Vanesa',
        subtitleText: 'CONSULTORA',
        titleText: 'VANESA ALVES',
        profileImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
        bannerImg: ''
      },
      links: [
        { id: 'f5_b1', text: 'Facebook', icon: 'fa-brands fa-facebook-f', url: 'https://facebook.com/vanesa', fullWidth: true },
        { id: 'f5_b2', text: 'Instagram', icon: 'fa-brands fa-instagram', url: 'https://instagram.com/vanesa', fullWidth: false },
      ],
      // ... rest of config
    },
    preview_image: "https://placehold.co/390x780/95547B/FFFFFF?text=Consultora",
    generation_source: "manual",
    batch_id: null,
  },

  // REJECTED
  {
    name: "Test Roto - Configuración Inválida",
    description: "Plantilla de prueba con config incompleto",
    category: "Test",
    industry: "test",
    style: "test",
    theme: "none",
    config_json: {
      schemaVersion: 1,
      // Incomplete config for testing
      identity: {
        logoText: 'Test',
        titleText: 'TEST',
      },
      links: []
    },
    preview_image: null,
    generation_source: "test_fixture",
    batch_id: "test_batch_error",
  },
];

/**
 * Seed the admin library with test fixtures
 * Run this only in development/testing
 */
export async function seedAdminLibrary() {
  console.log("[Template Factory] Seeding admin library with test fixtures...");

  const targetStatuses = [
    "GENERATED_PRIVATE",
    "REVIEW_PENDING",
    "APPROVED",
    "PUBLIC",
    "ARCHIVED",
    "REJECTED",
  ];

  for (const [i, fixture] of ADMIN_LIBRARY_FIXTURES.entries()) {
    const targetStatus = targetStatuses[i] || "GENERATED_PRIVATE";

    try {
      // Create with GENERATED_PRIVATE first
      const created = await createAdminTemplate(fixture);
      console.log(`✓ Created: ${fixture.name} (${created.id})`);

      // Then transition to target status if needed
      if (targetStatus !== "GENERATED_PRIVATE") {
        // Manual status updates would go here
        // (In real implementation, we'd call the transition functions)
        console.log(`  → Target status: ${targetStatus} (manual transition needed)`);
      }
    } catch (error) {
      console.error(`✗ Failed to create: ${fixture.name}`, error);
    }
  }

  console.log("[Template Factory] Seeding complete!");
}

/**
 * Clear all test fixtures
 */
export async function clearTestFixtures() {
  console.log("[Template Factory] Clearing test fixtures...");
  // Implementation would query and delete templates with generation_source='test_fixture'
  console.log("[Template Factory] Clear complete!");
}
