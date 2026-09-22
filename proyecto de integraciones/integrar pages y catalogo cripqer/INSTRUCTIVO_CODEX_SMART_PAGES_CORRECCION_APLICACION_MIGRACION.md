# CRIPQER SMART PAGES V1.1.1 + RETAIL PREMIUM

## Instructivo de corrección, aplicación y migración a Cripqer

**Documento de handoff para integración futura con Codex**  
**Estado:** Smart Pages Core V1.1.1 aprobado/congelado. Retail Premium aprobado como extensión arquitectónica, con micro-hardening pendiente antes del sello final de Retail.

---

## 1. PROPÓSITO

Este paquete NO es Cripqer completo y NO debe copiarse entero al repositorio.

Es un módulo portátil construido en un sandbox de Lovable para aportar:

- Smart Pages / mini-páginas profesionales
- Catálogos
- Servicios
- Portfolios
- Menús/restaurantes
- Listings
- Mini-sites de 1–5 páginas
- Conversión asistida: WhatsApp, contacto, quote, booking externo y URL externa
- Composición Retail / Store Premium
- Contratos de ecosistema, navegación y analytics
- Intake/normalización para JSON, CSV y texto
- Boundaries para PDF, DOCX, XLSX, imágenes y URL
- Boundary hacia Engine V2

**No incluye por diseño:** pagos reales, checkout visible, carrito backend, órdenes, Supabase, auth, rutas de producción ni persistencia de Cripqer.

---

## 2. CARPETA FUENTE AUTORITATIVA

El ZIP actual contiene DOS árboles completos.

### USAR SOLAMENTE

```text
CRIPQER_SMART_PAGES_V1_1_1/
```

Esta es la versión más reciente y contiene:

```text
retail-presentation.ts
runtime/MasterPageRuntime.tsx   (versión Retail)
runtime/blocks.tsx              (bloques Retail)
smart-pages.css                 (estilos Retail)
smart-pages.fixtures.ts         (fixture Retail ampliada)
```

### IGNORAR / NO MIGRAR

```text
cripqer-smart-pages-v1.1.1/
```

Ese árbol es la versión anterior sin la extensión Retail actualizada.

**Regla:** nunca entregar ambos árboles a Codex como si fueran equivalentes.

---

## 3. BASELINE CONGELADO — NO REDISEÑAR

Tratar como baseline aprobado:

- `catalog.types.ts`
- `smart-pages.types.ts`
- `content-normalizer.ts`
- `intake-adapters.ts`
- `business-presets.ts`
- `page-orchestrator.ts`
- `sales-actions.ts`
- `ecosystem.ts`
- `engine-v2-adapter.ts`
- arquitectura de `MasterPageRuntime`
- librería reusable de bloques
- navegación responsive + hamburger
- item-level action authority
- CTA fallback semántico
- mini-sites truthful 1–5
- checkout siempre oculto en V1
- ausencia de pagos/provider backend

**No hacer:** refactor general, renombrado masivo, nueva arquitectura, nuevo engine, nuevo editor, nuevo router o nuevo schema canónico.

---

# PARTE A — MICRO-CORRECCIONES ANTES DEL SELLO FINAL RETAIL

## 4. CORRECCIÓN 1 — ACTIVACIÓN REAL DE RETAIL PREMIUM

### Problema actual

Existe:

```ts
deriveRetailPresentation(content);
```

y `MasterPageRuntime` acepta:

```ts
retail?: RetailPresentationV1
```

pero el paquete no conecta automáticamente ambas piezas.

### Corrección esperada

La composición Retail debe activarse automáticamente SOLO cuando la experiencia sea realmente `catalog` / Retail, sin contaminar `menu`, `services`, `portfolio` ni `listings`.

Patrón recomendado:

```text
host retail override explícito
        ↓ si no existe
plan.experienceType === "catalog"
        ↓
deriveRetailPresentation(content)
        ↓
effectiveRetail
```

**Importante:** no aplicar Retail Premium a cualquier catálogo interno de servicios o menú por accidente.

El host debe conservar la posibilidad de proporcionar una presentación explícita si más adelante Engine V2/host quiere controlar merchandising.

---

## 5. CORRECCIÓN 2 — PRODUCT RAIL SECUNDARIO

### Problema actual

`ProductRail` y `secondaryCollection` existen, pero el runtime los omite cuando ya hay un grid completo de productos.

Eso elimina una superficie de merchandising válida.

### Corrección esperada

Permitir que una colección secundaria aparezca aunque exista `ProductGrid`, siempre que:

- tenga al menos 2 items reales;
- use IDs reales ya existentes;
- no invente labels comerciales;
- el diseño no cree repetición visual absurda.

La repetición controlada de productos en una colección destacada y luego en el catálogo completo es válida como **merchandising**.

---

## 6. CORRECCIÓN 3 — ORDEN DE COMPOSICIÓN RETAIL

No modificar el `PagePlanV1` canónico sólo para conseguir el layout.

La capa `RetailPresentationV1` debe reordenar/incrustar visualmente la experiencia Retail para aproximarse a:

```text
Hero
↓
Categories
↓
Featured
↓
Collection / Promo Banner
↓
Secondary Collection / Product Rail
↓
Full Catalog
↓
Why Us / Benefits
↓
FAQ / Testimonials si existen
↓
WhatsApp / Contact
↓
Premium Footer
```

No todos los bloques son obligatorios: mostrar únicamente contenido real.

**No inventar:** descuentos, “Best Seller”, “Trending”, “New”, ratings, urgencia, testimonios o promociones.

---

## 7. CORRECCIÓN 4 — `gridDensity` DEBE TENER EFECTO REAL

Actualmente `RetailPresentationV1` calcula:

```ts
gridDensity: "standard" | "dense";
```

pero no debe quedar como metadata muerta.

### Esperado

Aplicar una clase/variable presentation-only, por ejemplo conceptualmente:

```text
sp-retail--standard
sp-retail--dense
```

para controlar de forma responsive:

- número de columnas;
- gap;
- tamaño de media;
- densidad de card;

Sin afectar otras verticales.

---

## 8. MICRO-HARDENING GENERAL PENDIENTE

Estos puntos no bloquean la arquitectura, pero deben cerrarse durante integración o antes del checkpoint final:

### 8.1 `page_view`

`AnalyticsEventV1` declara `page_view`, pero el runtime no lo emite automáticamente.

Implementar **un page view lógico por `pageId`**, evitando duplicados por re-render/state changes y cuidando React Strict Mode en desarrollo.

### 8.2 `buttonStyle`

`RuntimeThemeV1` declara:

```ts
buttonStyle: "solid" | "soft" | "outline";
```

pero debe afectar realmente la presentación.

Conectar el token al runtime/CSS sin romper jerarquía primary/secondary.

### 8.3 Navbar `activeId`

El componente Navbar soporta `activeId`, pero el runtime principal no lo alimenta.

Implementar estado activo real para navegación de secciones y/o páginas internas.

Preferencia: `IntersectionObserver` ligero para secciones cuando corresponda; sin dependencia externa.

---

# PARTE B — QUÉ SE MIGRA Y QUÉ NO

## 9. ARCHIVOS DE PRODUCCIÓN CANDIDATOS

Después de auditar el repo actual de Cripqer, Codex puede integrar selectivamente:

```text
catalog.types.ts
smart-pages.types.ts
content-normalizer.ts
intake-adapters.ts
business-presets.ts
page-orchestrator.ts
sales-actions.ts
ecosystem.ts
retail-presentation.ts
engine-v2-adapter.ts
index.ts
```

`runtime/`, `smart-pages.css` y bloques visuales requieren una decisión arquitectónica explícita descrita más abajo.

---

## 10. ARCHIVOS QA / DEMO — NO COPIAR CIEGAMENTE A PRODUCCIÓN

```text
smart-pages.fixtures.ts
demo-media/*
```

Estos archivos sirven para:

- Story/Lab interno;
- pruebas visuales;
- regresión;
- screenshots;
- QA.

No deben terminar automáticamente en el bundle/public assets de producción.

Si se conservan, colocarlos en un área QA/lab claramente separada.

---

# PARTE C — REGLA ARQUITECTÓNICA MÁS IMPORTANTE DE LA MIGRACIÓN

## 11. NO CREAR UN SEGUNDO DOCUMENTO CANÓNICO NI UN SEGUNDO ENGINE

El README del paquete establece el camino real:

```text
Smart Pages semantic input
      ↓
PageGenerationRequest
      ↓
Page Orchestrator
      ↓
PagePlanV1 / MiniSitePlanV1
      ↓
Engine V2 Adapter
      ↓
HOST Engine V2
      ↓
BioTemplateConfig
      ↓
Persistencia canónica
      ↓
Basic Editor / Power Editor 2 / renderer host
```

### CONSECUENCIA

`RuntimePageConfigV1` y `MasterPageRuntime` NO deben convertirse automáticamente en una segunda fuente de verdad paralela a `BioTemplateConfig`.

Cripqer ya tiene una dirección canónica basada en:

```text
BioTemplateConfig
schemaVersion = 1
```

y ambos editores deben seguir leyendo/escribiendo el mismo documento canónico.

---

## 12. DOS MODOS POSIBLES DE USO DEL MASTER RUNTIME

### MODO A — RECOMENDADO / CANÓNICO

```text
Smart Pages
→ PagePlan / RetailPresentation
→ Engine V2 host adapter
→ BioTemplateConfig
→ renderer canónico de Cripqer
```

En este modo:

- `MasterPageRuntime` queda para sandbox / Engine Lab / preview / QA;
- los bloques/composiciones Retail sirven como referencia/semántica visual que Engine V2 debe expresar en el documento canónico;
- NO aparece un segundo renderer de producción.

### MODO B — EXCEPCIÓN CONTROLADA

Usar `MasterPageRuntime` como renderer real de una superficie Smart Page sólo si una auditoría demuestra que el renderer canónico actual todavía no puede expresar una capacidad necesaria.

Si se usa MODO B:

- requiere aprobación explícita;
- no debe crear segunda persistencia canónica;
- debe seguir recibiendo datos derivados de la misma autoridad host;
- debe existir plan de convergencia con `BioTemplateConfig`.

**No adoptar MODO B por comodidad.**

---

# PARTE D — SECUENCIA DE MIGRACIÓN A CRIPQER

## 13. FASE 0 — AUDITORÍA READ-ONLY OBLIGATORIA

Antes de escribir una sola línea, Codex debe inspeccionar el estado ACTUAL del repo porque Engine V2, Power Editor 2, Onboarding y rutas pueden haber cambiado desde la creación de este paquete.

### Auditar

- HEAD / branch actual;
- dirty/untracked files;
- ubicación real de Engine V2;
- contrato real actual de `BioTemplateConfig`;
- renderer público real;
- Basic Editor actual;
- Power Editor 2 actual;
- persistencia canónica actual;
- rutas públicas;
- analytics existentes;
- sistema actual de media/uploads;
- estado real de Onboarding V2;
- cualquier Smart Pages/Commerce previo ya integrado.

### Salida de Fase 0

Clasificar cada pieza del paquete como:

```text
KEEP
ADAPT
HOST-MAP
QA-ONLY
DO-NOT-MIGRATE
```

**0 modificaciones en esta fase.**

---

## 14. FASE 1 — IMPORTACIÓN AISLADA DEL CORE SEMÁNTICO

Crear el namespace/ruta interna de código que mejor encaje con el repo ACTUAL.

No imponer una carpeta exacta antes de la auditoría.

Importar primero sólo piezas framework-light:

- contratos;
- normalizer;
- intake adapters;
- presets;
- orchestrator;
- sales actions;
- ecosystem contracts;
- retail presentation;
- Engine V2 boundary.

### Gate

- TypeScript PASS;
- lint target PASS;
- no dependencias nuevas;
- no rutas nuevas;
- no DB;
- no UI pública todavía.

---

## 15. FASE 2 — ADAPTER `OnboardingIntentV2 → PageGenerationRequest`

Sólo implementar cuando el contrato actual de Onboarding V2 esté aprobado.

Si todavía está evolucionando:

- conservar boundary;
- no congelar mapping inventado;
- no acoplar Smart Pages a campos temporales.

El adapter debe traducir, como mínimo cuando existan:

```text
business type
objective
density
content needs
primary CTA
secondary CTAs
media intent
sales mode
normalized content
```

No introducir controles visuales finos del Power Editor en onboarding.

---

## 16. FASE 3 — ADAPTER REAL HACIA ENGINE V2

Codex debe reemplazar/mockear correctamente el boundary portable con el Engine V2 REAL del repo.

Flujo objetivo:

```text
PagePlanV1
+ NormalizedContentV1
+ RetailPresentationV1 cuando aplique
+ EcosystemContext
        ↓
Cripqer Engine V2 Host Input
        ↓
Engine V2
        ↓
BioTemplateConfig
```

### Reglas

- no redefinir `BioTemplateConfig`;
- no crear Engine V3;
- no copiar lógica visual de Engine V2 dentro de Smart Pages;
- Retail debe convertirse en instrucciones/semántica que Engine V2 pueda representar;
- si una semántica Retail no cabe en Engine V2, REPORTAR antes de ampliar contrato.

---

## 17. FASE 4 — PERSISTENCIA CANÓNICA

No crear tablas automáticamente desde este paquete.

Primero inspeccionar la persistencia real de páginas/templates.

Objetivo conceptual:

```text
Smart Page identity / metadata
          ↓
canonical page document = BioTemplateConfig
          ↓
revision / CAS
          ↓
existing host persistence
```

### Reglas

- preservar IDs estables;
- preservar public IDs / QR históricos;
- no alterar `/p` o `/d` sin autorización;
- no crear segunda columna JSON competidora si ya existe `template_config` canónico;
- Basic debe hacer safe partial patch;
- Power puede editar capacidades avanzadas;
- unknown/Power fields deben sobrevivir una edición Basic.

---

## 18. FASE 5 — IDENTIDAD DE SMART PAGES / MINI-SITE

Si Cripqer necesita páginas hijas/mini-sites, resolver host-side una identidad estable por página.

Modelo conceptual permitido:

```text
MiniSiteProjectV1
  ├─ shared business/catalog context
  ├─ navigation
  └─ pages[]
       ├─ pageId
       ├─ slug
       ├─ role/title
       └─ BioTemplateConfig
```

Cada página conserva un documento canónico; no crear un megadocumento CMS si no es necesario.

La implementación real depende del modelo actual de DB y debe auditarse antes.

---

## 19. FASE 6 — DESTINOS DESDE TARJETAS/BOTONES DE CRIPQER

Flujo de producto futuro:

```text
Usuario configura botón/tarjeta
        ↓
¿Ya tienes destino?
   ├─ Sí → URL externa
   └─ No → Crear con Cripqer
                 ↓
            Smart Page
```

Contrato conceptual ya preparado:

```text
external
internal_page
section
```

### Codex debe integrar después

- modal real del editor;
- selector external/internal;
- creación/selección de Smart Page;
- persistencia de `pageId` interno;
- resolución de URL estable;
- navegación pública.

No cambiar el contrato de destinos sin necesidad.

---

## 20. FASE 7 — ANALYTICS

Smart Pages sólo emite hooks/eventos.

Integrar con el pipeline de analytics REAL de Cripqer, si ya existe.

Eventos previstos:

```text
page_view
section_view
cta_click
item_click
whatsapp_click
contact_click
quote_click
booking_click
external_link_click
internal_page_click
```

### No hacer

- segunda base analytics;
- tablas nuevas sin auditoría;
- métricas falsas;
- eventos duplicados.

La meta es que perfil principal + Smart Pages + QR puedan verse en un mismo universo analítico.

---

## 21. FASE 8 — QR / URL ESTABLE

Smart Pages debe recibir URLs host estables.

No tocar el contrato histórico de QR de Cripqer sin una migración aprobada.

El host podrá después apuntar:

```text
QR menú      → Smart Page Menu
QR portfolio → Smart Page Portfolio
QR catálogo  → Smart Page Catalog
```

pero el paquete Smart Pages no genera ni administra identidades QR.

---

## 22. FASE 9 — INPUTS PDF / WORD / EXCEL / IMAGEN / URL

Estado actual honesto:

```text
JSON       REAL
CSV        REAL
Plain text REAL
PDF        ADAPTER ONLY
DOCX       ADAPTER ONLY
XLSX       ADAPTER ONLY
Images     ADAPTER ONLY
URL        ADAPTER ONLY
```

Durante integración:

- conectar extractores host sólo si ya existen o son una tarea aprobada;
- mantener `registerIntakeAdapter()` como boundary;
- no afirmar que un formato está soportado si sólo existe adapter;
- AI/OCR nunca debe inventar precio, stock, SKU, descuento, disponibilidad, contacto u otros datos críticos.

---

# PARTE E — RETAIL / COMMERCE

## 23. RETAIL PREMIUM NO ES UN SEGUNDO ECOMMERCE

Retail utiliza:

```text
NormalizedContentV1
+ CatalogV1
+ PagePlanV1
+ RetailPresentationV1
```

para producir merchandising visual:

- category tiles;
- featured items;
- collection banner;
- secondary collection;
- dense/standard product grids;
- benefits;
- product detail;
- assisted conversion.

No crear:

- `RetailEngine`;
- segundo catálogo;
- segunda persistencia;
- Shopify clone.

---

## 24. PAGOS SIGUEN FUERA

Mantener:

```text
checkoutEnabled = false
```

No integrar aquí:

- Stripe;
- PayPal;
- Mercado Pago;
- cart backend;
- orders;
- inventory backend;
- merchant payouts.

Los pagos de suscripción de Cripqer y los pagos futuros de los clientes de un comerciante son dominios diferentes.

---

# PARTE F — ACEPTACIÓN TÉCNICA

## 25. TESTS MÍNIMOS DEL CORE

Validar:

- TypeScript target;
- lint del scope;
- build;
- orchestrator determinista;
- item.action authority;
- quote/contact fallback;
- mini-site truthful 1–5;
- Retail autoderive sólo para catalog;
- Retail override explícito;
- ProductRail visible cuando corresponde;
- `gridDensity` real;
- checkout invisible;
- no payment provider imports.

---

## 26. REGRESIÓN POR VERTICALES

Probar mínimo:

```text
Restaurant
Veterinarian
Hairdresser
Real Estate
Photographer
Retail
```

La extensión Retail no debe alterar la composición de otras verticales.

---

## 27. QA RESPONSIVE

Mínimo:

```text
320
360
390
430
768
1024
1440
```

Verificar:

- hamburger;
- no horizontal overflow;
- cards;
- hero;
- grids Retail;
- ProductRail;
- modal/detail;
- footer;
- focus/keyboard;
- reduced motion.

---

## 28. QA CANÓNICO BASIC ↔ POWER

Antes de producción, probar explícitamente:

```text
Engine V2 genera Smart Page
↓
BioTemplateConfig se persiste
↓
Basic Editor abre y edita campos permitidos
↓
Power Editor 2 abre el mismo documento
↓
Power cambia presentación avanzada
↓
Basic vuelve a abrir
↓
campos Power/unknown permanecen intactos
```

Este gate es obligatorio para declarar integración completa.

---

# PARTE G — HYGIENE / CHECKPOINT

## 29. PAQUETE FINAL LIMPIO

Después de aplicar micro-hardening, producir un único árbol, por ejemplo:

```text
CRIPQER_SMART_PAGES_V1_1_1_FINAL/
```

Debe contener sólo la versión actualizada.

No duplicar carpeta antigua.

Separar:

```text
CORE / production candidates
QA / fixtures
DEMO MEDIA
DOCS
```

---

## 30. CHECKPOINT RECOMENDADO

Una vez que los micro pendientes pasen QA:

```text
🔒 CRIPQER SMART PAGES CORE + PREMIUM RUNTIME V1.1.1
🔒 RETAIL PREMIUM PRESENTATION V1
```

El checkpoint debe enumerar exactamente:

- commit;
- archivos importados;
- archivos modificados;
- archivos QA only;
- migraciones DB (idealmente ninguna salvo plan host aprobado);
- nuevas rutas (si hubo, explícitas);
- validaciones;
- pendientes NOT_VERIFIED.

---

# PARTE H — REGLAS PARA CODEX

## 31. READ SCOPE

Codex puede leer únicamente lo necesario para:

- entender el paquete Smart Pages;
- localizar Engine V2;
- localizar BioTemplateConfig;
- localizar renderer/editor/persistence;
- localizar analytics/media/routing relevantes.

No hacer auditoría A–Z del repo salvo autorización.

---

## 32. WRITE SCOPE

En cada fase, escribir únicamente archivos previamente declarados.

Si aparece una dependencia inesperada fuera del scope:

```text
STOP
REPORT
ASK FOR AUTHORIZATION
```

---

## 33. FROZEN SCOPE

No tocar sin autorización específica:

- Canvas/Zoom congelado;
- QR/public IDs históricos;
- Auth general;
- Supabase fuera de la tarea;
- Billing;
- Documentos cifrados;
- rutas no relacionadas;
- templates/renderers no necesarios;
- Engine V2 internals salvo adapter explícito;
- Power Editor 2 internals salvo integración aprobada.

---

## 34. GIT SAFETY

Prohibido:

```text
git reset --hard
git clean
git add .
git add -A
```

Preservar dirty/untracked work.

Stagear sólo archivos exactos de la tarea.

---

## 35. REPORTE FINAL OBLIGATORIO

Codex debe reportar:

```text
HEAD inicial
HEAD final
archivos leídos relevantes
archivos modificados
archivos añadidos
archivos eliminados
rutas añadidas/modificadas
DB/migrations
new deps
build
TypeScript
lint
runtime QA
browser QA
Basic ↔ Power preservation test
Retail test
out-of-scope findings
frozen-scope violations: NONE / list
NOT_VERIFIED items
```

---

# RESUMEN EJECUTIVO PARA EL AGENTE

**No reconstruyas Smart Pages.**

1. Usa sólo `CRIPQER_SMART_PAGES_V1_1_1/` como fuente actual.
2. Corrige los micro pendientes Retail/general.
3. Primero audita el estado actual de Cripqer en READ-ONLY.
4. Importa el core de forma aislada.
5. Conecta Smart Pages → Engine V2 → `BioTemplateConfig`.
6. Mantén `BioTemplateConfig` como única fuente canónica de página.
7. No conviertas `MasterPageRuntime` en segundo renderer de producción salvo aprobación explícita.
8. Integra después destinos internos/externos, analytics y URLs host.
9. Mantén checkout/pagos fuera.
10. Valida Basic ↔ Power sobre el mismo documento sin pérdida de datos.
11. Limpia fixtures/demo media de producción.
12. Cierra con checkpoint y evidencia exacta.

**Objetivo final:**

```text
Cripqer Profile / QR / Onboarding
          ↓
Smart Pages semantic layer
          ↓
Page Orchestrator
          ↓
Engine V2
          ↓
BioTemplateConfig
          ↓
Canonical persistence
          ↓
Basic Editor ↔ Power Editor 2
          ↓
Published Smart Page / Mini-Site
          ↓
Analytics / ecosystem
```

Sin crear otro Cripqer, otro Engine, otro editor ni otra fuente de verdad.
