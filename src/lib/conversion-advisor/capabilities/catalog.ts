/**
 * CRIPQER Conversion Advisor — CA-2 · verified capability catalog.
 *
 * This module is the ONLY thing the advisor is allowed to say about the product.
 * Every entry carries evidence (a path in this repo) and the date it was
 * verified. If something is not here, the advisor does not know it and must say
 * so rather than improvise.
 *
 * Three rules are enforced by the tests in `__tests__/catalog.test.ts`:
 *   1. every entry has evidence and a verification date;
 *   2. an entry that is not AVAILABLE_VERIFIED must state a limitation;
 *   3. no `allowed_claims` string may contain a price, an "unlimited/perpetual"
 *      promise, or roadmap language.
 *
 * VERIFIED AGAINST THIS BASE: `feat/conversion-advisor-v1` (origin/main @ 06f9310).
 * Anything verified elsewhere is marked as such — never silently promoted.
 */

export const CAPABILITY_STATUSES = [
  "AVAILABLE_VERIFIED",
  "PARTIAL",
  "IN_TESTING",
  "PLANNED",
  "NOT_AVAILABLE",
  "UNKNOWN",
] as const;

export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

/** Canonical tiers — the code's vocabulary. Users say "Premium"; the product says "pro". */
export const CAPABILITY_PLANS = ["free", "pro", "business", "enterprise"] as const;
export type CapabilityPlan = (typeof CAPABILITY_PLANS)[number];

export interface CapabilityRecord {
  readonly capability_id: string;
  readonly title: string;
  readonly description: string;
  readonly customer_benefit: string;
  readonly status: CapabilityStatus;
  readonly available_plans: readonly CapabilityPlan[];
  readonly limitations: readonly string[];
  readonly prerequisites: readonly string[];
  /** `path:line` references inside this repository. Never empty. */
  readonly evidence: readonly string[];
  /** ISO date the evidence was read. */
  readonly last_verified: string;
  readonly allowed_claims: readonly string[];
  readonly forbidden_claims: readonly string[];
  readonly related_capabilities: readonly string[];
}

export const CATALOG_VERIFIED_ON = "2026-10-14";

/* ============================== the catalog ============================= */

export const CAPABILITY_CATALOG: readonly CapabilityRecord[] = [
  {
    capability_id: "plan_free",
    title: "Plan Free",
    description:
      "Plan gratuito de CRIPQER: crear, personalizar y publicar una tarjeta digital con QR sin pagar.",
    customer_benefit: "Publicar una tarjeta profesional con QR sin costo y sin tarjeta de crédito.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "El nivel efectivo se resuelve SIEMPRE en servidor y falla cerrado a 'free'.",
      "Un usuario Free puede no tener acceso a quitar la marca CRIPQER (ver marca_cripqer).",
    ],
    prerequisites: ["Una cuenta (el registro se hace en el flujo de creación/publicación)."],
    evidence: [
      "src/server/billing/entitlements.ts:57",
      "src/lib/product-entitlements/capabilities.ts:61",
      "src/server/billing/plan-service.ts:98",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "CRIPQER tiene un plan gratuito para crear y publicar tu tarjeta.",
      "El plan gratuito incluye publicación, contenido, estilo básico, bloques y plantillas estándar.",
    ],
    forbidden_claims: [
      "que el plan gratuito no tiene límites de ningún tipo",
      "que el plan gratuito incluye todas las funciones de pago",
    ],
    related_capabilities: ["plan_premium", "ia_negocio", "marca_cripqer"],
  },
  {
    capability_id: "plan_premium",
    title: "Plan Premium (Pro)",
    description:
      "Nivel de pago 'pro' del producto, con el conjunto completo de capacidades visuales y de marca. Business y Enterprise comparten exactamente el mismo set visual que Pro.",
    customer_benefit:
      "Acceso al conjunto completo de personalización y a publicar sin la marca CRIPQER.",
    status: "PARTIAL",
    available_plans: ["pro", "business", "enterprise"],
    limitations: [
      "PRECIO: esta base NO contiene ninguna oferta de pago habilitada; el registro de ofertas declara por diseño 'NO enabled production offers'. El precio NO puede citarse desde aquí.",
      "El contrato comercial verificable (7990 CLP/mes + 10 días de prueba) vive en la rama de billing, no en esta base: no se promete desde aquí.",
      "No existen capacidades exclusivas de Business o Enterprise: el set visual es el mismo que Pro.",
    ],
    prerequisites: ["Una cuenta y, cuando la monetización esté activa, una suscripción."],
    evidence: [
      "src/server/billing/catalog.ts:24",
      "src/lib/product-entitlements/capabilities.ts:76",
      "src/server/billing/entitlements.ts:57",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "CRIPQER tiene un nivel de pago con más capacidades de personalización que el gratuito.",
      "Business y Enterprise incluyen el mismo conjunto visual que Pro.",
    ],
    forbidden_claims: [
      "cualquier precio, moneda o monto del plan de pago",
      "cualquier duración de prueba gratuita",
      "descuentos, promociones o precios de lanzamiento",
    ],
    related_capabilities: ["plan_free", "marca_cripqer", "early_access_visual"],
  },
  {
    capability_id: "marca_cripqer",
    title: "Quitar la marca CRIPQER",
    description:
      "Publicar la tarjeta sin la marca de CRIPQER. Es la ÚNICA capacidad que hoy está realmente bloqueada por plan.",
    customer_benefit: "Una página con identidad totalmente propia, sin marca de terceros.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["pro", "business", "enterprise"],
    limitations: [
      "Bloqueada para Free: es el control negativo que prueba que el desbloqueo de early access no es global.",
    ],
    prerequisites: [],
    evidence: [
      "src/lib/product-entitlements/capabilities.ts:90",
      "src/lib/product-entitlements/capabilities.ts:125",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Quitar la marca CRIPQER es una capacidad del nivel de pago.",
      "Hoy es la única capacidad que sigue bloqueada por plan.",
    ],
    forbidden_claims: ["que quitar la marca esté disponible en el plan gratuito"],
    related_capabilities: ["plan_premium", "early_access_visual"],
  },
  {
    capability_id: "early_access_visual",
    title: "Personalización avanzada (early access)",
    description:
      "Tipografía avanzada, layout avanzado, responsive manual, movimiento avanzado, efectos de fondo premium, estilos avanzados de tarjeta y botón, bloques, secciones y plantillas premium. Durante la etapa actual (pre-monetización) están abiertas a TODOS los niveles.",
    customer_benefit:
      "Hoy cualquier usuario puede usar la personalización avanzada, sin importar su plan.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Están abiertas por EARLY ACCESS, no porque sean gratuitas: el código declara que al comenzar la monetización se vuelve a aplicar el gating por plan.",
      "Un asesor NO debe decir 'eso es Premium' sobre estas capacidades mientras el early access siga vigente: hoy sería falso.",
    ],
    prerequisites: [],
    evidence: [
      "src/lib/product-entitlements/capabilities.ts:101",
      "src/lib/product-entitlements/capabilities.ts:130",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Hoy puedes usar la personalización avanzada sin importar tu plan.",
      "Ese acceso abierto es temporal y forma parte de la etapa de pruebas.",
    ],
    forbidden_claims: [
      "que la personalización avanzada sea Premium hoy",
      "que el acceso abierto sea permanente",
    ],
    related_capabilities: ["plan_premium", "marca_cripqer"],
  },
  {
    capability_id: "ia_negocio",
    title: "Asistente IA de tu negocio",
    description:
      "Asistente conversacional configurado por el dueño de cada página (quién es, servicios, horario, dirección, tiendas, FAQ, redes, precios) que responde a los visitantes de esa página.",
    customer_benefit:
      "Responder dudas de clientes en la página, a cualquier hora, con la información del propio negocio.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Requiere que el dueño lo active y lo configure; por defecto está deshabilitado.",
      "En Free, el servidor ELIMINA los campos Pro antes de llamar al modelo: servicios, horario, dirección, FAQ, tiendas, avatar e imágenes propias, redes y precios.",
      "Tiene cuota mensual por página (ver evidence): plan gratuito 60 mensajes, plan de pago 5000.",
      "Límite de ráfaga: 20 solicitudes por minuto por página; y recorte a los últimos 12 mensajes.",
      "El asistente responde con la información configurada; no inventa datos ni precios.",
    ],
    prerequisites: ["Una página publicada y el asistente configurado y activado por su dueño."],
    evidence: [
      "src/lib/landing-bot/core.server.ts:59",
      "src/lib/landing-bot/core.server.ts:111",
      "src/lib/landing-bot/tier-policy.ts:6",
      "src/lib/landing-bot/quota.ts:4",
      "src/lib/landing-bot/config.ts:16",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes tener un asistente que responde a tus visitantes con la información de tu negocio.",
      "En el plan gratuito el asistente funciona con la información básica; los datos ampliados son del nivel de pago.",
    ],
    forbidden_claims: [
      "que el asistente responde sobre cualquier tema ajeno al negocio",
      "que el asistente atiende sin límite de mensajes",
      "que el asistente reemplaza a una persona o a un sistema de ventas",
    ],
    related_capabilities: ["plan_free", "plan_premium"],
  },
  {
    capability_id: "tarjetas_bio",
    title: "Tarjeta Bio (enlace en bio)",
    description:
      "Página pública con la identidad del usuario: nombre, profesión, bio, avatar y enlaces, publicable en una URL propia con alias.",
    customer_benefit:
      "Un único enlace para poner en Instagram, TikTok o WhatsApp que reúne toda tu información y tus enlaces.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "La pantalla '/page' es un hub heredado que solo enlaza al editor canónico actual.",
      "El tipo de página interno no se llama 'bio': 'bio' es solo la plantilla inicial del documento.",
    ],
    prerequisites: ["Una cuenta y una página existente."],
    evidence: [
      "src/routes/p.$publicId.tsx:10",
      "src/routes/$alias.tsx:11",
      "src/components/profile/PublicProfileView.tsx:85",
      "src/lib/basic-templates/catalog.ts:133",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes tener una página con tu información y tus enlaces en una sola dirección.",
      "Tu página se puede ver sin que el visitante instale nada.",
    ],
    forbidden_claims: [
      "que la página aparece en buscadores con posicionamiento garantizado",
      "que el alias personalizado cambia el destino del QR",
    ],
    related_capabilities: ["enlace_personalizado", "qr", "magic_editor"],
  },
  {
    capability_id: "tipos_de_pagina",
    title:
      "Tipos de página (landing, servicios, catálogo, portafolio, menú, evento, promoción, campaña)",
    description:
      "El producto distingue ocho tipos de página, cada uno con su plantilla inicial: landing, promoción, menú, campaña, evento, servicios, catálogo y portafolio.",
    customer_benefit:
      "Elegir una estructura pensada para lo que el negocio necesita, en lugar de empezar de cero.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "No existe un tipo llamado 'business' ni 'bio' en el modelo de datos: 'negocio' se cubre con landings y servicios.",
      "CREAR una página nueva es hoy solo para administradores (política de base de datos + guarda en la interfaz).",
      "El flujo de creación sin registro para visitantes está EN VUELO por otro equipo y no está integrado en esta base.",
    ],
    prerequisites: ["Hoy: una cuenta con rol administrador para crear páginas nuevas."],
    evidence: [
      "src/types/database.ts:163",
      "src/components/power-editor/pageStarterConfig.ts:12",
      "supabase/migrations/20260930000001_restrict_page_creation_to_admins.sql:8",
      "src/routes/pages.new.tsx:54",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "CRIPQER ofrece varias estructuras de página según lo que necesites mostrar.",
      "Cada tipo de página viene con una plantilla inicial.",
    ],
    forbidden_claims: [
      "que un visitante puede crear su página por sí mismo hoy en esta versión",
      "que existe un tipo de página llamado 'business'",
    ],
    related_capabilities: ["catalogos", "magic_editor", "crear_pagina"],
  },
  {
    capability_id: "crear_pagina",
    title: "Empezar a crear tu página",
    description:
      "El camino desde visitante hasta tener una página propia. En esta base, crear páginas nuevas está restringido a administradores; el flujo de invitado sin registro lo está construyendo otro equipo.",
    customer_benefit: "Poder empezar sin fricción y sin decidir nada definitivo al principio.",
    status: "PARTIAL",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "En esta base, la creación de páginas está limitada a administradores a nivel de base de datos y de interfaz.",
      "El editor de invitado sin registro existe SOLO como trabajo sin commitear de otro equipo: estado INTEGRATION_NOT_VERIFIED.",
      "El asesor debe describir el alta como un registro, no como 'empieza a crear ahora'.",
    ],
    prerequisites: ["Una cuenta."],
    evidence: [
      "supabase/migrations/20260930000001_restrict_page_creation_to_admins.sql:8",
      "src/routes/pages.new.tsx:54",
      "src/routes/pages.new.tsx:67",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "CRIPQER tiene un plan gratuito y el alta se hace con una cuenta.",
      "Puedo mostrarte cómo se ve por dentro con las plantillas y la galería.",
    ],
    forbidden_claims: [
      "que ya puedes crear tu página sin registrarte",
      "que el editor se abre sin cuenta en esta versión",
    ],
    related_capabilities: ["tipos_de_pagina", "plan_free"],
  },
  {
    capability_id: "magic_editor",
    title: "Magic Editor",
    description:
      "El editor visual canónico de CRIPQER: se abre por página, con contrato de documento propio (magic-page v1) y render público separado.",
    customer_benefit: "Editar tu página viendo el resultado, sin conocimientos técnicos.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Requiere sesión y ser dueño de la página.",
      "Existen rutas de prototipo y laboratorio solo disponibles en desarrollo.",
    ],
    prerequisites: ["Una página propia."],
    evidence: [
      "src/routes/pages.$pageId.edit.tsx:13",
      "src/features/magic-page-editor-production/MagicProductionEditorHost.tsx:38",
      "src/features/magic-page-editor-production/magic-document.ts:4",
      "src/lib/product-entitlements/capabilities.ts:24",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes editar tu página de forma visual y publicar los cambios.",
      "El editor está disponible para todos los niveles, no solo para el plan de pago.",
    ],
    forbidden_claims: ["que el editor genera la página por ti con IA"],
    related_capabilities: ["tarjetas_bio", "tipos_de_pagina", "early_access_visual"],
  },
  {
    capability_id: "qr",
    title: "Código QR de tu página",
    description:
      "Cada página tiene su QR, con panel propio, exportación en PNG y SVG, y registro del escaneo.",
    customer_benefit: "Llevar tu página al mundo físico: vitrina, tarjeta, empaque, mostrador.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Solo el dueño de la página puede descargar su QR.",
      "Cada escaneo se registra una vez, y solo para páginas publicadas.",
    ],
    prerequisites: ["Una página publicada."],
    evidence: [
      "src/components/qr/PageQrPanel.tsx:47",
      "src/routes/q.$publicId.tsx:19",
      "src/services/page-qr.service.ts:24",
      "src/components/qr/__tests__/page-qr-payload.test.tsx",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Tu página incluye un QR que puedes descargar e imprimir.",
      "Puedes saber cuántas veces se escaneó tu QR.",
    ],
    forbidden_claims: ["que los QR caducan o dejan de funcionar"],
    related_capabilities: ["qr_dinamico", "analytics"],
  },
  {
    capability_id: "qr_dinamico",
    title: "QR dinámico (destino editable)",
    description:
      "El QR impreso apunta a una dirección fija de tu página, y el contenido se resuelve al momento del escaneo: si editas y republicas, el mismo QR lleva al contenido nuevo, sin reimprimir.",
    customer_benefit:
      "Imprimir una vez y poder cambiar lo que ve el cliente después, sin rehacer el material.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "El alias personalizado NO es el destino del QR: cambiarlo no cambia a dónde lleva el código.",
      "El destino solo cambia cuando la página está publicada; una página despublicada no resuelve.",
    ],
    prerequisites: ["Una página con QR descargado."],
    evidence: [
      "src/lib/url.ts:68",
      "src/routes/q.$publicId.tsx:22",
      "src/lib/page-alias.ts:9",
      "src/lib/__tests__/url.test.ts",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes actualizar el contenido de tu página y el QR que ya imprimiste sigue sirviendo.",
      "El QR no hay que reimprimirlo cada vez que cambias algo.",
    ],
    forbidden_claims: [
      "que el QR caduca",
      "que cambiar el enlace personalizado cambia el destino del QR",
      "que el QR puede apuntar a un dominio propio",
    ],
    related_capabilities: ["qr", "enlace_personalizado", "dominio_personalizado"],
  },
  {
    capability_id: "enlace_personalizado",
    title: "Enlace personalizado (alias)",
    description:
      "Cada página puede tener un alias legible en lugar del identificador largo, con nombres reservados protegidos.",
    customer_benefit: "Una dirección corta y fácil de dictar o imprimir.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Algunos nombres están reservados por el sistema.",
      "Es un alias dentro del dominio de CRIPQER; no es un dominio propio.",
    ],
    prerequisites: ["Una página propia."],
    evidence: [
      "src/lib/page-alias.ts:8",
      "src/lib/page-alias.ts:19",
      "src/services/page-alias.service.ts",
      "src/lib/__tests__/page-alias.test.ts",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes elegir una dirección corta y fácil de recordar para tu página.",
      "La dirección corta no altera el destino de tu QR.",
    ],
    forbidden_claims: [
      "que el alias es un dominio propio",
      "que el alias está garantizado como disponible",
    ],
    related_capabilities: ["tarjetas_bio", "qr_dinamico", "dominio_personalizado"],
  },
  {
    capability_id: "dominio_personalizado",
    title: "Dominio propio",
    description:
      "Conectar un dominio propio a la página. En esta base NO existe: el control de la interfaz es un aviso sin implementación.",
    customer_benefit: "Pendiente: no puede ofrecerse todavía.",
    status: "PLANNED",
    available_plans: [],
    limitations: [
      "Es un botón que muestra 'Conectar dominio / Disponible en el plan Pro' y NO ejecuta ninguna acción.",
      "Los documentos internos lo tratan como trabajo futuro.",
      "Ofrecerlo sería vender hoja de ruta como producto.",
    ],
    prerequisites: [],
    evidence: [
      "src/isolated/magic-page-editor/components/editor/PageSettings.tsx:120",
      "src/lib/renderer-capabilities/capabilities.ts:350",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: ["Hoy la página se publica en el dominio de CRIPQER con una dirección corta."],
    forbidden_claims: [
      "que puedes conectar tu propio dominio",
      "que el dominio propio está incluido en el plan de pago",
    ],
    related_capabilities: ["enlace_personalizado", "qr_dinamico"],
  },
  {
    capability_id: "analytics",
    title: "Analíticas de tu página",
    description:
      "Panel por página con visitas y clics de la página del dueño: escaneos de QR, visitas, apertura de sesión y clics (WhatsApp, redes sociales y enlaces externos).",
    customer_benefit: "Ver qué está funcionando: cuánta gente entra y qué toca.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Mide eventos de la página; no mide ventas ni ingresos.",
      "La lectura está acotada (histórico y volumen limitados) y usa la zona horaria de Chile.",
      "En producción, el sistema canónico está detrás de un interruptor que falla cerrado; sin él se leen los datos del sistema anterior (también reales).",
      "No identifica personas.",
    ],
    prerequisites: ["Una página publicada con el QR en circulación."],
    evidence: [
      "src/routes/pages.$pageId.analytics.tsx:34",
      "src/lib/analytics/canonical-writer.ts:18",
      "src/lib/analytics/feature-gate.ts:23",
      "src/services/analyticsRealDataService.ts:16",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes ver cuántas visitas y cuántos clics recibe tu página.",
      "Puedes ver los escaneos de tu QR y los clics a WhatsApp.",
    ],
    forbidden_claims: [
      "que las analíticas identifican a las personas que entran",
      "que miden ventas o ingresos",
      "que la inteligencia de negocio completa está incluida",
    ],
    related_capabilities: ["qr", "dashboard"],
  },
  {
    capability_id: "dashboard",
    title: "Panel del dueño",
    description:
      "Pantalla de inicio del usuario con su identidad, métricas de desempeño, actividad reciente y accesos rápidos, más la lista de sus páginas.",
    customer_benefit: "Tener todo lo importante en un solo lugar al entrar.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "El registro de navegación todavía marca 'Analíticas', 'Productos' y 'Conversiones' como futuras, aunque las analíticas por página ya existen: es un desfase del registro, no una función disponible de más.",
      "No prometer 'Productos' ni 'Conversiones' como secciones del panel.",
    ],
    prerequisites: ["Una cuenta."],
    evidence: [
      "src/routes/profile.tsx:6",
      "src/components/profile/MyProfilePage.tsx:232",
      "src/components/platform/platform-navigation.ts:50",
      "src/components/platform/platform-navigation.ts:145",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Al entrar tienes un panel con tus páginas y un resumen de actividad.",
      "Desde el panel llegas a las analíticas de cada página.",
    ],
    forbidden_claims: [
      "que el panel incluye secciones de Productos o Conversiones",
      "que el panel muestra ventas",
    ],
    related_capabilities: ["analytics", "tarjetas_bio"],
  },
  {
    capability_id: "catalogos",
    title: "Catálogo de productos o servicios",
    description:
      "Espacio de catálogo dentro de la página, que se abre sobre el mismo documento del editor, con alta de productos y enlace desde la página.",
    customer_benefit:
      "Mostrar lo que vendes con precios, dentro de la misma página, sin otra herramienta.",
    status: "AVAILABLE_VERIFIED",
    available_plans: ["free", "pro", "business", "enterprise"],
    limitations: [
      "Es una extensión de la página (mismo documento), no una tienda con cobro en línea.",
      "No procesa pagos: no prometer compra ni cobro.",
    ],
    prerequisites: ["Una página de tipo catálogo o una página con sección de catálogo."],
    evidence: [
      "src/routes/pages.$pageId.catalog.tsx:8",
      "src/features/magic-page-editor-production/catalog-products.ts:43",
      "src/components/power-editor/pageStarterConfig.ts:19",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: [
      "Puedes mostrar tus productos o servicios con sus precios dentro de tu página.",
      "El catálogo se administra desde el editor, junto con el resto de la página.",
    ],
    forbidden_claims: [
      "que el catálogo cobra en línea o procesa pagos",
      "que el catálogo se sincroniza con un sistema externo",
    ],
    related_capabilities: ["tipos_de_pagina", "magic_editor"],
  },
  {
    capability_id: "bloques_no_disponibles",
    title: "Bloques y medios que NO existen todavía",
    description:
      "El propio renderizador declara qué bloques y tipos de medio no están implementados. Esta entrada existe para que el asesor pueda decir 'eso no está' sin inventar.",
    customer_benefit: "Evitar promesas que la página no puede cumplir.",
    status: "NOT_AVAILABLE",
    available_plans: [],
    limitations: [
      "No implementados: galería y video (medios), bloques de galería, portafolio en grilla, antes/después, testimonios, prueba social, FAQ, horarios, ubicación, precios, insignias de confianza, producto, servicios, área de servicio, reserva nativa, formularios de cotización o contacto, CTA fijo y contacto flotante.",
      "La interfaz puede mostrar controles para algunos de ellos: la lista de arriba es la que manda.",
    ],
    prerequisites: [],
    evidence: [
      "src/lib/renderer-capabilities/capabilities.ts:350",
      "src/lib/renderer-capabilities/capabilities.ts:459",
      "src/lib/renderer-capabilities/capabilities.ts:487",
    ],
    last_verified: CATALOG_VERIFIED_ON,
    allowed_claims: ["Puedo decirte con precisión qué bloques existen hoy y cuáles no."],
    forbidden_claims: [
      "que existen bloques de testimonios, FAQ, horarios, ubicación o precios",
      "que se pueden subir videos o galerías",
      "que hay reserva de horas o formularios",
    ],
    related_capabilities: ["magic_editor", "catalogos"],
  },
];

/* ============================== guards ================================== */

/**
 * Claim patterns the advisor may never produce as a factual statement.
 * Used by CA-4 to reject unsupported commercial claims before they reach a
 * visitor, and by the tests as the catalog's own negative control.
 */
export const FORBIDDEN_CLAIM_PATTERNS: readonly RegExp[] = [
  /\$\s?\d/, // any explicit money amount
  /\b\d{3,}\s?(clp|pesos|usd)\b/i,
  /\b\d+\s?(días|dias|meses|años|anos)\s+(gratis|de prueba)/i, // trial length promises
  /\b(ilimitad[oa]s?|sin límite|sin limite)\b/i,
  /\b(para siempre|de por vida|perpetu[oa]s?)\b/i,
  /\b(próximamente|proximamente|coming soon|en camino|estamos trabajando en)\b/i, // roadmap sold as product
  /\b(descuento|promoción|promocion|oferta especial)\b/i,
  // Any conjugation of garantizar/asegurar promising an outcome. The gap is
  // bounded but non-empty: "Te garantizamos 100 clientes" must match too.
  /\b(garantiz\w*|asegur\w*)\b[^.!?]{0,40}\b(ventas|resultados|clientes|éxito|exito|ingresos)/i,
];

export interface ClaimVerdict {
  readonly safe: boolean;
  readonly matched: readonly string[];
}

/** Deterministic, side-effect-free claim screen. Conservative: it rejects. */
export function screenClaim(text: string): ClaimVerdict {
  const matched: string[] = [];
  for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
    const found = pattern.exec(text);
    if (found) matched.push(found[0]);
  }
  return { safe: matched.length === 0, matched };
}

export function findCapability(capabilityId: string): CapabilityRecord | null {
  return CAPABILITY_CATALOG.find((entry) => entry.capability_id === capabilityId) ?? null;
}

/** Capabilities the advisor may describe as usable today, for a given plan. */
export function capabilitiesForPlan(plan: CapabilityPlan): readonly CapabilityRecord[] {
  return CAPABILITY_CATALOG.filter(
    (entry) => entry.status === "AVAILABLE_VERIFIED" && entry.available_plans.includes(plan),
  );
}
