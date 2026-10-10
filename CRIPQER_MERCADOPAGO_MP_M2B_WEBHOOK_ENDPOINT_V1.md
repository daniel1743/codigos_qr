# CRIPQER — MERCADO PAGO BILLING · MICROFASE MP-M2B
## WEBHOOK HTTP ENDPOINT + CANONICAL INTAKE V1

**Branch:** `billing/mercadopago-mp-m2-webhook-verifier`
**Base HEAD at start:** `611c97b` (`fix(billing): harden Mercado Pago webhook metadata validation`)
**Fecha:** 2026-10-10
**Veredicto:** `PASS_WITH_LIMITATION`

---

## 1. URL final del endpoint

```
POST https://<host>/api/billing/mercadopago/webhook
```

- **Path canónico:** `/api/billing/mercadopago/webhook` — exportado como `MERCADOPAGO_WEBHOOK_PATH` y verificado por test contra el literal de la ruta.
- **Archivo de ruta:** `src/routes/api.billing.mercadopago.webhook.ts` → convención real del repo ya localizada y usada (`createFileRoute(path)({ server: { handlers } })`, naming plano con puntos, igual que `sitemap[.]xml.ts`).
- **Método:** `POST`. `ANY` está registrado para que cualquier otro verbo reciba `405` del intake en vez de caer a un render de página inexistente.
- **Query firmada:** `data.id` (obligatoria).
- **Headers firmados:** `x-signature`, `x-request-id`.
- **Body:** JSON de la notificación (topic + acción + referencia). No firmado, no autoritativo.

Verificación del cableado real:
- `src/routeTree.gen.ts` regenerado por el plugin: **22 inserciones, 0 borrados**, exactamente una ruta nueva (`id` y `path` = `/api/billing/mercadopago/webhook`).
- Build de producción (preset Vercel): la ruta aparece **5 veces** en `.vercel/output/functions/__server.func/index.mjs`.
- Build de cliente: **0 archivos** en `.vercel/output/static` contienen `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `verifyMercadoPagoSignature`, `intakeMercadoPagoNotification` o `claimBillingEvent`.

---

## 2. Archivos tocados

| Archivo | Estado | Líneas | Rol |
|---|---|---|---|
| `src/server/billing/mercadopago/webhook-endpoint.ts` | nuevo | 628 | Núcleo del intake: orden, decisiones, status codes, wiring de producción |
| `src/routes/api.billing.mercadopago.webhook.ts` | nuevo | 40 | Transporte puro: `POST`/`ANY` → import dinámico del intake |
| `src/server/billing/mercadopago/__tests__/webhook-endpoint.test.ts` | nuevo | 1291 | 65 tests |
| `src/routeTree.gen.ts` | modificado | +22 / −0 | Regenerado por el plugin (ruta nueva) |

**Ningún archivo existente fue editado a mano.** El núcleo canónico (`webhooks.ts`, `application.ts`, `persistence.ts`, `client.ts`, `plan.ts`, `resource-fetcher.ts`, `webhook-verifier.ts`) quedó intacto.

---

## 3. Arquitectura — un solo pipeline, sin paralelo

```
Mercado Pago
   │  POST /api/billing/mercadopago/webhook?data.id=<id>
   ▼
src/routes/api.billing.mercadopago.webhook.ts     (transporte: 40 líneas, cero decisiones)
   │  import() dinámico  ── mantiene server-only fuera del bundle de cliente
   ▼
createMercadoPagoWebhookHandler(deps)             (el único lugar con decisiones)
   ├─ 2. verifyMercadoPagoSignature()             MP-M2  · congelado
   ├─ 5. intakeMercadoPagoNotification()          canónico · congelado
   ├─ 6. CanonicalIdempotencyBridge.claim()       → claim_billing_event
   ├─ 7. resolveMercadoPagoLookup()               MP-M1  · fetcher autoritativo
   └─ 8. applyNormalizedEvent()                   canónico · congelado
```

Cada paso es una primitiva que ya existía. Este módulo aporta **transporte, orden, códigos de estado y wiring** — nada más. No hay tabla nueva, no hay segundo dedupe, no hay segundo normalizador, no hay ruta alternativa de escritura.

**Por qué el import es dinámico:** un `import` estático en el archivo de ruta pondría Supabase y las credenciales de Mercado Pago en el grafo de módulos que el build de cliente también recorre. Importarlo dentro del handler lo excluye por construcción. Verificado en el bundle real (§1).

---

## 4. Metadatos extraídos de la request

| Dato | Origen | Uso | ¿Firmado? |
|---|---|---|---|
| `data.id` | **query** (`searchParams.get("data.id")`) | verificación + fetch autoritativo + event id | **Sí** |
| `x-signature` | header | verificación HMAC | — |
| `x-request-id` | header | verificación + event id | **Sí** (cuando está presente) |
| `ts` | dentro de `x-signature` | ventana de frescura | **Sí** |
| `type` / `topic`, `action`, `date_created` | body | clasificación (qué forma tiene la notificación) | **No** |
| `data.id` del body | body | **descartado** — reemplazado por el de query antes de clasificar | No |

Garantías estructurales (tests 5–7 + bloque 12):

- **Una sola** lectura de query en todo el módulo: `searchParams.get(MERCADOPAGO_DATA_ID_QUERY_KEY)`. No existe fallback a header ni a body.
- **Dos** lecturas de header, y `data.id` no es una de ellas.
- Un `data.id` contradictorio en el body **no** redirige el fetch ni el event key (test 6), y el campo legado `resource` tampoco (test 6b).
- Un header `data.id` inventado (que Mercado Pago no envía) no se consulta en ningún punto — y la firma sigue verificando, lo que **demuestra** que no forma parte del manifiesto (test 7).
- Ausencia de `data.id` en query ⇒ `400` antes de tocar nada.

---

## 5. Orden obligatorio de seguridad — y por qué es verificable

| # | Paso | Efecto observable permitido |
|---|---|---|
| 1 | Extraer metadatos mínimos (URL, `data.id`, 2 headers) | ninguno |
| 2 | `verifyMercadoPagoSignature` (digest) | ninguno |
| 3 | Frescura (`toleranceSeconds = 300`) | ninguno |
| 4 | Parseo del body (`JSON.parse`) | ninguno |
| 5 | Clasificación (`intakeMercadoPagoNotification`) | ninguno |
| 6 | `claim_billing_event` | primera fila en `billing_events` |
| 7 | Lookup autoritativo + normalize | primer GET a Mercado Pago |
| 8 | `applyNormalizedEvent` | primera escritura canónica |

Antes de una firma válida: **cero** fetch a Mercado Pago, **cero** acceso a Supabase, **cero** escrituras, **cero** `claim`, **cero** normalize, **cero** apply, **cero** entitlement, **cero** grants.

Eso no se declara: se mide. El doble de test registra cada fetch/claim/release/escritura, y 5 escenarios de fallo pre-firma exigen `state.calls === []` (test 26), incluyendo el caso en que el body **ni siquiera se lee** (`request.bodyUsed === false`, test 26b).

El claim (paso 6) precede deliberadamente al fetch (paso 7): una notificación reenviada se responde antes de gastar un GET al proveedor.

---

## 6. Frescura / replay — política explícita

```ts
export const MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS = 300;
```

- **Literal, no configurable.** Sin variable de entorno: un operador que pudiera ensancharla al infinito tendría una forma de desactivar la protección anti-replay sin beneficio operativo.
- **Sin `undefined`.** La primitiva MP-M2 deja la ventana desactivada por defecto (igual que el SDK oficial); MP-M2A.1 lo registró como limitación R2. Este endpoint la cierra pasando el valor explícito.
- **Simétrica:** `|now − ts·1000| > 300 s` rechaza. Un `ts` viejo y uno futuro se tratan igual.
- **Borde inclusivo:** exactamente 300 s se acepta (test 10b, ambas direcciones).
- **Después de la firma:** un `ts` falsificado no sirve para sondear la ventana antes de que el digest sea genuino.
- Superar la ventana ⇒ `401 REJECTED` + `rejectionReason: TIMESTAMP_OUT_OF_TOLERANCE` (sólo al sink), cero efectos.

---

## 7. Idempotencia — la canónica, sin sistema nuevo

Se reutiliza `claim_billing_event` vía `createCanonicalIdempotencyBridge`. **No hay tabla nueva, no hay segundo dedupe.**

**Event id = metadatos FIRMADOS únicamente:** `buildMercadoPagoEventId(dataId, requestId)` → `"<data.id>:<x-request-id>"` (o sólo `data.id` si no hay request id).

Por qué no el `id` del body (el fallback del intake congelado): es **no firmado**, y la clave de claim decide si un evento se procesa. Una clave elegible por quien escribe el body permitiría **suprimir** una notificación real colisionando con ella, o **reproducirla** cambiándola. `data.id` y `x-request-id` son miembros del manifiesto firmado.

| Situación | Resultado |
|---|---|
| Primera entrega | `claim` true → `processing` → ... → `processed` |
| Reentrega idéntica | `claim` false → `200 DUPLICATE`, sin segundo fetch ni segunda escritura |
| Evento fallido (`RETRY`) | `release` → `failed` → **re-claimable**: la reentrega lo recupera |
| Claim que lanza | `500 FAILED` fail-closed, sin fetch ni escritura |
| `markProcessed` que falla | `500 FAILED` — el estado sí se aplicó; sólo falló cerrar la fila |

Medido: 3 entregas idénticas ⇒ 1 fetch, 1 `upsertNormalizedSubscription`, 1 `markProcessed` (test 23). Dos request-ids distintos sobre el mismo recurso ⇒ dos eventos (test 11d): no se confunde "otra entrega" con "otro evento".

---

## 8. Lookup autoritativo — nunca el status del webhook

El body de Mercado Pago es **delgado**: lleva topic y referencia, no estado de suscripción. El estado SIEMPRE viene del recurso leído de la API.

| Notificación | Camino real de fetch | Estado aplicado |
|---|---|---|
| `preapproval` | `GET /preapproval/{id}` | el de la preapproval |
| `payment` | `GET /v1/payments/{id}` → `GET /preapproval/{preapproval_id}` | el de la **preapproval** |
| `authorized_payment` | `GET /authorized_payments/{id}` → `GET /preapproval/{preapproval_id}` | el de la **preapproval** |
| `subscription` | alias documentado de preapproval | el de la preapproval |

El `resourceId` de la instrucción se reemplaza por el **firmado**, así que ni un `data.id` contradictorio ni un `resource` legado pueden redirigir la lectura.

Se verificó explícitamente que un `payment` con `status: "approved"` en el body **no** produce una suscripción aprobada: lo aplicado es `status: "active"` leído de la preapproval (test 12).

`data.id` en query → `lookup.resourceId`; y el `eventId` de la instrucción → la clave firmada. Nada más se toca de la instrucción.

---

## 9. Normalize / apply — sólo lo canónico

- **Normalize:** `resolveMercadoPagoLookup` → `normalizeAuthoritativeResource` (congelado). No hay normalizador nuevo.
- **Apply:** `applyNormalizedEvent(deps.application, normalized)` — **dos argumentos**. No se pasa `trustedUserId` (test estructural 12e): un webhook no tiene usuario autenticado, y un tercer argumento permitiría a quien envía la request afirmar la propiedad.
- **Escrituras:** sólo a través del `ApplicationStore` canónico → `upsertBillingCustomer` / `upsertNormalizedSubscription`. **Nunca** `billing_subscriptions` directo, **nunca** `billing_grants`, **nunca** `resolveUserPlan`, **nunca** entitlement.
- Test 30d compara la escritura producida por el endpoint contra la que produce el núcleo canónico para el mismo evento normalizado: **idénticas** — el endpoint no añade campo, default ni plan propio.

---

## 10. Eventos soportados y no soportados

**Soportados** (producen lookup autoritativo):
`preapproval` · `subscription` (alias) · `payment` · `authorized_payment`

**No soportados** — `200 IGNORED`, cero efectos, sin Pro, sin asumir `active`, sin éxito falso:
`preapproval_plan` (topic mapeado a `unknown` a propósito) · `merchant_order` · `invoice` · `sale` · topic desconocido · body sin topic · body sin referencia

Por qué `200` y no `4xx`: Mercado Pago reintenta lo que cree rechazado, y para una notificación permanentemente inaplicable reintentar no ayuda a nadie. El `200 IGNORED` es una decisión explícita y documentada, no un "ok" optimista — el cuerpo de la respuesta dice `{"status":"IGNORED"}`, no `success`.

Si el intake alguna vez devolviera `kind: "normalized"` para Mercado Pago (inalcanzable por contrato: el intake del proveedor es delgado), se trata explícitamente como `IGNORED`: significaría que se leyó el body como autoritativo, exactamente lo que este endpoint no aplica.

---

## 11. Códigos de estado HTTP

| Status | HTTP | Cuerpo | Significado |
|---|---|---|---|
| `APPLIED` | 200 | `{"status":"APPLIED"}` | Firmado, lookup OK, estado canónico aplicado |
| `DUPLICATE` | 200 | `{"status":"DUPLICATE"}` | Ya reclamado; sin segundo apply |
| `IGNORED` | 200 | `{"status":"IGNORED"}` | Nada aplicable, terminal |
| `REJECTED` | 401 | `{"status":"REJECTED"}` | Firma / frescura / secreto ausente. **Sin motivo** |
| `INVALID_REQUEST` | 400 | `{"status":"INVALID_REQUEST"}` | Falta `data.id`, body no parseable, body no objeto |
| `RETRY` | 503 | `{"status":"RETRY"}` | No aplicado; una reentrega puede lograrlo |
| `FAILED` | 500 | `{"status":"FAILED"}` | Fallo interno; evento liberado o apply parcial |
| `METHOD_NOT_ALLOWED` | 405 | `{"status":"METHOD_NOT_ALLOWED"}` | No-POST, con header `allow: POST` |

El HTTP es **función pura** del status: ningún resultado puede obtener un código más amable del que merece. Todos los cuerpos son `application/json; charset=utf-8` + `cache-control: no-store`.

---

## 12. Comportamiento de retry

| Causa | Respuesta | Evento | Reintento del proveedor |
|---|---|---|---|
| Firma inválida / ausente | 401 | no se crea fila | inútil (no es un problema de entrega) |
| `ts` fuera de ventana | 401 | no se crea fila | inútil |
| `data.id` ausente | 400 | no se crea fila | inútil |
| Body no JSON / no objeto | 400 | no se crea fila | inútil |
| Topic no soportado | 200 IGNORED | `processed` | no reintenta (correcto) |
| Ya procesado | 200 DUPLICATE | sin cambio | no reintenta (correcto) |
| Proveedor 401/403/404/timeout/5xx | **503 RETRY** | `failed` (re-claimable) | **sí, y funciona** |
| `OWNER_REQUIRED` | **503 RETRY** | `failed` | sí — un checkout posterior puede cerrar la brecha |
| `PLAN_MAPPING_REQUIRED` | **503 RETRY** | `failed` | sí — al configurar el plan real |
| Apply lanza | **503 RETRY** | `failed` | sí |
| Claim lanza | 500 FAILED | sin fila tomada | sí |
| `markProcessed` falla | 500 FAILED | estado aplicado | — |

`404` se trata como **transitorio a propósito**: Mercado Pago puede entregar la notificación una fracción antes de que el recurso sea consultable. La asimetría de costos decide: una reentrega innecesaria cuesta un GET; cerrar como "ignorada" una activación real pierde un pago. En ninguno de los dos casos se aplica nada.

---

## 13. Errores del proveedor

Todos los fallos del fetch llegan tipados como `MercadoPagoError` (MP-M1) con un `code` de enum cerrado.

- **Transitorio ⇒ 503 RETRY + release:** `UNAUTHORIZED` (401/403), `NOT_FOUND` (404), `TIMEOUT`, `NETWORK_ERROR`, `HTTP_ERROR` (5xx), `MISSING_ACCESS_TOKEN`, `INVALID_JSON`.
- **Terminal ⇒ 200 IGNORED + `processed`:** `UNLINKED_PAYMENT` (un pago que no referencia preapproval **no es** un pago de suscripción — inventar una suscripción desde ahí es exactamente el callejón sin salida que MP-M1 cerró), `UNSUPPORTED_RESOURCE_TYPE`, `WRONG_PROVIDER`.
- **Excepción no tipada ⇒ 503 RETRY**, liberando el evento.
- En todos los casos: **cero** apply, **cero** escritura de suscripción, **cero** escritura de cliente.

El `providerErrorCode` viaja **sólo** al sink de diagnóstico (enum cerrado). El mensaje del proveedor no se copia a ninguna parte: se probó con un error hostil que lleva el access token en su mensaje y no aparece ni en el body, ni en el diagnóstico, ni en consola.

---

## 14. Secretos y logging

- **Server-side only:** `MERCADOPAGO_WEBHOOK_SECRET` y `MERCADOPAGO_ACCESS_TOKEN`, leídos **sólo** por `readMercadoPagoConfigFromEnv()` (MP-M1) dentro del wiring de producción. **Ningún `VITE_`**: no existe camino de código desde ese módulo a una variable pública. El test estructural lo fija (`process.env` y `VITE_` ausentes del módulo; los nombres de las variables no aparecen en código ejecutable).
- **Cero logging.** El módulo no escribe en `console` en ninguna rama — verificado con 5 spies (`log`/`info`/`warn`/`error`/`debug`) en 4 escenarios de fallo. Un secreto no puede filtrarse por una línea de debug porque no hay líneas.
- **El sink de diagnóstico** (`onDiagnostic`, opcional) sólo puede transportar enums cerrados + `eventId` (él mismo metadato firmado). No existe campo de tipo valor donde quepa un secreto, un token, un `Authorization`, una firma o un body del proveedor. Un sink que lance no afecta al procesamiento.
- **La respuesta nunca contiene** el secreto, el access token, `Authorization`, la firma (ni `v1=` ni `ts=`), el stack, ni el body sensible. Es una palabra de estado y nada más.
- Un `401` **no** revela el motivo: quien no puede firmar no aprende qué falló. El motivo (`MISSING_SECRET`, `SIGNATURE_MISMATCH`, `TIMESTAMP_OUT_OF_TOLERANCE`, …) sólo llega al sink.

---

## 15. Tests medidos (ejecutados, no estimados)

| Suite | Resultado |
|---|---|
| **MP-M2B** `__tests__/webhook-endpoint.test.ts` | **65 passed / 65** |
| `__tests__/webhook-verifier.test.ts` (MP-M2) | 100 passed / 100 |
| `__tests__/client.test.ts` (MP-M1) | 20 passed / 20 |
| `__tests__/resource-fetcher.test.ts` (MP-M1) | 26 passed / 26 |
| `__tests__/entitlement-boundary.test.ts` | 6 passed / 6 |
| B0 `b0-security-contract.test.ts` | 32 passed / 32 |
| B0 `b0-entitlement-grants.test.ts` | 17 passed / 17 |
| B0 `b0-plan-service.test.ts` | 10 passed / 10 |
| **Suite billing completa** (`vitest run src/server/billing`) | **8 archivos, 276 passed / 276** |
| `tsc --noEmit` filtrado a `billing` + `routes/api.billing` | **0 errores** |
| `eslint` en los 3 archivos tocados | **0 errores** |
| `git diff --check` | limpio (sólo aviso CRLF de git) |
| `npm run build` (preset Vercel) | **OK**, 18.50 s |
| Bundle de cliente | 0 archivos con material server-only |

**Runner: CODE_PASS** — Vitest corrió completo, sin `EPERM`. No hubo bloqueo de entorno.

### Cobertura de los 30 casos exigidos

| # | Caso | Test |
|---|---|---|
| 1 | Firma válida → pipeline continúa | `.1` (2 tests) |
| 2 | Firma inválida → 0 fetch / 0 escrituras | `.2` |
| 3 | Firma ausente → rechazo | `.2` |
| 4 | Secreto ausente → fail closed | `.2` |
| 5 | `data.id` desde query | `.3` |
| 6 | `data.id` contradictorio en body ignorado | `.3` (2 tests: `data.id` y `resource`) |
| 7 | Header `data.id` inventado ignorado | `.3` |
| 8 | Timestamp viejo → rechazo | `.4` |
| 9 | Timestamp futuro → rechazo | `.4` |
| 10 | Timestamp válido → continúa (+ borde ±300) | `.4` (2 tests) |
| 11 | Evento repetido → sin doble apply | `.5` (3 tests) |
| 12 | `payment` → lookup autoritativo | `.6` |
| 13 | `authorized_payment` → lookup autoritativo | `.6` |
| 14 | `preapproval` → camino correcto | `.6` (2 tests, incl. alias `subscription`) |
| 15 | Lookup 401 → no apply | `.7` |
| 16 | Lookup 403 → no apply | `.7` |
| 17 | Lookup 404 → sin éxito falso | `.7` (+ `.7` cuerpo `RETRY`) |
| 18 | Timeout → retryable | `.7` |
| 19 | Proveedor 5xx → retryable | `.7` |
| 20 | JSON inválido | `.8` (2 tests) |
| 21 | Tipo desconocido | `.8` (3 tests) |
| 22 | Evento ya procesado | `.5` |
| 23 | `applyNormalizedEvent` como máximo una vez | `.5` |
| 24 | Sin entitlement directo | `.9` (2 tests) |
| 25 | Sin `success=true` de query | `.9` |
| 26 | Cero efectos antes de firma válida | `.9` (2 tests, incl. body sin leer) |
| 27 | Secreto no aparece en logs | `.10` |
| 28 | Access token no aparece en logs | `.10` |
| 29 | Errores no exponen internals | `.10` (4 tests) |
| 30 | Happy path completo | `.11` (4 tests, incl. paridad con el núcleo) |

Extra: `.12` (contrato estructural del módulo) y `.13` (cableado de la ruta y URL final).

---

## 16. Limitaciones (honestas, medidas)

**L1 — La primera activación no puede aplicarse todavía (por diseño del sistema, no del endpoint).**
`applyNormalizedEvent` prueba la propiedad **sólo** desde `trustedUserId` o desde una suscripción ya asociada (`getSubscriptionByProviderId`). Un webhook no trae usuario, así que la primera activación de un usuario nuevo responde `OWNER_REQUIRED` ⇒ `503 RETRY` + evento liberado. **No se escribe nada y no se concede acceso** (test 30b).
Cerrar esto requiere que la fase de checkout persista la correlación proveedor↔usuario **antes** del primer webhook. El endpoint la aplicará sin cambios cuando exista. El camino de renovación (suscripción ya asociada) funciona hoy de punta a punta.

**L2 — `MERCADOPAGO_PRO_PLAN_ID` sigue sin configurar.**
El resolver MP-M1 es fail-closed: sin el id real, todo plan resuelve `null` y el núcleo responde `PLAN_MAPPING_REQUIRED` ⇒ `503 RETRY` (test 30c). Es el estado previsto hasta que el owner cree el plan remoto. No se hardcodeó ningún id.

**L3 — Escritura de cliente parcial si falla la escritura de suscripción.**
`upsertBillingCustomer` precede a `upsertNormalizedSubscription` en el núcleo canónico. Si la segunda falla, queda una fila de cliente sin suscripción. No es una concesión de acceso (la fila de cliente es una asociación, no un plan), pero es una escritura que sobrevive al fallo. Es comportamiento del núcleo, no del endpoint; se documenta en vez de esconderse.

**L4 — Si `markProcessed` falla tras un apply exitoso**, la fila queda en `processing` y la reentrega se responde `DUPLICATE`. El estado de suscripción ya está aplicado correctamente; lo único irrecuperable por reentrega es el cierre de la fila de bookkeeping. Se reporta como `500 FAILED` en vez de declarar un éxito limpio.

**L5 — El body no está firmado (propiedad del esquema de Mercado Pago).**
El esquema firma metadatos, no el body. La mitigación no es criptográfica sino de diseño: el body sólo elige la **forma** de la notificación (topic), nunca la identidad del recurso (siempre el `data.id` firmado) ni ningún estado de suscripción (siempre leído del proveedor). Un atacante capaz de reenviar una request firmada capturada dentro de la ventana de 300 s no puede alterar el efecto: el recurso y el estado son autoritativos.

---

## 17. Qué NO se implementó (deliberadamente)

- **Adapter de proveedor:** `createSession`, `cancel`, `reactivate`, `changePlan` **no** existen aquí, y no se registró ningún adapter incompleto (`adapters/index.ts` intacto).
- **Checkout / preapproval creation:** nada crea recursos remotos. Cero llamadas de escritura a Mercado Pago.
- **Plan remoto:** no se creó ni hardcodeó `MERCADOPAGO_PRO_PLAN_ID`.
- **UI:** ninguna.
- **Entitlements / grants:** no se tocan. Una suscripción aplicada no es una decisión de acceso.
- **Tabla nueva / segundo dedupe / cola / retry loop / cron:** ninguno. La reentrega la hace Mercado Pago.
- **Variable de entorno para la ventana de frescura:** no existe, por decisión.
- **Push / deploy:** no ejecutados.

---

## 18. Próximo paso

1. **Fase de checkout** para persistir la correlación proveedor↔usuario **antes** del primer webhook — cierra **L1** y hace alcanzable el `APPLIED` de primera activación.
2. **Crear el plan remoto** en la cuenta de Mercado Pago del owner y configurar `MERCADOPAGO_PRO_PLAN_ID` — cierra **L2**.
3. **Registrar la URL** `https://<host>/api/billing/mercadopago/webhook` en el dashboard de Mercado Pago junto con el secreto, y confirmar una entrega real de sandbox/notificación de prueba end-to-end.
4. **Sólo después:** adapter de proveedor (createSession/cancel/changePlan) y UI de facturación.

---

## 19. Resumen de git diff

```
 M src/routeTree.gen.ts                                          (+22 / −0)
?? src/routes/api.billing.mercadopago.webhook.ts                 (40)
?? src/server/billing/mercadopago/webhook-endpoint.ts            (628)
?? src/server/billing/mercadopago/__tests__/webhook-endpoint.test.ts (1291)
```

- **Sólo adiciones.** El único archivo modificado es el árbol de rutas autogenerado, en una única entrada aditiva.
- **Sin cambios** en núcleo canónico, migraciones, `package.json`, configuración ni secrets.
- `git diff --check`: limpio.
- **No push. No deploy.**

---

**Veredicto: `PASS_WITH_LIMITATION`.**

El endpoint está implementado, conectado al pipeline canónico sin paralelo, y verificado por 65 tests propios más 211 tests de regresión de la suite de billing (276 en total, todos en verde), build de producción OK y bundle de cliente comprobadamente libre de material server-only. Las limitaciones L1 y L2 son condiciones del sistema (fase de checkout ausente; plan remoto no creado), no defectos de MP-M2B: mientras existan, el endpoint falla **hacia el lado seguro** — no aplica, no concede, pide reentrega.
