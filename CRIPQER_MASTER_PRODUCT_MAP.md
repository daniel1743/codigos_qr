# CRIPQER MASTER DISCOVERY MAP
*Fecha del Informe:* Agosto 2026
*Modo:* `READ_ONLY_PRODUCT_ARCHAEOLOGY`

Este documento consolida el estado real y tangible del repositorio, disipando la niebla entre lo "proyectado" en documentos y lo "implementado" en código.

---

## 🗺️ PARTE 1: LA SUPERFICIE REAL DE LA APLICACIÓN

### Phase 1: Mapa exacto de rutas existentes
Enrutamiento basado en `@tanstack/react-router` (`routeTree.gen.ts`).
**Rutas 100% conectadas y activas:**
1. `/` -> Landing page pública (`CripqerLanding.tsx`).
2. `/$alias` -> Perfil público por alias (ej. `/juan`).
3. `/admin` -> Panel de administración global.
4. `/d/$shortUrl` -> Vista pública para descarga de documentos seguros.
5. `/editor` -> Editor principal de QR y perfil básico.
6. `/encrypted-documents` -> Dashboard interno de gestión de documentos cifrados.
7. `/login` -> Flujo de autenticación (Auth UI).
8. `/p/$publicId` -> Perfil público (método fallback/UUID).
9. `/profile` -> Dashboard de usuario (Mis perfiles, analytics básico).
10. `/template-lab` -> Entorno de desarrollo para pruebas de plantillas.

### Phase 2: Funcionalidades "Shadow" (Rutas perdidas)
* ¿Existen rutas sin interfaz para llegar a ellas?
  - La ruta `/template-lab` es un endpoint puramente interno/dev, no accesible desde la navegación del usuario regular, diseñado para crear y probar nuevos "Basic Templates".
  - Las rutas para legacy fallback de perfiles (`p/$publicId`) están activas pero el onboarding promueve fuertemente el `/$alias`.

### Phase 3: Componentes Zombi (Desconectados)
* No se detectaron componentes zombi en este análisis superficial del directorio `basic-template/renderers`. Las 14 plantillas allí presentes (`Corporate`, `Template03`, `TemplateAmanda`, etc.) están interconectadas a través de `StandaloneRenderer.tsx`.
* Componentes de Premium (ej. `PremiumEffectsSelector.tsx` y `PremiumMaxProPicker.tsx`) se encuentran integrados en el Editor Shell pero detrás de un paywall lógico (`isPremium`).

### Phase 4: Banderas de desarrollo (Feature Flags)
* **`isAdmin`**: Totalmente implementado. Verifica roles vía tabla `admin_users` y lista de correos permitidos en `admin-check.ts`. Desbloquea `/admin` y vistas avanzadas en `/profile`.
* **`isPremium`**: Implementado de forma "Soft". En `src/lib/entitlements.ts` actualmente está hardcodeado (`const isPremium = false;`) o depende de lógica incompleta. Otorga acceso a plantillas y efectos premium en el UI, pero carece de suscripción real en backend (Stripe).
* **`experimental`**: Ausente en el código fuente actual.

### Phase 5: Falso Positivo Documental vs Realidad
* **Power Editor**: Extensamente documentado en archivos legacy (`BASIC_PUBLIC_EDITOR_RESTORATION_EVIDENCE.md`), pero **físicamente inexistente** en la rama `main`. Fue un experimento aislado en otra rama (`feat/power-editor-v6`).
* **OnlyFans QR / Gamification / gamified capture**: Documentado a gran escala en `EXPANSION_QR_MULTIFUNCIONAL.md` (roadmap futuro). Nada implementado.

### Phase 6: Herencias y Comentarios "Future"
* `entitlements.ts` (L37): `TODO: Consultar base de datos cuando exista tabla de suscripciones` -> Confirma la falta de Billing.
* `QRTemplateCard.tsx` (L103): `TODO: Navegar a página de Premium cuando exista` -> Confirma que no hay embudo de pagos activo.
* `MyProfilePage.tsx` (L620): "Próximamente: gráficos de actividad y analytics detallados" -> Confirma la carencia de UI analítico para el usuario final.

---

## 🧠 PARTE 2: EL ECOSISTEMA DE DATOS Y CAPACIDADES

### Phase 7: Capacidades de BD Ocultas
El esquema de la BD está sobredimensionado frente al UI actual.
En `profiles`:
* `qr_gradient`, `qr_dots_type`, `qr_corners_square_type`, `qr_effect`, `qr_demo_logo_id`: Están listos en la BD para almacenar capacidades de QR premium.
* Tabla `qr_visual_versions`: Almacena un historial local (10 versiones por perfil) de estilos estéticos de los QR.

### Phase 8: Orfandad de UI
* **Analytics Backend**: Existen triggers y tablas (`qr_analytics`, `increment_scan_count`) que capturan datos (Location, device, time, total views, unique visitors). Sin embargo, el **usuario final** no tiene interfaz visual (gráficos) para consumirlos (a excepción del scan count básico). Sólo el Admin tiene dashboard completo (`AnalyticsGlobalPanel.tsx`).

### Phase 9: El laberinto de generadores QR
Existen **dos** motores/contextos de generación de QR independientes:
1. **QR Advanced (`QRCodeAdvanced.tsx`)**: Integrado con el Basic Editor y perfiles, soporta custom dots, efectos y marcas visuales (Premium fields).
2. **QR Seguro (`ThemedDocumentQr`)**: Acoplado a `encrypted-documents.tsx`, con un fin puramente transaccional/funcional (Compartir URL).

### Phase 10: La Verdad sobre los Templates (Basic vs Power)
* **Basic Editor**: Único motor vivo en el código. Implementa ~14 plantillas renderizadas condicionalmente.
* **Power Editor**: Inexistente.

### Phase 11: Inventario Físico de Templates
Existen físicamente 14 `Renderers` (Plantillas básicas) dentro de `src/components/basic-template/renderers/`:
* `CorporateRenderer`, `HeroCardsRenderer`, `HeroProfileRenderer`, `StandaloneRenderer`.
* Clásicos numerados: `Template03` al `Template08`.
* Nombres propios: `TemplateAdriana`, `TemplateAmanda`, `TemplateBarbara`, `TemplateEudora`.

### Phase 12: Ecosistema Premium / Auth / Billing
* **Auth**: 100% funcional y obligatorio (`Supabase Auth`).
* **Premium (UI/DB)**: Existente en BD (`premium_users` table), implementado en UI con candados lógicos.
* **Billing (Stripe/Paypal)**: **Cero implementación**. Entitlements mockeados/incompletos.

### Phase 13: La realidad de Analytics
* **Nivel Backend**: Captura eventos y cuenta descargas.
* **Nivel Admin**: Dashboard avanzado con gráficas (`Recharts`), breakdown de dispositivos, top países y CTR.
* **Nivel Usuario**: **NO IMPLEMENTADO** (sólo un contador general de visitas crudas en el dashboard).

### Phase 14: Domains & URLs Infrastructure
* Manejo estandarizado en formato SaaS vía `slugs` (rutas `/$alias` y `/p/$publicId`).
* Documentos vía ShortUrls (`/d/$shortUrl`).
* NO existe código activo para Custom Domains (`CNAME` mapping para dominios propios del cliente).

### Phase 15: Storage Bucket Architecture
3 Buckets reales controlados vía RLS en Supabase:
1. `avatars` (Público, lectura abierta).
2. `banners` (Público, lectura abierta).
3. `encrypted-documents` (Estrictamente PRIVADO). Se expone únicamente vía `Signed URLs` generadas en servidor tras validación (60s vigencia).

### Phase 16: Embeds y Widgets Reales
* Solo hay soporte puro de CSS/Links (enlaces sociales vía iconos como `whatsapp`).
* **Ausentes**: No hay reproductores de video incrustados (`<iframe>` de YouTube), mapas o widgets de Spotify funcionando en las vistas públicas.

### Phase 17: Herramientas Internas / Admin Tools
* **Template Lab**: (`/template-lab`). Herramienta WYSIWYG interna para probar nuevos layouts CSS.
* **Admin Panel**: Dashboard global (`/admin`) con capacidad para gestionar usuarios, forzar/conceder estado `Premium`, subir `Logos` premium e interrogar la métrica global.
* **Invitation Codes**: Panel en Admin para generar tickets de registro cerrados.

### Phase 18: Sistemas Legacy Superpuestos
* El renderizador legacy sobrevive físicamente dentro de `PublicProfileView.tsx` como método "fallback". Entra en acción solo si se proporciona un `template_id` no reconocido, renderizando botones estándar CSS (estilo Linktree primitivo).

---

## 🛸 PARTE 3: MATRIZ DE MADUREZ & PARKING LOT

### Phase 19: Matriz de Madurez del Producto
1. **Gestión de Identidad & Links (Link-in-bio)**: Nivel 4 (Maduro). ~14 templates, colores avanzados, slugs en tiempo real.
2. **Generación QR Avanzada**: Nivel 4 (Maduro). Integración de logos, formas, dots.
3. **Documentos Seguros (Encrypted QR)**: Nivel 5 (Seguridad Grado Militar). E2EE AES-GCM 256, Zero-Knowledge en PDFs/Excel, control de acceso atómico `FOR UPDATE`, descargas de 1 solo uso, autodestrucción lógica.
4. **Sistema de Monetización**: Nivel 1 (Mock). Panel de admin permite concesiones manuales. Sin gateways de pago reales.
5. **Analytics para usuarios**: Nivel 2 (Recolectando pero no visualizando).

### Phase 20: Tareas a un click de distancia (Quick Wins Mapeados)
* Habilitar la visibilidad de los datos analíticos para usuarios finales (todo el dashboard de `AnalyticsGlobalPanel` puede derivarse para un usuario específico con muy bajo costo de tiempo, ya que los endpoints y los componentes `Recharts` ya existen).
* Terminar el `TODO: Consultar base de datos cuando exista tabla de suscripciones` mediante Stripe Checkout básico, el UI `PremiumAuthModal` ya está modelado.

### Phase 21: El PARKING LOT de funcionalidades planeadas
De acuerdo con la documentación de estrategia ( `EXPANSION_QR_MULTIFUNCIONAL.md` y `ESTRATEGIA_MONETIZACION_TEMPLATES.md`), las siguientes ideas **NO IMPLEMENTADAS** quedan aparcadas:
1. Gamificación (Scratch cards, spin the wheel, lead capture avanzado).
2. Protección DRM en PDF (Prevent screenshot, prevent print) - *Diferenciar de E2EE que sí existe*.
3. Smart Routing WhatsApp / Lead Magnets.
4. "OnlyFans" Premium adult content protection (Paywall por QR).
5. Certificados Verificables en Blockchain.
6. Power Editor V6 (Drag and Drop total).
7. Custom Domains.
8. Widgets Embeds (Spotify / YouTube / Countdown / Eventos).
9. Asset Tracking & Employee IDs.

---

### 🏆 Phase 22, 23, 24, 25: RESUMEN EJECUTIVO (VEREDICTO FINAL)
CRIPQER actualmente es una plataforma bifurcada con dos "Killers Features" altamente funcionales:
1. **Un Creador Estético de Links Bio (Linktree Killer)**: Basado estrictamente en 14 "Basic Templates" renderizados de forma eficiente, con un Editor Shell robusto y personalización estética (no drag&drop).
2. **Un Fort Knox de Documentos (Zero-Knowledge Doc Sharing)**: Un flujo extremo de cifrado local en el navegador (AES-GCM 256) antes de tocar almacenamiento, ideal para transmisión de archivos sensibles empresariales de un solo uso.

La seguridad base (Auth y RLS) es impecable. El punto de inflexión del repositorio se encuentra en el vacío del **Billing** y la **Visualización Analítica del Cliente**. El producto está a semanas de ser un SaaS monetizable, pero la documentación futurista lo hizo parecer inflado artificialmente. Esta auditoría lo limpia, exponiendo el sólido músculo técnico existente que ahora puede empujarse a producción sin fantasías de código.
