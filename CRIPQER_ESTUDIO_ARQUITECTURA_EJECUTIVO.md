# CRIPQER — Estudio Ejecutivo de Arquitectura y Valoración Técnica

> **Destinatario:** Ejecutivos / dueños del producto
> **Alcance:** Estado real del producto, arquitectura, funcionalidad implementada, planes futuros y valoración **exclusivamente a nivel de arquitectura**.
> **Fuente:** Estudio consolidado de todos los README y documentos `.md` del repositorio (`daniel1743/codigos_qr`).
> **Modo:** Lectura y análisis de documentación + verificación de código fuente.

---

## 1. Resumen Ejecutivo

**Cripqer** ha dejado de ser un "generador de QR" y se ha reposicionado oficialmente como una **Plataforma de Conversión Inteligente** ("De la atención al cliente"). La propuesta única de valor documentada es:

> "Cripqer no organiza enlaces. Cripqer construye y opera el recorrido completo de conversión de tu negocio."

El producto tiene **dos funcionalidades estrella (killers) ya maduras y operativas**, un **stack tecnológico de primer nivel**, pero un **hueco crítico en monetización (Billing) y en visualización analítica para el cliente final**, que es lo que le impide ser hoy un SaaS monetizable.

### Veredicto arquitectónico en una línea

> **Arquitectura sólida y sobre-dimensionada respecto al UI visible: hay más "músculo técnico" ya construido que el que la documentación de marketing sugiere. El producto está a semanas de ser monetizable, pero aún no está listo para un beta privado.**

---

## 2. ¿Qué es Cripqer? (Posicionamiento)

| Dimensión            | Antes                                       | Ahora (aprobado)                                                      |
| -------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| Posicionamiento      | "Generador de QR con página personalizable" | "Plataforma de Conversión Inteligente"                                |
| Competidor           | Linktree (organizar enlaces)                | Combate la "fuga de intención" (intent leakage)                       |
| Cadena de valor      | Audiencia → Enlaces → Destino               | Audiencia → Intención → Conversión → Cliente → Relación → Crecimiento |
| Foso (moat) objetivo | Templates / botones / editor                | Datos históricos de conversión + atribución de resultados             |

**Flujo estratégico validado por mercado (2026-09-09):**

```
SOCIAL / QR / GOOGLE / ADS → VISITA → INTENCIÓN → PÁGINA/OFFERTA → CTA
→ HANDOFF → OUTCOME → ATRIBUCIÓN → FOLLOW-UP → APRENDIZAJE
```

**Niveles de producto definidos (estrategia):** Free · Pro · Business · Enterprise · Agency (futuro opcional).
**Principio congelado:** "La seguridad criptográfica nunca se debilita para monetizar."

---

## 3. Estado Real del Producto (Implementado vs. Documentado)

El estudio "Master Product Map" distingue con rigor entre lo **documentado** y lo **implementado en código**. Esto es clave para no inflar la valoración.

### 3.1 Rutas activas (conectadas al router)

| Ruta                                                                                                                                                                    | Función                                | Estado         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------- |
| `/`                                                                                                                                                                     | Landing pública (`CripqerLanding`)     | ✅ Activa      |
| `/$alias`                                                                                                                                                               | Perfil público por alias (ej. `/juan`) | ✅ Activa      |
| `/p/$publicId`                                                                                                                                                          | Perfil público (fallback/UUID)         | ✅ Activa      |
| `/admin`                                                                                                                                                                | Panel de administración global         | ✅ Activa      |
| `/editor`                                                                                                                                                               | Editor principal de QR y perfil        | ✅ Activa      |
| `/encrypted-documents`                                                                                                                                                  | Dashboard de documentos cifrados       | ✅ Activa      |
| `/d/$shortUrl`                                                                                                                                                          | Descarga pública de documento seguro   | ✅ Activa      |
| `/profile`                                                                                                                                                              | Dashboard del usuario                  | ✅ Activa      |
| `/plataforma` · `/page` · `/pages`                                                                                                                                      | Páginas / sistema de páginas           | ✅ Activa      |
| `/template-lab` · `/engine-lab` · `/onboarding-preview` · `/power-editor` · `/power-editor-phase4-qa` · `/internal.power-editor` · `/pages.new` · `/pages.$pageId.edit` | Entornos de desarrollo / internos      | 🔒 Dev/interno |

### 3.2 Funcionalidades maduras (Nivel de madurez)

| Dominio                               | Nivel                           | Detalle                                                                                                              |
| ------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Link-in-bio (Identidad & Links)**   | **4 (Maduro)**                  | ~14 "Basic Templates", colores avanzados, slugs en tiempo real.                                                      |
| **Generación QR Avanzada**            | **4 (Maduro)**                  | Logos, formas, dots, colores de esquina, marcos, gradientes, corrección de error.                                    |
| **Documentos Seguros (Encrypted QR)** | **5 (Grado militar)**           | E2EE AES-GCM 256, Zero-Knowledge, `FOR UPDATE` atómico, descarga 1 solo uso, autodestrucción, URLs firmadas de 60 s. |
| **Autenticación + RLS**               | **Impecable**                   | Auth de Supabase y políticas RLS correctas.                                                                          |
| **Monetización / Billing**            | **1 (Mock)**                    | `isPremium` hardcodeado a `false`; sin pasarela real (Stripe).                                                       |
| **Analytics para usuario final**      | **2 (Recolecta, no visualiza)** | Endpoints y gráficos (Recharts) existen, pero no se muestran al cliente.                                             |

### 3.3 Falso positivo documental vs. realidad

- **Power Editor V6 (drag & drop):** muy documentado, pero **físicamente inexistente en `main`**; fue un experimento en otra rama (`feat/power-editor-v6`).
- **OnlyFans QR, Gamificación, lead capture avanzado:** documentado a gran escala en el roadmap, **nada implementado**.
- **Onboarding V2:** la _arquitectura objetivo_ está diseñada (`CRIPQER_ONBOARDING_V2_TARGET_ARCHITECTURE.md`), pero marcada como **"DESIGN ONLY — NOT IMPLEMENTED"**.

### 3.4 Estado de preparación (Readiness) — último gate

El reporte de **Phase 6 Product Readiness (2026-09-05)** concluye:

| Gate                                                                  | Resultado                            |
| --------------------------------------------------------------------- | ------------------------------------ |
| Disponibilidad local (`/onboarding-preview`, `/editor`, Power Editor) | ✅ PASS                              |
| Build / ESLint / Prettier / `git diff --check`                        | ✅ PASS                              |
| Flag / kill-switch de Onboarding V2                                   | ❌ BLOCKED (no existe feature flag)  |
| Cross-profile RLS (segundo usuario QA)                                | ❌ BLOCKED                           |
| Staging privado / preview HTTPS                                       | ❌ BLOCKED (no provisionado)         |
| Logout autenticado (queda en `/editor`)                               | ❌ BLOCKED                           |
| `npx tsc --noEmit`                                                    | ❌ FAIL (diagnósticos preexistentes) |
| **ONBOARDING_V2_PRODUCT_READINESS**                                   | ❌ **No listo para beta privado**    |

---

## 4. Arquitectura Técnica (Stack)

### 4.1 Frontend

| Capa                   | Tecnología                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Framework / SSR        | **TanStack Start 1.168** + **React 19.2**                                                                |
| Enrutamiento           | **TanStack Router 1.170** (type-safe)                                                                    |
| Estado/servidor        | TanStack React Query 5                                                                                   |
| Estilos                | **Tailwind CSS v4** + tw-animate-css                                                                     |
| Componentes            | shadcn/ui + Radix UI (30+ primitivas)                                                                    |
| Formularios/validación | react-hook-form 7 + zod 3                                                                                |
| Gráficos               | recharts 2                                                                                               |
| QR                     | qr-code-styling, qrcode.react, qrcode-generator                                                          |
| Partículas/efectos     | tsparticles (engine/react/slim)                                                                          |
| Carrousel              | embla-carousel-react                                                                                     |
| Otros                  | cmdk, vaul, input-otp, react-resizable-panels, date-fns, sonner, lucide-react, browser-image-compression |

### 4.2 Backend / Plataforma

| Capa                           | Tecnología                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| Base de datos / Auth / Storage | **Supabase** (Postgres + Auth + RLS + Storage + RPC)                                          |
| Cliente                        | `@supabase/supabase-js 2.112`, `@supabase/ssr 0.12`                                           |
| Server runtime                 | **Nitro 3** (beta)                                                                            |
| Hosting / deploy               | **Vercel** (build funcional `.vercel/output`), Cloudflare (wrangler), conectado a **Lovable** |

### 4.3 Calidad / Testing

| Herramienta                            | Uso                                            |
| -------------------------------------- | ---------------------------------------------- |
| Playwright 1.62                        | E2E (`e2e/onboarding-v2-phase5.spec.ts`, etc.) |
| Vitest 4 + happy-dom                   | Tests unitarios (`src/lib/__tests__`)          |
| ESLint 9 + Prettier 3 + TypeScript 5.8 | Calidad de código                              |

### 4.4 Módulos de dominio (`src/lib`)

```
basic-editor-adapter · basic-editor-persistence · basic-templates
billing · canonical-page (schemaVersion: 1)
design · editor-routing · host-contracts
onboarding · onboarding-v2
parametric-engine · parametric-engine-v2   ← "Engine V2" (motor de generación)
product-entitlements · qr-export · renderer-capabilities · smart-link-preview
supabase · encryption.ts                     ← E2EE
```

---

## 5. Arquitectura de Datos (Supabase)

- **40 migraciones** versionadas cronológicamente, desde `init` (2026-08-17) hasta `add_verification_variant` (2026-09-12).
- Tablas/clusters clave documentados: `profiles`, `links`, `analytics`, `admin_users`, `encrypted_documents`, `canonical_billing_persistence`, `pages`, `onboarding_invite`, snapshots canónicos publicados.
- **Persistencia canónica:** sobre `template_config` con `schemaVersion: 1` + funciones de patch (`add_canonical_page_patch_functions`).
- **El esquema está sobre-dimensionado frente al UI actual** — hay capacidades de BD (gradientes QR, `qr_studio`, `qr_stats_and_history`, fuentes independientes, etc.) que aún no se exponen por completo en la interfaz.

### RLS y seguridad de acceso

- RLS aplicado a lo largo de las migraciones (`fix_avatar_storage_policies`, `secure_document_access_rpcs`, `fix_constraints_and_admin_rls`).
- Control de acceso atómico para documentos con `SELECT ... FOR UPDATE`.
- Endpoints privilegiados aislados en `src/lib/supabase/server-privileged`.

---

## 6. Arquitectura de Seguridad / Encriptación (la "Criptografía" de Cripqer)

Es el segundo pilar "killer" del producto y el activo arquitectónico **mejor valorado** (Nivel 5).

### Cómo funciona (verificado en `src/lib/encryption.ts`)

1. **Encriptación 100% en el navegador (Zero-Knowledge):** el archivo se cifra **antes** de subir a Supabase Storage. El servidor nunca ve la contraseña ni la clave.
2. **Algoritmo:** AES-256-GCM (cifrado autenticado) con IV aleatorio de 12 bytes.
3. **Derivación de clave:** PBKDF2 con SHA-256 (100.000 iteraciones para cifrado; 10.000 para hash de contraseña) + salt aleatorio de 16 bytes.
4. **Almacenamiento:** se guarda el _ciphertext_ (`.bin`); el hash de la contraseña y el salt se guardan por separado.
5. **Entrega:** RPC valida la contraseña, genera **Signed URL temporal (60 s)** en Storage y registra el acceso; el navegador descifra localmente y dispara la descarga con el nombre/tipo original.
6. **Controles:** expiración por horas, descargas de **1 solo uso**, autodestrucción lógica, tamaño máximo 50 MB, tipos de documento etiquetados.

### Principios de estrategia (congelados)

- La fortaleza criptográfica **nunca se debilita** para planes baratos.
- Se monetiza la **administración, gobernanza, trazabilidad y controles empresariales** — no la criptografía insegura.
- Packaging recomendado: Free=Secure Basic · Pro=Secure Advanced · Business=Secure Control · Enterprise=Secure Governance.
- ⚠️ _Open decision:_ el README señala que existen **tres modos de encriptación/seguridad reportados** cuyo comportamiento técnico real **debe auditarse** antes de asignarlos comercialmente.

---

## 7. Motor de Generación (Engine V2) y Onboarding

### Engine V2 (motor paramétrico)

- Es el motor de generación **para todos los usuarios** (Free y Pro comparten el mismo motor; Free no usa un motor debilitado deliberadamente).
- Genera páginas mínimas o ricas según la **intención real** y el contenido disponible; no fuerza bloques ricos sobre contenido escaso.
- Incluye política de acciones de host, validación de templates, familias visuales, paletas, tipografías y composición.

### Onboarding (descubre necesidad, no disposición a pagar)

```
Onboarding → Engine V2 (entiende profesión, objetivo, contenido, estilo)
   → Essential/Free  → Quick/Basic Editor → Publicar Free
   → Pro             → Power Editor       → Unlock/Publicar Pro
```

### Arquitectura objetivo Onboarding V2 (solo diseño)

```
Usuario → Onboarding V2 (preguntas semánticas) → OnboardingIntentV2
→ Page/Business Orchestrator → Engine V2 → BioTemplateConfig
→ sobre canónico (schemaVersion: 1) → Basic Editor ↔ Power Editor V2
```

- Estado: **diseñada, no implementada** (fuentes sin modificar).
- Rama futura condicional: Commerce Intake → Catálogo / Smart Mini-Site → Commerce Runtime (costura de extensión futura).

---

## 8. Planes Futuros (Roadmap y Parking Lot)

### 8.1 Prioridad de ejecución vigente (no alterada por la investigación de mercado)

1. Terminar **Creation Core**.
2. Verificar **Publish runtime** real.
3. Terminar **Mobile Power**.
4. Auditar **Onboarding**.
5. Auditar **Engine V2**.
6. Integrar **Page System / Smart Pages**.
7. Cerrar **runtime público / SEO / QR**.
8. Ejecutar **round-trip final de Creation Core**.

> Solo **después** de Creation Core se abordará el **Conversion Core** (futuro).

### 8.2 Parking Lot — documentado, NO implementado

Gamificación · Protección DRM en PDF · Smart Routing WhatsApp/Lead Magnets · Paywall OnlyFans · Certificados en Blockchain · Power Editor V6 (drag & drop) · Custom Domains · Widgets/Embeds (Spotify/YouTube/countdown) · Asset Tracking & Employee IDs.

### 8.3 Conversion Core (futuro, sin implementar)

Outcome attribution · Analytics avanzados · Mini CRM · Conversation Context Engine · Conversion Learning · Capa operativa de leads.

### 8.4 "Do NOT chase" (descartado estratégicamente)

No competir por: más templates, más controles de color, más iconos, email marketing, ecommerce completo, CRM completo, calendario, web builder genérico, marketplace de creadores, etc.
**Filtro de feature:** _"¿Reduce esto la fuga de intención, el trabajo operativo o la incertidumbre del negocio?"_

---

## 9. Monetización y Valoración (hipótesis)

### 9.1 Precios (hipótesis de trabajo, no compromiso de lanzamiento)

| Plan       | Hipótesis (README estrategia) | Hipótesis (doc. monetización templates) |
| ---------- | ----------------------------- | --------------------------------------- |
| Free       | USD 0                         | USD 0 (3-4 templates básicos)           |
| Pro        | ~USD 10–25/mes                | USD 9.99/mes                            |
| Business   | ~USD 50–150/mes               | —                                       |
| Enterprise | ~USD 250–500+/mes o custom    | USD 24.99/mes ("Elite")                 |

### 9.2 Metas de ingresos aspiracionales (doc. de monetización)

- Mes 3-4: **$5k MRR** · Mes 5-6: **$15k MRR** · Mes 7-12: **$50k+ MRR / $600k ARR**.
- (Nota: metas de plan de negocio, no reflejo del estado técnico actual.)

---

## 10. Valoración de la Arquitectura (el foco solicitado)

Evaluación cualitativa del **activo técnico** por dominio, en escala de madurez:

| Dominio arquitectónico                                   | Nivel      | Lectura para inversión/ejecutivos                              |
| -------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| Stack frontend (TanStack Start + React 19 + Tailwind v4) | ⭐⭐⭐⭐⭐ | Vanguardista, escalable, SSR type-safe. Activo fuerte.         |
| Seguridad / E2EE (AES-256-GCM + PBKDF2, Zero-Knowledge)  | ⭐⭐⭐⭐⭐ | Diferenciador defensible, "grado militar". El mayor activo.    |
| Motor de generación (Engine V2 paramétrico)              | ⭐⭐⭐⭐   | Arquitectura de generación semántica sólida, en evolución.     |
| Capa de datos (Supabase + RLS + 40 migraciones)          | ⭐⭐⭐⭐   | Robusta y sobre-dimensionada; capacidades por exponer.         |
| Link-in-bio / QR avanzado                                | ⭐⭐⭐⭐   | Producto funcional y completo.                                 |
| Editor dual (Basic ↔ Power)                              | ⭐⭐⭐     | Basic maduro; Power V6 (drag&drop) **fuera de `main`**.        |
| Onboarding                                               | ⭐⭐⭐     | Shell V1 funcional; V2 solo diseñado.                          |
| **Monetización / Billing**                               | ⭐         | **Mock.** Sin Stripe, `isPremium=false`. **El bloqueante #1.** |
| Analytics usuario final                                  | ⭐⭐       | Recolecta pero no visualiza. Quick-win cercano.                |
| Madurez DevOps (staging, flags, CI gate)                 | ⭐⭐       | Falta staging privado, feature flags, kill-switches.           |

### Síntesis de valor arquitectónico

1. **Lo que ya vale:** la base técnica (stack), la **criptografía E2EE** y los dos productos funcionales (link-in-bio + QR avanzado) constituyen un activo arquitectónico **real y defendible**, no un mockup.
2. **La deuda que frena la monetización:** falta **Billing real** (Stripe) y **visualización analítica** para el cliente. Son los dos "quick wins" explícitamente mapeados como "a un clic".
3. **El riesgo de valoración:** la documentación futurista (Onboarding V2, Conversion Core, Power V6, gamificación) **infló artificialmente** la percepción del producto. El estudio de arqueología lo limpia: **mucho está solo diseñado o en otra rama**, no en `main`.
4. **Readiness:** el gate de QA está **BLOQUEADO** para beta privado por ausencia de staging, flags y validación cross-profile RLS — riesgos de _proceso_, no de _código_.

### Valoración arquitectónica de resumen

> **Madurez arquitectónica global: ~75–80% de lo necesario para ser un SaaS monetizable.** El núcleo (creación, publicación, seguridad) está construido y funcionando; lo que separa al producto del mercado es **la capa comercial (Billing) y el cierre operativo (DevOps/staging)**, no el músculo de ingeniería.

---

## 11. Riesgos y decisiones abiertas clave

1. **Billing inexistente** → `isPremium` hardcodeado; no hay embudo de pago activo.
2. **Tres modos de encriptación/seguridad** reportados sin auditoría técnica → deben validarse antes de su asignación comercial.
3. **Power Editor V6** no está en `main` → no debe venderse como disponible.
4. **Sin staging privado ni feature flags** → no hay kill-switch para Onboarding V2.
5. **`tsc --noEmit` falla** (diagnósticos preexistentes) → deuda de tipos pendiente.
6. **Downgrade de suscripción** → debe preservar estado Premium/Power (definir antes del lanzamiento).
7. **Open decisions** (README): matriz de entitlement Engine V2, límites de páginas/asientos/media, límites de leads/analytics, funciones Pro vs Business, precios finales, comportamiento de downgrade.

---

## 12. Conclusión ejecutiva

- **Cripqer es una plataforma bifurcada con dos "killer features" ya operativas** (creador estético de link-in-bio + "Fort Knox" de documentos cifrados de un solo uso), sobre un **stack de élite** y con una **seguridad criptográfica impecable**.
- El **punto de inflexión** no es técnico sino **comercial**: falta **Billing** y **Analytics de cliente**. Ambos están mapeados como tareas "a un clic".
- El producto **no está listo para beta privado** por razones de proceso (staging, flags, RLS cross-profile), no de código.
- **La valoración arquitectónica es alta en el núcleo construido**, pero la documentación de futuro debe separarse estrictamente de lo implementado para no sobre-valorar lo que aún no existe en `main`.

---

_Estudio consolidado a partir de: `README.md`, `README_PRODUCT_STRATEGY.md`, `CRIPQER_MASTER_PRODUCT_MAP.md`, `CRIPQER_MARKET_VALIDATION_AND_STRATEGIC_BETS_2026-09-09.md`, `CRIPQER_ONBOARDING_V2_TARGET_ARCHITECTURE.md`, `CRIPQER_ONBOARDING_V2_PHASE6_PRODUCT_READINESS_REPORT.md`, `SEO_STRATEGY_CRIPQER_CONVERSION_PLATFORM.md`, `docs/ESTRATEGIA_MONETIZACION_TEMPLATES.md`, `docs/EXPANSION_QR_MULTIFUNCIONAL.md`, `package.json`, migraciones de `supabase/` y código de `src/`._
