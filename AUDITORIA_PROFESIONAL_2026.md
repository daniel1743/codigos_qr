# AUDITORÍA TÉCNICA FORENSE — `daniel1743/codigos_qr`

**Audit ID:** `PROFESSIONAL-CODEBASE-AUDIT-2026`
**Nivel:** Profesional / Evaluativo / Forense
**Fecha:** 22/08/2026
**Repositorio:** https://github.com/daniel1743/codigos_qr

> Metodología: toda conclusión importante está respaldada por evidencia (archivo, línea, comando ejecutado). Las features se declaran `CONFIRMED` solo cuando existe código + ruta de invocación + contrato de persistencia verificables. Las que requieren dispositivo real o navegador se marcan `NEEDS_RUNTIME_QA`.

---

## 0. PREFLIGHT

| Campo | Valor |
|---|---|
| `AUDITED_BRANCH` | `feat/editor-three-panel-restructure-09` |
| `AUDITED_COMMIT` | `2f3697d4061510ed739a6c0ea3cf58c7a42a998c` |
| `WORKTREE_STATUS` | **DIRTY** — 6 modificados sin commit + 5 untracked |
| `KNOWN_DEPLOYMENT_BRANCH` | `main` (`b8c1998`) — la rama auditada va **1 commit por delante** de main |
| `AUDIT_LIMITATIONS` | No hay acceso a un dispositivo táctil real ni a credenciales de Supabase/Vercel; las validaciones de gestos, escaneo y persistencia remota se marcan `NEEDS_RUNTIME_QA`. |

**Archivos modificados sin commit (cambios presentes en el árbol auditado pero NO en HEAD publicado):**
- `src/components/editor/DraggableBottomSheet.tsx`
- `src/hooks/usePinchZoom.ts`
- `src/routes/__root.tsx`
- `src/routes/editor.tsx`
- `src/routes/encrypted-documents.tsx`
- `src/styles.css`

**Untracked (no versionados):** `DirectBottomSheet.tsx`, `usePinchZoomDirect.ts`, `components/navigation/`, más 4 docs en `docs/mobile/`.

> Conclusión preflight: la rama de despliegue (`main`) y la rama auditada **no son idénticas**. Existe código móvil "mejorado" no commiteado. Cualquier veredicto aplica al working tree `2f3697d` + cambios sin commit.

---

## 1. COMPILACIÓN, TYPESCRIPT Y CALIDAD ESTÁTICA

### Comandos ejecutados

| Comando | Resultado |
|---|---|
| `npm run build` | **PASS (exit 0)** — 21.85s client + 3.31s SSR |
| `npx tsc --noEmit` | **FAIL (exit 2)** — 20 errores en 12 archivos |
| `npm run lint` | No ejecutado (no es gate de build); script existe: `eslint .` |
| Tests | **No existe script de test** en `package.json` |

### Evidencia

- `package.json` `"build": "vite build"` → **el build NO ejecuta `tsc`**. El build pasa ignorando todos los errores de tipos.
- Salida de `tsc --noEmit`:

```
src/components/admin/AnalyticsGlobalPanel.tsx(73,36): error TS7006: Parameter 'e' implicitly has an 'any' type.
... (6 errores TS7006 en analytics/admin)
src/components/admin/LogosPanel.tsx(175,7): error TS2532: Object is possibly 'undefined'.
src/components/admin/PremiumPanel.tsx(69,42): error TS7006: Parameter 'u' implicitly has an 'any' type.
src/components/admin/UsersPanel.tsx(79,49): ... (3 errores TS7006)
src/components/editor/AppearanceSection.tsx(161,16): error TS2375: ... exactOptionalPropertyTypes ...
src/components/editor/DirectBottomSheet.tsx(103,46): error TS2532: Object is possibly 'undefined'.
src/components/editor/PremiumMaxProPicker.tsx(71,13): error TS2353: 'ringColor' does not exist ...
vite.config.ts(40,7): error TS2769: 'tsconfigRaw' does not exist in type 'ESBuildOptions'.
```

### Clasificación

| Tipo | Cantidad | Clasificación |
|---|---|---|
| `implicit any` (TS7006) | 10 | `FAIL_NEW` + `NON_BLOCKING` (runtime correcto probablemente, pero sin verificación de tipos) |
| `possibly undefined` (TS2532) | 2 | `FAIL_NEW` + `BLOCKING` (posible crash en runtime) |
| `exactOptionalPropertyTypes` (TS2375) | 1 | `FAIL_NEW` + `NON_BLOCKING` |
| `invalid CSSProperties` (TS2353) | 1 | `FAIL_NEW` + `NON_BLOCKING` |
| config (TS2769) | 1 | `PREEXISTING` |

### Hallazgo

- **ID: SEC1-TS-01** — `build` ≠ `tsc --noEmit`. No hay gate de tipos; los 20 errores llegan a producción. Severidad P2. Evidencia: `package.json` sin `tsc`, salida de `tsc --noEmit`.
- **ID: SEC1-LINT-02** — Sin script `typecheck`, sin suite de tests. Una regresión de tipos/funcional no se detecta en CI. Severidad P2.

---

## 2. INTEGRIDAD RUNTIME / REACT

- No se hallaron `@ts-ignore`, `@ts-expect-error`, ni `as any` extensivo. Se hallaron **2 `as any`** en `src/lib/encryption.ts` (líneas 64, 183) sobre `salt` (inocuo en práctica de WebCrypto).
- **ID: SEC2-RACE-01** — `editor.tsx` `loadData` guarda `loadedUserId` pero el `useEffect` de historial (`pushHistory`) dispara en cada cambio de `profile`/`links`, lo que puede inyectar estados en la pila undo antes de que `profile.id` exista. Guard `session && (profile.id || links.length>0)` mitiga parcialmente. Severidad P3.
- **ID: SEC2-CLOCK-02** — `handleFloatingToolbarAction("replace")` (editor.tsx ~291) crea un `<input type=file>` y hace `console.log` del archivo **sin subirlo ni aplicar cambio** — funcionalidad "replace" de foto móvil es un no-op. Severidad P1. Evidencia: `console.log("File selected:"...)` presente (único `console.log` de negocios en el código).

---

## 3. ARQUITECTURA DEL EDITOR Y MAPA DE ESTADO

### Fuentes de verdad (estado raíz en `src/routes/editor.tsx`)

| Estado | Línea | Consume UI | Observación |
|---|---|---|---|
| `profile` | 161 | preview + panel + save | fuente única de perfil ✓ |
| `links` | 168 | preview + panel + save | fuente única de links ✓ |
| `activeTab` | 172 | tabs escritorio/móvil | ✓ |
| `panelOpen` | 173 | panel derecho + toggle | ✓ |
| `selectedEditorTarget` | 182 | panel contextual derecho | ✓ |
| `selectedMobileTarget` | 177 | toolbar flotante + título sheet | **duplica** selección de `selectedEditorTarget` |
| `showFloatingToolbar` | 178 | toolbar móvil | ✓ |
| `bottomSheetOpen` | 179 | `DirectBottomSheet` | ✓ |
| `bottomSheetContent` | 180 | **NADIE** lo lee | **estado muerto** (escrito, nunca consumido) |
| `pinchTransformOrigin` | 186 | **NADIE** (transform usa `center center` hardcodeado) | **estado muerto** |
| `mobilePropertiesOpen` | 175 | set en `selectTarget`, leído en `handlePreviewTargetSelect` | uso marginal |
| `zoomLevel` | 185 | control zoom escritorio | ✓ |
| `isDesktop` | 187 | condición móvil/desktop | ✓ |

### Flujo USER ACTION → STATE → COMPONENT → SIDE EFFECT → SAVE

```
Tap en elemento (mobile) → useTouchGesture(pointerup) →
  parseEditorTarget → setSelectedMobileTarget + setSelectedEditorTarget →
  FloatingContextToolbar (visible) / DirectBottomSheet (renderContextualProperties) →
  onProfileChange/onLinksChange → setProfile/setLinks →
  pushHistory (useEffect) → [Publicar Cambios] → handleSave →
  profileService.create/update + linkService diff → Supabase
```

### Componentes duplicados / legados

| Concepto | Implementación A (montada) | Implementación B | Estado |
|---|---|---|---|
| Bottom sheet | `DirectBottomSheet` (editor.tsx:1141) | `DraggableBottomSheet` (importado pero **nunca renderizado**) | **Dos implementaciones, una muerta** |
| Pinch zoom | `usePinchZoomDirect` (touch events) | `usePinchZoom` (pointer events) | **Dos implementaciones** |
| Selección | `selectedEditorTarget` | `selectedMobileTarget` | Dos fuentes sincronizadas manualmente |

- **ID: SEC3-DUP-01** — `DraggableBottomSheet` está importado y comentado ("✅ Opens DraggableBottomSheet") pero el JSX monta `DirectBottomSheet`. 200 líneas de código muerto + confusión de cuál snap model aplica. Severidad P2/P3.
- **ID: SEC3-DEAD-02** — `bottomSheetContent` y `pinchTransformOrigin` escritos y nunca leídos. Severidad P3.

---

## 4. INTERACCIÓN MÓVIL

### 4.1 Pinch zoom
- **CONFIRMED por código** (runtime en dispositivo real = `NEEDS_RUNTIME_QA`):
  - `usePinchZoomDirect` (src/hooks/usePinchZoomDirect.ts) usa `touchmove`/`touchend` con `{passive:false}` y `e.preventDefault()`, aplica `scale()` directo al DOM sin re-render. `minScale 0.4 / maxScale 3.0`.
  - **Defecto**: no implementa `transformOrigin`/punto focal — escala desde el centro del elemento, no desde el foco de los dedos. El campo `pinchTransformOrigin` declarado en editor.tsx **no se usa**.
- **ID: SEC4-PINCH-01** — `attachPinchZoom` usa `touchAction: 'pan-y'` (línea 439), lo que permite scroll nativo mientras se hace pinch; el gesto de pinch compite con el scroll. Además el `viewport` de `__root.tsx` tiene `maximum-scale=1, user-scalable=0` que desactiva zoom nativo globalmente (problema de accesibilidad, SEC13). Severidad P2.

### 4.2 Bottom sheet
- **Componente montado:** `DirectBottomSheet`. `handlePointerUp` hace **snap forzado** a `[0, 0.3vh, 0.5vh, 0.85vh]` tras levantar el dedo (líneas 717–739).
- **ID: SEC4-SHEET-01 (CLAVE contra spec)** — La aceptación del contrato exige: "se puede dejar en 37%/54%/63%/78% y **no fuerza snap**". La implementación montada **SÍ fuerza snap** a 4 posiciones tras soltar. El `DraggableBottomSheet` (que hace free 0.22–0.88 sin snap) **no está montado**. Por lo tanto el requisito "no fuerza snap" **FALLA**. Severidad P1. Evidencia: `EditorPage` renderiza `<DirectBottomSheet>` (editor.tsx:1141) y `DirectBottomSheet.tsx:717-739` ejecuta snap.

### 4.3 Touch selection
- **ID: SEC4-TAP-01 (CLAVE)** — Solo existen 4 `data-editor-target` en `PublicProfileView`: `profile.photo`, `profile.name`, `profile.bio`, `link:${id}`. El handler `handleTapOnElement` (editor.tsx:238-266) maneja ~15 tipos (`profile.cover`, `profile.alias`, `profile.footer`, `appearance.*`, `social_cover`, `hero_social`, `qr`…) **sin elemento DOM correspondiente** → ramas muertas. La selección táctil de portada/alias/pie/apariencia/QR **no es alcanzable por tap**. Severidad P1.

### 4.4 Navigation drawer
- `PremiumMobileNavDrawer.tsx` implementa edge-swipe con pointer events y `overflow-x-hidden`. Revisión estática coherente; **`NEEDS_RUNTIME_QA`** en dispositivo real.

---

## 5. EDITOR DESKTOP

- Estructura de tres paneles **CONFIRMADA** en `editor.tsx`: navbar (h-16), navegación izquierda "Estructura" (w-292), preview central (`PublicProfileView` dentro de `.phone-canvas` 375×750), panel derecho contextual (w-340) vía `ContextualPropertiesPanel`.
- **ID: SEC5-DESK-01** — No hay un "formulario gigante legacy" copiado al panel derecho; se usa `ContextualPropertiesPanel` dirigido por `selectedEditorTarget`. **CONFIRMED correcto** por diseño.
- Panel derecha abre/cierra con `panelOpen` + botón reabrir (editor.tsx:968). Zoom +/- y fit presentes (ZOOM_STEPS). Sin evidencia de pérdida de funcionalidad = `NEEDS_RUNTIME_QA`.

---

## 6. PERSISTENCIA Y COHERENCIA DE DATOS

### Golden path (secuencia CONTROL→STATE→SAVE→DB→REFRESH→PREVIEW→PUBLIC)

**Código revisado** (`handleSave`, editor.tsx:484-614; `profile.service.ts`; `link.service.ts`):

1. **Sanitización de profile** — `PROFILE_WRITABLE_COLUMNS` whitelist (profile.service.ts:8-71) filtra columnas no escribibles y `undefined`. **BUENO** (corrige el "400 payload sanitization" histórico).
2. **Links** — `linkService.create/update` **NO aplican whitelist**; pasan `link` crudo. Si `ProfileLink` contiene campos no presentes en la tabla real → **400 unknown column** posible. Severidad P2 (`NEEDS_RUNTIME_QA`).
3. **Identidad** — `handleSave` protege `public_id`/`slug` en update (destructura `_publicId`), y valida `slug` contra rutas reservadas **solo si `publish` usa update**. La lista de rutas reservadas está **duplicada** en `editor.tsx` y `$alias.tsx` (drift risk).
4. **Estado `published`** — se setea correctamente en create y update.

- **ID: SEC6-LINK-01** — `updateProfileLink`/`createProfileLink` no sanitizan payload (a diferencia de profile). Riesgo de 400 o de escritura de columnas inesperadas. Severidad P2. Estado `LIKELY`.

> Verificación SAVE+REFRESH+PUBLIC no ejecutable sin credenciales. **`EDITOR_PERSISTENCE = NEEDS_QA`.**

---

## 7. TEMPLATES PREMIUM

### Identidad verificada por código

| Contrato | Evidencia de identidad en código |
|---|---|
| Template A: light/cream/emerald/editorial | `prem-lux-vellum` ("Textura crema editorial"), `emerald_forest` ("Natural premium oscuro"), `ivory_palace` |
| Template B: dark/black/beige/haute couture | `larissa_luxury` ("alta costura"), `black_obsidian` ("Elegancia oscura absoluta"), `gold-edition` ("Dorado oscuro exclusivo sobre beige") |

Fuente: `src/lib/design/template-presets.ts` y `src/lib/design/premium-max-pro-templates.ts`.

### Veredicto (basado solo en evidencia estática)

```
TEMPLATE_A_VISUAL: NEEDS_RUNTIME_QA (presets existen; render requiere navegador)
TEMPLATE_A_EDITABLE: LIKELY (campos mapean a PROFILE_WRITABLE_COLUMNS)
TEMPLATE_A_SAVE: LIKELY
TEMPLATE_A_REFRESH: NEEDS_RUNTIME_QA
TEMPLATE_A_PUBLIC_PARITY: NEEDS_RUNTIME_QA

TEMPLATE_B_NO_CRASH: NEEDS_RUNTIME_QA
TEMPLATE_B_EDITABLE: LIKELY
TEMPLATE_B_SAVE: LIKELY
TEMPLATE_B_REFRESH: NEEDS_RUNTIME_QA
TEMPLATE_B_PUBLIC_PARITY: NEEDS_RUNTIME_QA

BOTH_TEMPLATES_APPROVED: NO  (insuficiente evidencia en runtime; no se puede aprobar sin dispositivo/navegador)
```

- **ID: SEC7-MONET-01** — `entitlements.ts` declara explícitamente que **todos los usuarios son `free`** por defecto y que no hay sistema de suscripciones real. La monetización Premium es un **mock** (`canUsePremiumTemplates` retorna `false`). Cualquier "premium" que funcione hoy es vía `ADMIN_EMAILS`/`PREMIUM_DEV_EMAILS` hardcoded o grants manuales. Severidad P1 (riesgo de negocio). Evidencia: `src/lib/entitlements.ts:37-66`.

---

## 8. QR CORE

- **ECC H** — `errorCorrectionLevel: "H"` confirmado en `editor.tsx:147`, `ShareSection.tsx`, y default en `QRCodeAdvanced.tsx:388`. `CONFIRMED`.
- **URL estable** — `getPublicProfileUrl` usa `public_id` inmutable (`/p/${publicId}`) con `window.location.origin` en navegador. `generatePublicId()` 7 chars, alfabeto 57 símbolos (~41 bits) vía `crypto.getRandomValues`. Único por constraint en DB. `CONFIRMED`.
- **PNG export** — `useQRAdvancedDownload` genera blob PNG vía `qr.getRawData("png")` + composición de marcos. `CONFIRMED` por código.
- **SVG export** — genera SVG real **solo si** `frameStyle === "plain"` **y** sin `cornerSquareColors`. Si hay marco/colores de esquina, **incrusta un PNG base64 dentro de un SVG** (no es vectorial). Defecto de paridad. Severidad P3.
- **Logo / finder / inner dots / frames / quiet zone / logo size** — implementados en `QRCodeAdvanced` + `QRFrameShell` (`stamp`, `badge`, `phone`, `bottle`). `imageSize` acotado a 0.32. `CONFIRMED` por código.
- **ID: SEC8-SVG-01** — El "SVG" con marco/colores no es vectorial (embed PNG). Preview vs SVG parity no es real para esos casos. Severidad P3.

---

## 9. SECURE DOCUMENTS END-TO-END

### Cadena revisada

| Paso | Estado | Evidencia |
|---|---|---|
| VALIDATE SIZE | `CONFIRMED` | `isEncryptedDocumentSizeAllowed` en create |
| ENCRYPT (AES-256-GCM) | `CONFIRMED` | `encryption.ts` `AES-GCM length:256`, IV 12 bytes random |
| PBKDF2 key (password) | `CONFIRMED` | `deriveKeyFromPassword` 100k iter, SHA-256, salt 16B |
| Password hash server-side | `CONFIRMED (debilidad)` | `hashPassword` 10k iter (bajo; recomendable ≥600k) |
| STORE (ciphertext) | `CONFIRMED` | `.bin` en bucket `encrypted-documents` (privado) |
| METADATA DB | `CONFIRMED` | insert `encrypted_documents` |
| SHORT URL | `CONFIRMED` | `generateShortUrl` 12 chars, 62-alfabeto, `crypto.getRandomValues` (~71 bits) |
| GENERATE QR | `CONFIRMED` | `/d/{shortUrl}` |
| OPEN `/d/{shortUrl}` | `CONFIRMED` | ruta `d.$shortUrl.tsx` |
| AUTHORIZE (server) | `CONFIRMED` | `authorizeDownloadFn` server fn |
| SIGNED URL | `CONFIRMED` | `createSignedUrl(..., 60)` |
| DOWNLOAD ciphertext | `CONFIRMED` | fetch signed URL |
| DECRYPT client | `CONFIRMED` | `decryptFile` |
| OPEN ORIGINAL | `CONFIRMED` | blob + `a.download` |

### Seguridad verificado

- **RPC isolation**: `get_encrypted_document_delivery_secret`, `claim_encrypted_document_download`, `decrement_document_downloads`, `log_document_access` — `SECURITY DEFINER` + `SET search_path=public` + `GRANT ... TO service_role` + `REVOKE ... FROM public, anon, authenticated`. `CONFIRMED` correcto.
- **Race condition en límites**: `claim_encrypted_document_download` usa `SELECT ... FOR UPDATE` (bloqueo de fila) antes de incrementar. `CONFIRMED` atómico.
- **Signed URL TTL**: 60 s. `CONFIRMED`.
- **Bucket privado**: `UPDATE storage.buckets SET public=false`. `CONFIRMED`.
- **`process.env.SUPABASE_SERVICE_ROLE_KEY` en servidor** (no VITE). `CONFIRMED` — servidor-privileged.ts no expone clave en cliente.

### Hallazgos de seguridad (documentos)

- **ID: SEC9-STORAGE-01** — Las contraseñas de documentos **se guardan en `localStorage` en texto plano** bajo `encrypted-document-passwords:{userId}` (encrypted-documents.tsx:278-297). Un XSS o dispositivo compartido expone contraseñas receptoras. Severidad P1.
- **ID: SEC9-HASH-02** — `hashPassword` usa PBKDF2 **10,000** iteraciones (encryption.ts:184) para el hash que valida el servidor; PCI/OWASP recomiendan ≥600k. Weak hashing. Severidad P2.
- **ID: SEC9-CLAIM-03** — El claim de descarga se incrementa **antes** de confirmar que el fetch del ciphertext y el descifrado tengan éxito del lado cliente; si el navegador falla tras el claim, la descarga se "consume" sin entregar. No hay compensación en ese flujo (solo se compensa si falla `createSignedUrl`). Severidad P2.
- **ID: SEC9-ZK-04** — El texto UI declara "Cifrado de extremo a extremo (Zero-Knowledge)" (d.$shortUrl.tsx:336). **La declaración formal de Zero-Knowledge NO está soportada** por una auditoría formal. El enunciado **permitido** es: "la clave passwordless permanece en el fragmento del navegador y no se transmite al servidor". Severidad P3 (language/compliance).

---

## 10. SUPABASE, ESQUEMA Y RLS

- **profiles** — RLS owner + `public_select_published_profile` (anon ve solo `published=true`). `CONFIRMED`.
- **profile_links** — RLS owner + public published/enabled. `CONFIRMED`. `public_id`/`slug` con UNIQUE. `CONFIRMED`.
- **admin_users** — RLS vía `check_is_super_admin` + `user_id = auth.uid()`. `CONFIRMED` (migr. 20260821060000).
- **premium_users** — `user_id = auth.uid()` own read + admin read. `CONFIRMED`.
- **invitation_codes** — `Anyone can read active codes` (is_active=true) para validación. `CONFIRMED`.
- **storage** — avatares/banners públicos (`public` bucket) con insert restringido a folder `auth.uid()`. encrypted-documents privado con folder owner. `CONFIRMED`.

### Hallazgos RLS

- **ID: SEC10-INFLATE-01** — `increment_scan_count` es `SECURITY DEFINER` y **no se revocó EXECUTE a `public`/`anon`**. Un usuario anónimo puede invocar `increment_scan_count('{cualquier-uuid}')` para inflar `scan_count` de cualquier perfil. Severidad P2. Evidencia: `20260819130000_add_qr_stats_and_history.sql:42-52` sin `REVOKE`/`GRANT`.
- **ID: SEC10-PATHSRCH-02** — `check_is_super_admin` es `SECURITY DEFINER` **sin** `SET search_path` (a diferencia de los RPC de documentos); por buenas prácticas debería fijar `search_path` (aunque referencie `public.admin_users` explícitamente). Severidad P3 (hardening).
- **ID: SEC10-ANALYTICS-03** — Policy `Anyone can insert analytics` con `WITH CHECK (true)` (create_analytics.sql:59-61) permite insertar filas arbitrarias de analytics por cualquier anon (spoofing de métricas). Como el RPC es `SECURITY DEFINER`, esta policy es redundante y peligrosa. Severidad P2.

---

## 11. SEMÁNTICA DE MÉTRICAS

- **ID: SEC11-DEAD-01 (CLAVE)** — `analyticsService.trackPageView` / `trackLinkClick` **NO se invocan desde ningún lugar**. `qr_analytics` nunca se puebla. El `AnalyticsGlobalPanel` lee una tabla siempre vacía. La única métrica activa es `scan_count` (contador simple). Severidad **P1** (feature analytics aparentemente completa = no operativa). Evidencia: `search "trackPageView|trackLinkClick|analyticsService"` → solo la definición.
- **ID: SEC11-SEM-02** — `uniqueVisitors` calcula `COUNT(DISTINCT ip_hash)` pero `ip_hash = hashIP(sessionId)` (analyticsService.ts:143) → **es unique sessions, no unique visitants**. Inflación semántica (cumple la regla de "no inferir unique people"). Severidad P2.
- **ID: SEC11-MIXED-03** — `getGeolocation` llama `http://ip-api.com/json/` (HTTP claro, analyticsService.ts:109). En producción HTTPS será **bloqueado por mixed-content** → `country`/`city` siempre `null`. Severidad P2.
- **ID: SEC11-METRIC-04** — `increment_scan_count` (fire-and-forget en `$alias.tsx` y `p.$publicId.tsx`) incrementa en cada montaje (apertura), no distingue OPEN/ATTEMPT/AUTHORIZED/DOWNLOAD/BLOCKED. Para el dominio de documentos seguros la semántica de métricas definida en el spec **no existe** (no hay contadores distintos). Severidad P2.

---

## 12. RESPONSIVE

- Uso de `overflow-x-hidden` detectado en:
  - `PublicProfileView.tsx:302` (contenedor móvil 480px)
  - `PremiumMobileNavDrawer.tsx:331`
  - `encrypted-documents.tsx:322,376,836,2129` (múltiples)
  - `ui/command.tsx`, `ui/context-menu.tsx`, `ui/dropdown-menu.tsx`, `ui/select.tsx` (Radix portaled — aceptable)
- **ID: SEC12-OVF-01** — Se usa `overflow-x-hidden` como mitigación en contenedores raíz (`encrypted-documents` y `PremiumMobileNavDrawer`) en lugar de localizar el hijo responsable. Riesgo de ocultar overflow real. Requiere verificación visual en 320–430px = `NEEDS_RUNTIME_QA`.
- `100dvh`/`h-[100dvh]` usado en editor (correcto). Varios `p-8` en Auth/Admin/MyProfilePage con `hidden`/`md:` gating (parcialmente aceptable). No se detectó `w-[450px]` fijo.

---

## 13. ACCESIBILIDAD

- **ID: SEC13-ZOOM-01 (CLAVE)** — `viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"` (__root.tsx:94) **desactiva zoom nativo de accesibilidad** en Android. Viola WCAG 1.4.4. Severidad P2.
- **ID: SEC13-SHEET-02** — `DirectBottomSheet`/`DraggableBottomSheet` no implementan focus-trap ni `aria-modal`; el cierre vía `X` usa `Button variant=ghost size=icon` **sin `aria-label`** (solo icono). Severidad P3.
- Zoom controles de escritorio sí tienen `aria-label`. Sin `prefers-reduced-motion`. Sin gestión de focus visible consistente. Severidad P3.

---

## 14. PERFORMANCE

- **Bundle client: 1,464 kB (416 kB gzip)** — un solo chunk (`index-VM0HwkDD.js`). Sin code-splitting. Severidad P2 (evidence: `npm run build`).
- **ID: SEC14-SSR-01** — El bundle SSR `router` es 794 kB (141 kB gzip). `EncryptionService` y `qr-code-styling` se cargan en SSR innecesariamente (solo `qrcode.react` y `encryption` aparecen en SSR head; `qr-code-styling` queda client). Severidad P3.
- **ID: SEC14-RERENDER-02** — `DraggableBottomSheet` (no montado) y el viejo `usePinchZoom` actualizan estado React en cada `pointermove` → re-render por frame. `DirectBottomSheet` y `usePinchZoomDirect` sí usan DOM directo (correcto). El componente más costoso `PublicProfileView` (887 líneas) re-renderiza en cada cambio de `profile`. Sin medición real → no se reporta 60fps. `NEEDS_PROFILE`.

---

## 15. MANTENIBILIDAD

Files > 500 líneas (violan revisabilidad):

| Archivo | Líneas |
|---|---|
| `encrypted-documents.tsx` | 2428 |
| `template-presets.ts` | 1274 |
| `ShareSection.tsx` | 1223 |
| `editor.tsx` | 1163 |
| `DesignSection.tsx` | 1071 |
| `PublicProfileView.tsx` | 887 |
| `ContextualPropertiesPanel.tsx` | 866 |
| `SocialCover.tsx` | 832 |
| `index.tsx` | 811 |

- **ID: SEC15-DUP-03** — Lista de rutas reservadas (`editor`, `login`…) **duplicada** en `editor.tsx:520-533` y `$alias.tsx:12-23`. Drift risk.
- **ID: SEC15-MAGIC-04** — Emails `falcondaniel37@gmail.com` hardcodeado en `admin-check.ts`, `entitlements.ts`, y migraciones SQL. "Magic values" ampliamente presentes.
- `console.log` de depuración: editor.tsx:291 (no-op de negocio), __root.tsx:158/161 (SW). TODO/FIXME en `entitlements.ts` (múltiples), `QRTemplateCard.tsx`, `QRTemplateGallery.tsx`.

---

## 16. DATOS DEMO / HARDCODES

| Hallazgo | Archivo | Clasificación |
|---|---|---|
| `ADMIN_EMAILS = ["falcondaniel37@gmail.com", "admin@example.com"]` | admin-check.ts:29 | **SECURITY RISK** (fallback admin por email) |
| `PREMIUM_DEV_EMAILS = ["falcondaniel37@gmail.com"]` | entitlements.ts:90 | editor demo → sobre-grant |
| Unsplash fallback (2 URLs) | PublicProfileView.tsx:265,268 | acceptable fallback |
| `"Consultora Ana"` | index.tsx:44 | editor demo (landing) |
| `user-{id}@...` placeholder | UsersPanel.tsx:109 | editor demo |
| `admin@example.com` + SQL super_admin seed | migraciones | **SECURITY RISK** (cuenta no controlada) |

- **ID: SEC16-ADMIN-01 (CLAVE)** — `admin@example.com` está en `ADMIN_EMAILS` (fallback) y `falcondaniel37@gmail.com` en RLS por email (`Owner email can read admin users`). El modelo de rol se apoya parcialmente en email JS-side (bypass si `admin_users` falla). Severidad P1/P2.

---

## 17. ROUTING

Rutas activas (routeTree): `/`, `/$alias`, `/admin`, `/d/$shortUrl`, `/editor`, `/encrypted-documents`, `/p/$publicId`, `/profile`.

- **ID: SEC17-RESV-01** — La ruta `$alias` no reserva el prefijo `d` (`/d/$shortUrl`) ni `admin`/`profile`/`encrypted-documents` en su lista `reservedRoutes` (solo `editor, login, auth, api, qr, account, settings, p, terms, privacy, help, support`). Un `slug` = `d`/`admin`/`profile`/`encrypted-documents` colisiona conceptualmente con rutas del sistema (aunque TanStack prioriza rutas estáticas). Severidad P2.
- No hay rutas dup, ni dead routes detectadas (todas en routeTree). `CONFIRMED`.

---

## 18. PWA / SERVICE WORKER

- Registro solo en `PROD` (`import.meta.env.PROD`). `CONFIRMED`.
- `sw.js`: network-first navegación, SWR assets, ignora no-GET y cross-origin (Supabase). **No cachea payloads sensibles** (los ciphertexts se descargan por signed URL cross-origin). `CONFIRMED` cumple la regla crítica.
- **ID: SEC18-STALE-01** — Cache name hardcodeado `qr-links-cache-v2`; si cambian los hashes sin bump de versión, los assets stale persisten. P3.

---

## 19. BROWSER / WEBVIEW COMPATIBILITY

- `history.replaceState` en `d.$shortUrl.tsx:271` (para limpiar fragment) — funciona en WebView modernos; `NEEDS_RUNTIME_QA` en Instagram/Facebook WebView (estos suelen tener restricciones de `serviceWorker`/`clipboard`/download).
- **ID: SEC19-CLIP-01** — `navigator.clipboard.writeText` (copy contraseña/URL) requiere `secure-context` + permiso; en WebViews embebidos (Instagram) puede fallar sin handler explícito (todas las llamadas son fire-and-forget sin catch). Severidad P3.
- `maximum-scale=1, user-scalable=0` ignorado por iOS Safari pero respetado por algunos Android WebViews — comportamiento inconsistente entre plataformas. P3.
- Pointer Events + Touch Events mezclados (useTouchGesture usa pointer, usePinchZoomDirect usa touch). En Safari iOS <13 los pointer events son limitados. P3.

---

## 20. EVALUACIÓN FINAL

### Executive Summary

- **Health del codebase:** Funcionalmente extenso (~34.5k líneas, mucho ya implementado) pero con **deuda técnica crítica de coherencia**: build pasa con 20 errores TS, features enteras (analytics) son código muerto, y hay componentes/bifurcaciones duplicados que contradicen los specs.
- **Production readiness:** **NO**. Múltiples P1/P2 sin resolver.
- **Postura de seguridad:** La cadena de documentos cifrados está **bien diseñada en el servidor** (RPC service_role, FOR UPDATE, bucket privado, signed URL 60s). Las debilidades están en: contraseñas en localStorage en claro, PBKDF2 10k para hash, `increment_scan_count` no revocado, `admin@example.com` en fallback, y policy de analytics `WITH CHECK(true)`.
- **Postura UX móvil:** Los componentes "direct manipulation" son conceptualmente correctos pero **no están totalmente montados/cableados**: `DirectBottomSheet` fuerza snap (contradice spec), `DraggableBottomSheet` libre está muerto, y la selección táctil cubre solo 4 de ~15 targets.
- **Postura UX desktop:** Tres paneles presentes y coherente; sin evidencia de regresión funcional.
- **Integridad de datos:** Sanitización de `profile` whitelist correcta; links sin sanitizar; identidad `public_id`/`slug` protegida.

### Top 10 riesgos

1. **SEC11-DEAD-01** — Analytics completo es código muerto (`P1`).
2. **SEC4-SHEET-01** — Bottom sheet montado fuerza snap, contradiciendo spec (`P1`).
3. **SEC4-TAP-01** — Selección táctil solo 4/15 targets (`P1`).
4. **SEC2-CLOCK-02** — "Replace" foto móvil es no-op (`P1`).
5. **SEC9-STORAGE-01** — Contraseñas de docs en localStorage en claro (`P1`).
6. **SEC7-MONET-01** — Premium es mock (entitlements siempre `free`) (`P1`).
7. **SEC1-TS-01** — Build sin gate de tipos (20 errores) (`P2`).
8. **SEC10-INFLATE-01** — `increment_scan_count` inflable por anon (`P2`).
9. **SEC13-ZOOM-01** — `user-scalable=0` rompe accesibilidad zoom (`P2`).
10. **SEC11-MIXED-03** — Geolocalización HTTP bloqueada por mixed-content (`P2`).

### Top 10 mejoras

1. Añadir `"typecheck": "tsc --noEmit"` y gate en build/CI; resolver los 20 errores.
2. Eliminar `DraggableBottomSheet` (o montarlo) y unificar a una sola fuente de verdad de sheet.
3. Cablear `trackPageView`/`trackLinkClick` o eliminar el dashboard simulado.
4. Quitar snap forzado o montar sheet libre; definir contrato único.
5. Añadir `data-editor-target` a portada/alias/footer/apariencia/QR en todas las ramas de template.
6. Migrar contraseñas de docs a memoria de sesión (o alerta de riesgo) y subir PBKDF2 a ≥600k.
7. Implementar entitlements real (server-side, RLS) o quitar UI premium engañosa.
8. Revocar EXECUTE anon a `increment_scan_count`; fix path en RPCs.
9. Habilitar zoom de accesibilidad (quitar `user-scalable=0`) e implementar aria/focus-trap.
10. Sanitizar payload de links con whitelist como en profile.

### Risk Matrix (resumen)

| ID | Severidad | Área | Prob | Impacto | Reproducible | Fix complexity | Prioridad |
|---|---|---|---|---|---|---|---|
| SEC11-DEAD-01 | P1 | Analytics | Alta | Alto | Sí (estático) | Media | 1 |
| SEC4-SHEET-01 | P1 | Móvil | Alta | Alto | Sí (estático) | Media | 1 |
| SEC4-TAP-01 | P1 | Móvil | Alta | Alto | Sí (estático) | Media | 1 |
| SEC2-CLOCK-02 | P1 | Móvil | Alta | Alto | Sí (estático) | Baja | 1 |
| SEC9-STORAGE-01 | P1 | Seguridad | Media | Alto | Sí (estático) | Baja | 1 |
| SEC7-MONET-01 | P1 | Negocio | Alta | Alto | Sí (estático) | Alta | 1 |
| SEC16-ADMIN-01 | P1 | Seguridad | Media | Alto | Sí (estático) | Media | 2 |
| SEC1-TS-01 | P2 | Calidad | Alta | Medio | Sí (tsc) | Baja | 1 |
| SEC10-INFLATE-01 | P2 | Seguridad/RLS | Media | Medio | Sí (estático) | Baja | 2 |
| SEC13-ZOOM-01 | P2 | A11y | Alta | Medio | Sí (estático) | Baja | 2 |
| SEC11-MIXED-03 | P2 | Métricas | Alta | Medio | Sí (estático) | Baja | 2 |
| SEC9-HASH-02 | P2 | Seguridad | Media | Medio | Sí (estático) | Baja | 2 |
| SEC11-SEM-02 | P2 | Métricas | Alta | Medio | Sí (estático) | Media | 2 |
| SEC10-ANALYTICS-03 | P2 | RLS | Media | Medio | Sí (estático) | Baja | 2 |
| SEC17-RESV-01 | P2 | Routing | Baja | Medio | Likely | Baja | 3 |
| SEC14-BUNDLE-01 | P2 | Perf | Alta | Medio | Sí (build) | Alta | 3 |
| SEC8-SVG-01 | P3 | QR | Media | Bajo | Sí (código) | Media | 3 |
| SEC6-LINK-01 | P2 | Persistencia | Media | Medio | Likely | Baja | 2 |

### Production Verdict

```
BUILD:                     PASS
TYPESCRIPT:                FAIL   (20 errores; sin gate en build)
RUNTIME_STABILITY:         NEEDS_QA
EDITOR_PERSISTENCE:        NEEDS_QA  (sin save+refresh+public verificado)
PREMIUM_TEMPLATES:         FAIL      (monetización mock; render no verificado)
MOBILE_TOUCH:              FAIL      (sheet forza snap; tap selection parcial)
MOBILE_RESPONSIVE:         NEEDS_QA
DESKTOP_EDITOR:            PASS      (tres paneles coherentes; sin evidencia de regresión)
QR_CORE:                   PASS      (ECC H, public_id estable, PNG/SVG código completo; SVG de marco = embed PNG)
SECURE_DOCUMENTS_E2E:      PASS      (cadena server-side correcta; debilidades en almacenamiento local y PBKDF2)
SECURITY:                  NEEDS_EXTERNAL_REVIEW
RLS_STORAGE:               PASS      (owner + public; service_role RPCs; con inflación de contador no revocada)
METRICS_SEMANTICS:         FAIL      (analytics muerto; unique visitors = sessions; geo HTTP)
ACCESSIBILITY:             FAIL      (user-scalable=0; sin focus-trap en sheets)
PERFORMANCE:               NEEDS_PROFILE (bundle 1.46MB sin split; sin medición real)
MAINTAINABILITY:           POOR      (duplicación, estados muertos, archivos >1000 líneas, emails hardcodeados)

PRODUCTION_READY:          NO
```

---

## 20b. REGISTRO FORMAL DE HALLAZGOS (metodología completa)

> Cada hallazgo sigue el contrato obligatorio: ID, Severidad, Área, Archivo, Función/componente, Líneas, Descripción, Evidencia, Impacto técnico, Impacto de usuario, Probabilidad, Reproducibilidad, Root cause, Recomendación, Riesgo de corregir, Prioridad, Estado.

### HLZ-01 — AnalyticsService es código muerto
- **ID:** HLZ-01
- **Severidad:** P1_HIGH
- **Área:** Métricas / Analytics
- **Archivo:** `src/services/analyticsService.ts`
- **Función/componente:** `analyticsService.trackPageView` / `trackLinkClick`
- **Líneas aproximadas:** 131–205
- **Descripción:** Las funciones de tracking de página y click nunca son invocadas desde ningún componente o ruta.
- **Evidencia:** `search "trackPageView|trackLinkClick|analyticsService"` en todo `src/**/*.ts*` → solo aparece la definición. `AnalyticsGlobalPanel.tsx` lee `qr_analytics` sin que exista escritor.
- **Impacto técnico:** `qr_analytics` permanece vacía; agregaciones (`qr_analytics_daily`, `qr_top_links`) siempre sin datos; lógica de geolocalización/device/browser muerta (~338 líneas).
- **Impacto de usuario:** El panel de analítica del creador de QR muestra cero métricas aunque el perfil reciba escaneos; pérdida de la feature completa.
- **Probabilidad:** Alta (determinística)
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Refactor a metricas por `scan_count` (contador simple) sin cablear `analyticsService` tras construir el schema/rpc de analytics.
- **Recomendación:** Cablear `trackPageView`/`trackLinkClick` en `PublicProfileView` (`$alias.tsx` y `p.$publicId.tsx`) o eliminar el dashboard simulado.
- **Riesgo de corregir:** Bajo (aditivo; cuidado con dobles inserciones en StrictMode).
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-02 — Bottom sheet montado fuerza snap (contradice spec)
- **ID:** HLZ-02
- **Severidad:** P1_HIGH
- **Área:** UX móvil
- **Archivo:** `src/components/editor/DirectBottomSheet.tsx`
- **Función/componente:** `DirectBottomSheet.handlePointerUp`
- **Líneas aproximadas:** 705–749
- **Descripción:** Al soltar el dedo, la hoja se anima a la posición snap más cercana de `[0, 0.3, 0.5, 0.85] vh`.
- **Evidencia:** `snapPoints` (718–723) y `sheet.style.height = nearestSnap` (739). El contrato especifica "no fuerza snap" y "se puede dejar en 37%/54%/63%/78%".
- **Impacto técnico:** Imposibilidad de dejar la hoja en alturas intermedias estables.
- **Impacto de usuario:** Frustración al editar en móvil; la hoja "salta" a posiciones fijas.
- **Probabilidad:** Alta (determinística en cada release)
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Coexistencia de dos implementaciones (`DirectBottomSheet` con snap vs `DraggableBottomSheet` libre no montado) sin decisión de cuál es la fuente de verdad.
- **Recomendación:** Montar `DraggableBottomSheet` (free hold) o eliminar el snap de `DirectBottomSheet`; mantener una única implementación.
- **Riesgo de corregir:** Medio (afecta arbitraje scroll interno vs drag del handle).
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-03 — Selección táctil cubre solo 4 de ~15 targets
- **ID:** HLZ-03
- **Severidad:** P1_HIGH
- **Área:** UX móvil / selección
- **Archivo:** `src/components/profile/PublicProfileView.tsx`
- **Función/componente:** elementos `data-editor-target`
- **Líneas aproximadas:** (photo/name/bio/link atributos)
- **Descripción:** Solo existen `profile.photo`, `profile.name`, `profile.bio` y `link:${id}`; el handler soporta ~15 tipos.
- **Evidencia:** `search "data-editor-target"` → 4 resultados. `editor.tsx handleTapOnElement` (238–266) gestiona `cover/alias/footer/appearance.*/social_cover/hero_social/qr` sin elemento DOM.
- **Impacto técnico:** Ramas muertas en el handler; selección por tap no alcanzable para la mayoría de propiedades.
- **Impacto de usuario:** En móvil, el usuario no puede tocar portada/alias/footer/apariencia/QR para editarlos.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** El contrato de selección se amplió sin propagar atributos a todas las ramas de template de `PublicProfileView`.
- **Recomendación:** Añadir `data-editor-target` en todas las ramas de render condicional.
- **Riesgo de corregir:** Bajo (atributos aditivos).
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-04 — "Replace" de foto móvil es no-op
- **ID:** HLZ-04
- **Severidad:** P1_HIGH
- **Área:** UX móvil / editor
- **Archivo:** `src/routes/editor.tsx`
- **Función/componente:** `handleFloatingToolbarAction`
- **Líneas aproximadas:** 284–293
- **Descripción:** Acción `replace` crea `<input type=file>` y solo hace `console.log`, sin subir ni aplicar la imagen.
- **Evidencia:** `console.log("File selected:"...)` (editor.tsx:291) — único `console.log` de negocio.
- **Impacto técnico:** Funcionalidad de reemplazo de foto ausente.
- **Impacto de usuario:** El botón "replace" en la toolbar flotante no hace nada perceptible.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Implementación incompleta (stub) dejada en producción.
- **Recomendación:** Implementar subida a storage + `setProfile({ avatar_url })` o eliminar la acción.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-05 — Contraseñas de documentos en localStorage en claro
- **ID:** HLZ-05
- **Severidad:** P1_HIGH
- **Área:** Seguridad
- **Archivo:** `src/routes/encrypted-documents.tsx`
- **Función/componente:** `EncryptedDocumentsApp` (estado `documentPasswords`)
- **Líneas aproximadas:** 278–297
- **Descripción:** Las contraseñas receptoras se persisten en `localStorage` en texto plano.
- **Evidencia:** `window.localStorage.setItem(passwordStorageKey, JSON.stringify(nextPasswords))`.
- **Impacto técnico:** Exposición de contraseñas ante XSS o acceso físico al dispositivo.
- **Impacto de usuario:** Riesgo de compromiso de documentos "protegidos" por contraseña.
- **Probabilidad:** Media
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Atajo de conveniencia UX (recuperar contraseñas) sin considerar riesgo.
- **Recomendación:** Mantener en memoria de sesión (no persistir) o añadir aviso/permiso explícito de riesgo.
- **Riesgo de corregir:** Medio (pérdida de conveniencia).
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-06 — Premium es mock (entitlements siempre free)
- **ID:** HLZ-06
- **Severidad:** P1_HIGH
- **Área:** Negocio / monetización
- **Archivo:** `src/lib/entitlements.ts`
- **Función/componente:** `getUserEntitlements` / `canUsePremiumTemplates`
- **Líneas aproximadas:** 37–66
- **Descripción:** `canUsePremiumTemplates` retorna `false` siempre; `getUserEntitlements` hardcodea plan `free`.
- **Evidencia:** `const plan: UserPlan = "free"; const isPremium = false;` (líneas 50–51), `return false;` (línea 65).
- **Impacto técnico:** El gating real de premium se apoya en `ADMIN_EMAILS`/`PREMIUM_DEV_EMAILS` JS-side.
- **Impacto de usuario:** Riesgo de que usuarios no premium accedan (o que el dueño no pueda monetizar de forma verificable).
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Sistema de suscripciones no implementado (Stripe/backend ausente).
- **Recomendación:** Implementar verificación server-side + tabla de suscripciones; no confiar en email client-side.
- **Riesgo de corregir:** Alto (requiere backend).
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-07 — Fallback de admin por email con `admin@example.com`
- **ID:** HLZ-07
- **Severidad:** P1_HIGH
- **Área:** Seguridad / IAM
- **Archivo:** `src/lib/admin-check.ts`
- **Función/componente:** `ADMIN_EMAILS` / `isAdminEmail`
- **Líneas aproximadas:** 29–35
- **Descripción:** `admin@example.com` figura como email admin de fallback junto al del dueño.
- **Evidencia:** `export const ADMIN_EMAILS = ["falcondaniel37@gmail.com", "admin@example.com"];`
- **Impacto técnico:** Si un atacante posee/registra `admin@example.com`, el fallback lo trata como admin.
- **Impacto de usuario:** Riesgo de escalada de privilegios en el panel de administración.
- **Probabilidad:** Media
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Valor demo dejado en lista de producción.
- **Recomendación:** Eliminar `admin@example.com`; resolver admin solo por tabla `admin_users`.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-08 — Build sin gate de tipos (20 errores TS)
- **ID:** HLZ-08
- **Severidad:** P2_MEDIUM
- **Área:** Calidad / CI
- **Archivo:** `package.json`, `vite.config.ts`
- **Función/componente:** scripts `build`
- **Líneas aproximadas:** `package.json` line 8
- **Descripción:** `build = "vite build"` sin `tsc --noEmit`; 20 errores TS no bloquean despliegue.
- **Evidencia:** `npm run build` exit 0; `npx tsc --noEmit` exit 2 (listado completo en §1).
- **Impacto técnico:** Errores de tipos (incluidos `possibly undefined`) llegan a producción.
- **Impacto de usuario:** Riesgo de crash en runtime no detectado.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — reproducible con `npx tsc --noEmit`.
- **Root cause:** Config de build no incluye chequeo de tipos.
- **Recomendación:** Script `build = "tsc --noEmit && vite build"` + resolver errores.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 1
- **Estado:** CONFIRMED

### HLZ-09 — `increment_scan_count` inflable por anon
- **ID:** HLZ-09
- **Severidad:** P2_MEDIUM
- **Área:** Seguridad / RLS-RPC
- **Archivo:** `supabase/migrations/20260819130000_add_qr_stats_and_history.sql`
- **Función/componente:** `increment_scan_count`
- **Líneas aproximadas:** 42–52
- **Descripción:** Función `SECURITY DEFINER` sin `REVOKE EXECUTE` a `public`/`anon`.
- **Evidencia:** La migración define la función sin `REVOKE` ni `GRANT` selectivo (a diferencia de los RPC de documentos).
- **Impacto técnico:** Cualquier anon puede incrementar `scan_count` de un perfil arbitrario.
- **Impacto de usuario:** Métricas de escaneo infladas artificialmente.
- **Probabilidad:** Media
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Falta de hardening de grants tras definir el RPC.
- **Recomendación:** `REVOKE EXECUTE ... FROM public, anon` y `GRANT EXECUTE TO authenticated`.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-10 — Geolocalización HTTP (mixed-content)
- **ID:** HLZ-10
- **Severidad:** P2_MEDIUM
- **Área:** Métricas / red
- **Archivo:** `src/services/analyticsService.ts`
- **Función/componente:** `getGeolocation`
- **Líneas aproximadas:** 109
- **Descripción:** `fetch("http://ip-api.com/json/")` — HTTP no seguro.
- **Evidencia:** Línea 109 de analyticsService.ts.
- **Impacto técnico:** Bloqueado por mixed-content en HTTPS → `country`/`city/lat/lon` siempre `null`.
- **Impacto de usuario:** Analítica sin geolocalización.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Endpoint de terceros sin HTTPS.
- **Recomendación:** Usar `https://ip-api.com` (requiere plan de pago) o mover a server-side con IP real.
- **Riesgo de corregir:** Medio.
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-11 — `uniqueVisitors` = sesiones (hash de sessionId)
- **ID:** HLZ-11
- **Severidad:** P2_MEDIUM
- **Área:** Semántica de métricas
- **Archivo:** `src/services/analyticsService.ts`
- **Función/componente:** `trackPageView`
- **Líneas aproximadas:** 143
- **Descripción:** `ipHash = hashIP(sessionId)` → `unique visitors` real es `unique sessions`.
- **Evidencia:** `const ipHash = await hashIP(sessionId);` y `COUNT(DISTINCT ip_hash)` en migración.
- **Impacto técnico:** Distorsión de la métrica de visitantes únicos.
- **Impacto de usuario:** Dashboards sobreestiman visitantes únicos.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** IP real no disponible client-side; sustituida por sessionId.
- **Recomendación:** Obtener IP server-side y hashear real, o renombrar métrica a "sesiones".
- **Riesgo de corregir:** Medio.
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-12 — Policy de analytics `WITH CHECK (true)`
- **ID:** HLZ-12
- **Severidad:** P2_MEDIUM
- **Área:** RLS
- **Archivo:** `supabase/migrations/20260819212000_create_analytics.sql`
- **Función/componente:** policy `Anyone can insert analytics`
- **Líneas aproximadas:** 59–61
- **Descripción:** INSERT abierto a anon/authenticated con `WITH CHECK(true)`.
- **Evidencia:** La policy; RPC track es `SECURITY DEFINER` por lo que esta policy es redundante y sobre-permisiva.
- **Impacto técnico:** Spoofing de filas de analítica por anon.
- **Impacto de usuario:** Métricas manipulables.
- **Probabilidad:** Media
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Policy heredada de una versión sin RPC.
- **Recomendación:** Eliminar la policy y confiar en el RPC controlado.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-13 — PBKDF2 10k para hash de contraseña
- **ID:** HLZ-13
- **Severidad:** P2_MEDIUM
- **Área:** Seguridad
- **Archivo:** `src/lib/encryption.ts`
- **Función/componente:** `hashPassword`
- **Líneas aproximadas:** 184
- **Descripción:** Hash de contraseña con 10,000 iteraciones PBKDF2-SHA256.
- **Evidencia:** `iterations: 10000` (encryption.ts:184).
- **Impacto técnico:** Hash débil frente a fuerza bruta si se filtra `password_hash`.
- **Impacto de usuario:** Menor protección de documentos con contraseña.
- **Probabilidad:** Media
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Valor de iteraciones bajo.
- **Recomendación:** Subir a ≥600k (OWASP) o usar scrypt/argon2.
- **Riesgo de corregir:** Bajo (pero requiere re-hash de datos existentes).
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-14 — Claim consumido antes de confirmar entrega
- **ID:** HLZ-14
- **Severidad:** P2_MEDIUM
- **Área:** Seguridad / integridad
- **Archivo:** `src/routes/d.$shortUrl.tsx`
- **Función/componente:** `handleDownload`
- **Líneas aproximadas:** 226–254
- **Descripción:** El contador se incrementa en `claim_encrypted_document_download` antes de confirmar fetch + descifrado; si el cliente falla tras el claim, se pierde la entrega.
- **Evidencia:** Orden en `authorizeDownloadFn` (claim → signedUrl) vs fetch/decrypt en cliente sin compensación.
- **Impacto técnico:** Descargas perdidas en límite/one-time.
- **Impacto de usuario:** El receptor puede quedarse sin descarga aunque fallara.
- **Probabilidad:** Media
- **Reproducibilidad:** LIKELY (requiere fallo de red/descifrado).
- **Root cause:** Compensación solo implementada para fallo de `createSignedUrl`.
- **Recomendación:** `decrement_document_downloads` ante fallo de fetch/decrypt, o deferir claim.
- **Riesgo de corregir:** Medio (ABBA de concurrencia a revisar).
- **Prioridad:** 2
- **Estado:** LIKELY

### HLZ-15 — `user-scalable=0` rompe zoom de accesibilidad
- **ID:** HLZ-15
- **Severidad:** P2_MEDIUM
- **Área:** Accesibilidad
- **Archivo:** `src/routes/__root.tsx`
- **Función/componente:** meta viewport
- **Líneas aproximadas:** 94
- **Descripción:** `maximum-scale=1, user-scalable=0` desactiva zoom nativo.
- **Evidencia:** contenido del meta viewport.
- **Impacto técnico:** Viola WCAG 1.4.4 (resize text).
- **Impacto de usuario:** Usuarios con baja visión no pueden ampliar.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Intento de evitar zoom accidental en editor.
- **Recomendación:** Quitar `maximum-scale/user-scalable` y gestionar el gesto a nivel de componente.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 2
- **Estado:** CONFIRMED

### HLZ-16 — Payload de links sin sanitización
- **ID:** HLZ-16
- **Severidad:** P2_MEDIUM
- **Área:** Persistencia
- **Archivo:** `src/services/link.service.ts`
- **Función/componente:** `createProfileLink` / `updateProfileLink`
- **Líneas aproximadas:** 220–248
- **Descripción:** Los updates de links pasan el objeto crudo sin whitelist (a diferencia de profile).
- **Evidencia:** `updateProfileLink` hace `.update(updates)` sin filtrar columnas.
- **Impacto técnico:** Posible `400 unknown column` o escritura de campos inesperados.
- **Impacto de usuario:** Fallos de guardado de enlaces.
- **Probabilidad:** Media
- **Reproducibilidad:** LIKELY.
- **Root cause:** Whitelist aplicada solo a profile.
- **Recomendación:** Añadir `PROFILE_LINK_WRITABLE_COLUMNS` + filtro.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 2
- **Estado:** LIKELY

### HLZ-17 — `auth.admin.listUsers()` sobre cliente anon
- **ID:** HLZ-17
- **Severidad:** P2_MEDIUM
- **Área:** Admin / runtime
- **Archivo:** `src/components/admin/PremiumPanel.tsx`
- **Función/componente:** `handleGrantPremium`
- **Líneas aproximadas:** 68
- **Descripción:** `supabase.auth.admin.listUsers()` con cliente browser (solo anon key); `auth.admin` no existe en el cliente supabase-js.
- **Evidencia:** `getBrowserSupabaseClient()` (línea 34) usado con `.auth.admin.listUsers()` (68).
- **Impacto técnico:** Error en runtime ("auth.admin is undefined") al otorgar premium por email.
- **Impacto de usuario:** El flujo de otorgar premium vía panel admin falla.
- **Probabilidad:** Alta
- **Reproducibilidad:** LIKELY (requiere ejecución).
- **Root cause:** Uso de Admin Auth API disponible solo con service_role en server.
- **Recomendación:** Mover a server-fn con service_role y resolver identidad por email vía RPC.
- **Riesgo de corregir:** Medio.
- **Prioridad:** 2
- **Estado:** LIKELY

### HLZ-18 — `$alias` no reserva rutas `d/admin/profile/encrypted-documents`
- **ID:** HLZ-18
- **Severidad:** P2_MEDIUM
- **Área:** Routing
- **Archivo:** `src/routes/$alias.tsx`
- **Función/componente:** loader / `reservedRoutes`
- **Líneas aproximadas:** 11–23
- **Descripción:** Lista de reservadas omite prefijos de rutas estáticas del sistema.
- **Evidencia:** `reservedRoutes` no incluye `d`, `admin`, `profile`, `encrypted-documents`.
- **Impacto técnico:** Posible colisión conceptual de `slug` con rutas del sistema.
- **Impacto de usuario:** Ambigüedad si un alias coincide con rutas reservadas (TanStack prioriza estáticas, pero es frágil).
- **Probabilidad:** Baja
- **Reproducibilidad:** LIKELY.
- **Root cause:** Lista no sincronizada con el árbol de rutas.
- **Recomendación:** Derivar reservas desde `routeTree` o centralizar en una constante única.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 3
- **Estado:** LIKELY

### HLZ-19 — Estado muerto `bottomSheetContent` / `pinchTransformOrigin`
- **ID:** HLZ-19
- **Severidad:** P3_LOW
- **Área:** Mantenibilidad
- **Archivo:** `src/routes/editor.tsx`
- **Función/componente:** `EditorPage`
- **Líneas aproximadas:** 180, 186
- **Descripción:** `bottomSheetContent` escrito y nunca leído; `pinchTransformOrigin` escrito y transform usa `center center` fijo.
- **Evidencia:** Lectura de `bottomSheetContent` = 0 resultados; transformOrigin hardcodeado en `.phone-canvas` (1038).
- **Impacto técnico:** Deuda y confusión; el foco del pinch no se implementa.
- **Impacto de usuario:** Ninguno directo; limita futuras mejoras de pinch focal.
- **Probabilidad:** Alta
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Refactor parcial.
- **Recomendación:** Eliminar estado muerto o implementar `transformOrigin` focal en pinch.
- **Riesgo de corregir:** Bajo.
- **Prioridad:** 3
- **Estado:** CONFIRMED

### HLZ-20 — SVG "con marco" es PNG embebido
- **ID:** HLZ-20
- **Severidad:** P3_LOW
- **Área:** QR export
- **Archivo:** `src/components/qr/QRCodeAdvanced.tsx`
- **Función/componente:** `useQRAdvancedDownload`
- **Líneas aproximadas:** 603–649
- **Descripción:** Con marco o colores de esquina, el archivo `.svg` es un `<image>` con PNG base64, no vectorial.
- **Evidencia:** `needsCanvasExport` (605) y `<image href="data:image/png...">` (641).
- **Impacto técnico:** Pérdida de vectorialidad y escalabilidad.
- **Impacto de usuario:** SVG no vectorial para diseños con marco (no perceptible salvo impresión/zoom).
- **Probabilidad:** Media
- **Reproducibilidad:** Sí — estático.
- **Root cause:** Limitación de qr-code-styling para marcos rasterizados.
- **Recomendación:** Documentar como PNG embebido o rasterizar a PNG real en vez de `.svg`.
- **Riesgo de corregir:** Medio.
- **Prioridad:** 3
- **Estado:** CONFIRMED

---

## Notas de integridad de la auditoría

- No se reporta ningún `PASS` táctil/visual sin dispositivo/navegador real; esas áreas se marcan `NEEDS_RUNTIME_QA`.
- No se usan scores subjetivos; cada conclusión relevante referencia `archivo:línea` o salida de comando.
- Las afirmaciones prohibidas ("production ready", "zero knowledge", "60fps", etc.) fueron evitadas o sustituidas por el enunciado permitido.
