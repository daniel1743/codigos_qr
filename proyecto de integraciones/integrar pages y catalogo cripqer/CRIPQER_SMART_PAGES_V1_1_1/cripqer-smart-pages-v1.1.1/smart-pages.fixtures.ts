/**
 * CRIPQER SMART PAGES V1 — proof-of-reusability fixtures.
 *
 * Six very different businesses, ONE set of contracts, ONE orchestrator, ONE
 * runtime. These are demo datasets only; every value here is fictional sample
 * data supplied by the fixture, never inferred by the system.
 */

import type {
  CatalogItemV1,
  CatalogV1,
  NormalizedContentV1,
} from "./catalog.types";
import type { PageGenerationRequest } from "./smart-pages.types";
import { action } from "./sales-actions";

function item(
  id: string,
  type: CatalogItemV1["type"],
  name: string,
  extra: Partial<CatalogItemV1> = {},
): CatalogItemV1 {
  return {
    id,
    type,
    name,
    media: [],
    attributes: [],
    salesMode: "contact",
    featured: false,
    enabled: true,
    confidence: 1,
    review: [],
    ...extra,
  };
}

function base(
  name: string,
  businessType: string,
  patch: Partial<NormalizedContentV1> = {},
): NormalizedContentV1 {
  return {
    version: "1",
    business: { name, businessType },
    catalogs: [],
    gallery: [],
    team: [],
    testimonials: [],
    faq: [],
    contact: { socials: [] },
    issues: [],
    ...patch,
  };
}

/**
 * Demo media only. Keyword-based placeholder photos so each fixture shows
 * business-relevant imagery (a restaurant shows food, a vet shows animals).
 * `lock` keeps the picture stable per slot so screenshots are reproducible.
 */
const TOPICS: Record<string, string> = {
  trattoria: "rest-cover",
  pizza1: "rest-margherita",
  pizza2: "rest-cover",
  bruschetta: "rest-bruschetta",
  margherita: "rest-margherita",
  pepperoni: "rest-pepperoni",
  lemonade: "rest-lemonade",
  vetcover: "vet-cover",
  vetconsult: "vet-consult",
  vetvaccine: "vet-vaccine",
  vetsurgery: "vet-surgery",
  vet1: "vet-team-1",
  vet2: "vet-team-2",
  haircover: "hair-cover",
  hair1: "hair-cut",
  hair2: "hair-color",
  haircut: "hair-cut",
  haircolor: "hair-color",
  beard: "hair-beard",
  apt1: "re-apartment",
  house1: "re-house",
  office1: "re-office",
  wed1: "photo-wedding-1",
  wed2: "photo-wedding-2",
  port1: "photo-portrait",
  photocover: "photo-cover",
  plant1: "shop-monstera",
  plant2: "shop-pothos",
  pot1: "shop-ceramic-pot",
  pot2: "shop-terracotta-pot",
};

const photo = (id: string, seed: string, alt: string) => ({
  id,
  url: `/demo-media/${TOPICS[seed] ?? seed}.jpg`,
  alt,
  kind: "image" as const,
});

/* --------------------------------------------------------------- restaurant */

const restaurantCatalog: CatalogV1 = {
  id: "catalog_menu",
  kind: "menu",
  categories: [
    { id: "cat_starters", name: "Starters", order: 0 },
    { id: "cat_pizzas", name: "Pizzas", order: 1 },
    { id: "cat_drinks", name: "Drinks", order: 2 },
  ],
  items: [
    item("itm_bruschetta", "menu_item", "Bruschetta", {
      categoryId: "cat_starters",
      description: "Toasted bread, tomato, basil.",
      media: [photo("m_brus", "bruschetta", "Bruschetta")],
      price: { amount: 4500, currency: "CLP", label: "$4.500" },
      action: action("whatsapp", "Order on WhatsApp"),
    }),
    item("itm_margherita", "menu_item", "Pizza Margherita", {
      categoryId: "cat_pizzas",
      description: "Tomato, mozzarella, basil.",
      media: [photo("m_marg", "margherita", "Pizza Margherita")],
      price: { amount: 9900, currency: "CLP", label: "$9.900" },
      featured: true,
      action: action("whatsapp", "Order on WhatsApp"),
    }),
    item("itm_pepperoni", "menu_item", "Pizza Pepperoni", {
      action: action("whatsapp", "Order on WhatsApp"),
      categoryId: "cat_pizzas",
      price: { amount: 11500, currency: "CLP", label: "$11.500" },
      media: [photo("m_pepp", "pepperoni", "Pizza Pepperoni")],
      review: ["description"],
      confidence: 0.8,
    }),
    item("itm_lemonade", "menu_item", "Homemade lemonade", {
      action: action("whatsapp", "Order on WhatsApp"),
      categoryId: "cat_drinks",
      price: { amount: 3200, currency: "CLP", label: "$3.200" },
      media: [photo("m_lemo", "lemonade", "Homemade lemonade")],
    }),
  ],
};

const restaurantContent = base("Trattoria Nonna", "restaurant", {
  business: {
    name: "Trattoria Nonna",
    businessType: "restaurant",
    tagline: "Wood-fired pizza in Barrio Italia",
    cover: photo("cover_rest", "trattoria", "Restaurant dining room"),
  },
  catalogs: [restaurantCatalog],
  gallery: [photo("g_r1", "pizza1", "Pizza"), photo("g_r2", "pizza2", "Dining room")],
  contact: {
    whatsapp: "+56911112222",
    phone: "+56911112222",
    address: "Av. Italia 1234, Santiago",
    hours: "Tue–Sun 13:00–23:00",
    socials: [],
  },
});

/* ------------------------------------------------------------ veterinarian */

const vetContent = base("Clínica Veterinaria Patitas", "veterinarian", {
  business: {
    name: "Clínica Veterinaria Patitas",
    businessType: "veterinarian",
    tagline: "Care for your pets, every day",
    about: "A neighbourhood clinic with 12 years of experience in small animals.",
    cover: photo("cover_vet", "vetcover", "Veterinarian with a dog"),
  },
  catalogs: [
    {
      id: "catalog_services",
      kind: "services",
      categories: [],
      items: [
        item("itm_consult", "service", "General consultation", {
          description: "Full check-up with a veterinarian.",
          media: [photo("m_consult", "vetconsult", "Cat during a check-up")],
          price: { amount: 25000, currency: "CLP", label: "$25.000" },
          attributes: [{ key: "duration", label: "Duration", value: "30 min" }],
          salesMode: "booking",
        }),
        item("itm_vaccine", "service", "Vaccination", {
          description: "Annual vaccination plan.",
          media: [photo("m_vaccine", "vetvaccine", "Puppy being vaccinated")],
          price: { label: "From $18.000" },
          salesMode: "booking",
        }),
        item("itm_surgery", "service", "Minor surgery", {
          media: [photo("m_surgery", "vetsurgery", "Veterinary surgery room")],
          review: ["price"],
          confidence: 0.7,
          salesMode: "quote",
        }),
      ],
    },
  ],
  team: [
    {
      id: "tm_1",
      name: "Dra. Camila Rojas",
      role: "Head veterinarian",
      photo: photo("tm_1_ph", "vet1", "Dra. Camila Rojas"),
    },
    { id: "tm_2", name: "Dr. Luis Pino", role: "Surgeon", photo: photo("tm_2_ph", "vet2", "Dr. Luis Pino") },
  ],
  testimonials: [
    { id: "ts_1", quote: "They saved our dog. Incredibly kind team.", author: "María G." },
  ],
  faq: [{ id: "fq_1", question: "Do you handle emergencies?", answer: "Yes, during opening hours." }],
  contact: {
    whatsapp: "+56922223333",
    phone: "+56922223333",
    email: "hola@patitas.cl",
    address: "Los Leones 456, Providencia",
    bookingUrl: "https://example.com/patitas/booking",
    socials: [],
  },
});

/* -------------------------------------------------------------- hairdresser */

const hairContent = base("Studio Ondas", "hairdresser", {
  business: {
    name: "Studio Ondas",
    businessType: "hairdresser",
    tagline: "Cut, colour and care",
    cover: photo("cover_hair", "haircover", "Hair salon"),
  },
  catalogs: [
    {
      id: "catalog_services",
      kind: "services",
      categories: [],
      items: [
        item("itm_cut", "service", "Women's haircut", {
          salesMode: "booking",
          media: [photo("m_cut", "haircut", "Woman's haircut")],
          price: { amount: 18000, currency: "CLP", label: "$18.000" },
          attributes: [{ key: "duration", label: "Duration", value: "45 min" }],
          featured: true,
        }),
        item("itm_color", "service", "Full colour", {
          salesMode: "booking",
          price: { amount: 45000, currency: "CLP", label: "$45.000" },
          description: "Includes wash and blow-dry.",
          media: [photo("m_color", "haircolor", "Hair colouring")],
        }),
        item("itm_beard", "service", "Beard trim", {
          salesMode: "booking",
          media: [photo("m_beard", "beard", "Beard trim")],
          price: { amount: 8000, currency: "CLP", label: "$8.000" },
        }),
      ],
    },
  ],
  gallery: [photo("g_h1", "hair1", "Haircut"), photo("g_h2", "hair2", "Colour work")],
  testimonials: [{ id: "ts_h1", quote: "Best colour I've had in years.", author: "Paula R." }],
  contact: { whatsapp: "+56933334444", bookingUrl: "https://example.com/ondas", socials: [] },
});

/* -------------------------------------------------------------- real estate */

const realEstateContent = base("Andes Propiedades", "real_estate", {
  business: {
    name: "Andes Propiedades",
    businessType: "real_estate",
    tagline: "Homes and offices in the metropolitan area",
    about: "Independent brokerage operating since 2011.",
  },
  catalogs: [
    {
      id: "catalog_listings",
      kind: "listings",
      categories: [
        { id: "cat_sale", name: "For sale", order: 0 },
        { id: "cat_rent", name: "For rent", order: 1 },
      ],
      items: [
        item("itm_dep1", "listing", "2-bedroom apartment, Ñuñoa", {
          categoryId: "cat_sale",
          price: { amount: 4200, currency: "UF", label: "UF 4.200" },
          media: [photo("m_dep1", "apt1", "Apartment living room")],
          attributes: [
            { key: "bedrooms", label: "Bedrooms", value: "2" },
            { key: "bathrooms", label: "Bathrooms", value: "1" },
            { key: "area", label: "Area", value: "62 m²" },
          ],
        }),
        item("itm_casa", "listing", "Family house, La Reina", {
          categoryId: "cat_sale",
          price: { amount: 9800, currency: "UF", label: "UF 9.800" },
          media: [photo("m_casa", "house1", "House facade")],
          attributes: [
            { key: "bedrooms", label: "Bedrooms", value: "4" },
            { key: "bathrooms", label: "Bathrooms", value: "3" },
            { key: "area", label: "Area", value: "180 m²" },
          ],
        }),
        item("itm_office", "listing", "Office 45 m², Providencia", {
          categoryId: "cat_rent",
          price: { label: "$650.000 / month" },
          media: [photo("m_office", "office1", "Office space")],
          attributes: [
            { key: "bedrooms", label: "Bedrooms", value: "0" },
            { key: "area", label: "Area", value: "45 m²" },
          ],
        }),
      ],
    },
  ],
  contact: {
    whatsapp: "+56944445555",
    phone: "+56944445555",
    email: "contacto@andesprop.cl",
    socials: [],
  },
});

/* -------------------------------------------------------------- photographer */

const photographerContent = base("Lucía Vera Photography", "photographer", {
  business: {
    name: "Lucía Vera Photography",
    businessType: "photographer",
    tagline: "Weddings, portraits and editorial",
    about: "Documentary-style photography based in Valparaíso.",
    cover: photo("cover_photo", "photocover", "Photographer at work"),
  },
  catalogs: [
    {
      id: "catalog_portfolio",
      kind: "portfolio",
      categories: [
        { id: "cat_weddings", name: "Weddings", order: 0 },
        { id: "cat_portraits", name: "Portraits", order: 1 },
      ],
      items: [
        item("itm_w1", "portfolio_item", "Ana & Tomás", {
          categoryId: "cat_weddings",
          media: [photo("m_w1", "wed1", "Wedding photo")],
          featured: true,
        }),
        item("itm_w2", "portfolio_item", "Beach ceremony", {
          categoryId: "cat_weddings",
          media: [photo("m_w2", "wed2", "Beach wedding")],
        }),
        item("itm_p1", "portfolio_item", "Studio portraits", {
          categoryId: "cat_portraits",
          media: [photo("m_p1", "port1", "Portrait")],
        }),
      ],
    },
  ],
  testimonials: [{ id: "ts_p1", quote: "She captured the day exactly as it felt.", author: "Ana M." }],
  contact: { email: "hola@luciavera.cl", whatsapp: "+56955556666", socials: [] },
});

/* -------------------------------------------------------------- simple store */

const storeContent = base("Verde Casa", "retail", {
  business: {
    name: "Verde Casa",
    businessType: "retail",
    tagline: "Plants and pots for small homes",
  },
  catalogs: [
    {
      id: "catalog_products",
      kind: "catalog",
      categories: [
        { id: "cat_plants", name: "Plants", order: 0 },
        { id: "cat_pots", name: "Pots", order: 1 },
      ],
      items: [
        item("itm_monstera", "product", "Monstera deliciosa", {
          categoryId: "cat_plants",
          price: { amount: 15900, currency: "CLP", label: "$15.900" },
          media: [photo("m_mon", "plant1", "Monstera plant")],
          featured: true,
        }),
        item("itm_pothos", "product", "Pothos", {
          categoryId: "cat_plants",
          price: { amount: 7900, currency: "CLP", label: "$7.900" },
          media: [photo("m_pot", "plant2", "Pothos plant")],
        }),
        item("itm_ceramic", "product", "Ceramic pot 15 cm", {
          categoryId: "cat_pots",
          price: { amount: 6500, currency: "CLP", label: "$6.500" },
          media: [photo("m_cer", "pot1", "Ceramic pot")],
        }),
        item("itm_terracotta", "product", "Terracotta pot 20 cm", {
          categoryId: "cat_pots",
          review: ["price"],
          confidence: 0.7,
          media: [photo("m_ter", "pot2", "Terracotta pot")],
        }),
      ],
    },
  ],
  faq: [{ id: "fq_s1", question: "Do you deliver?", answer: "Yes, within Santiago." }],
  contact: { whatsapp: "+56966667777", email: "hola@verdecasa.cl", socials: [] },
});

/* ------------------------------------------------------------------ export */

export interface SmartPageFixture {
  id: string;
  label: string;
  request: PageGenerationRequest;
}

export const SMART_PAGE_FIXTURES: SmartPageFixture[] = [
  {
    id: "restaurant",
    label: "Restaurant / menu",
    request: {
      version: "1",
      businessType: "restaurant",
      goal: "sell",
      density: "balanced",
      salesMode: "contact",
      primaryAction: action("whatsapp", "Order on WhatsApp"),
      secondaryActions: [action("call", "Call us")],
      content: restaurantContent,
    },
  },
  {
    id: "veterinarian",
    label: "Veterinarian / services",
    request: {
      version: "1",
      businessType: "veterinarian",
      goal: "book",
      density: "balanced",
      salesMode: "booking",
      primaryAction: action("external_booking", "Book an appointment"),
      secondaryActions: [action("whatsapp", "WhatsApp"), action("call", "Call")],
      content: vetContent,
    },
  },
  {
    id: "hairdresser",
    label: "Hairdresser / services + prices",
    request: {
      version: "1",
      businessType: "hairdresser",
      goal: "book",
      density: "balanced",
      salesMode: "booking",
      primaryAction: action("whatsapp", "Book on WhatsApp"),
      secondaryActions: [action("external_booking", "Online booking")],
      content: hairContent,
    },
  },
  {
    id: "real_estate",
    label: "Real estate / listings",
    request: {
      version: "1",
      businessType: "real_estate",
      goal: "contact",
      density: "rich",
      salesMode: "contact",
      primaryAction: action("whatsapp", "Ask about a property"),
      secondaryActions: [action("email", "Send an email")],
      content: realEstateContent,
      preferences: { showSearch: true, showFilters: true },
    },
  },
  {
    id: "photographer",
    label: "Photographer / portfolio",
    request: {
      version: "1",
      businessType: "photographer",
      goal: "showcase",
      density: "balanced",
      salesMode: "quote",
      primaryAction: action("quote", "Request a quote"),
      secondaryActions: [action("whatsapp", "WhatsApp")],
      content: photographerContent,
    },
  },
  {
    id: "retail",
    label: "Simple store / catalog",
    request: {
      version: "1",
      businessType: "retail",
      goal: "sell",
      density: "balanced",
      salesMode: "contact",
      primaryAction: action("whatsapp", "Ask on WhatsApp"),
      secondaryActions: [action("email", "Email us")],
      content: storeContent,
    },
  },
];

export function getFixture(id: string): SmartPageFixture | undefined {
  return SMART_PAGE_FIXTURES.find((fixture) => fixture.id === id);
}
