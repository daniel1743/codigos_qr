# ENC-DOC-SECURE-DELIVERY-02

// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02

## Resultado

Se reemplazó el intento de descarga anónima directa desde el bucket privado por una autorización server-side de TanStack Start. La operación reserva el acceso atómicamente en PostgreSQL y, solo si todas las validaciones pasan, entrega una signed URL de 45 segundos. El ciphertext sigue descifrándose en el navegador.

## Arquitectura anterior

```text
/d/{shortUrl}
→ RPC pública devuelve path, IV, salt y password_hash
→ React valida password, expiración y límites
→ browser anon llama Storage.download(path)
→ bucket privado responde Object not found
→ contador se incrementa después
```

## Causa raíz

El receptor público usaba el cliente Supabase browser con anon key para leer directamente un bucket privado. No existía mediador server-side ni credencial temporal. Además, las validaciones de negocio no eran atómicas y secretos internos se devolvían al cliente.

## Arquitectura nueva

```text
QR
→ /d/{shortUrl}
→ server function solicita metadata pública mínima
→ usuario introduce password si aplica
→ server llama RPC de autorización service_role
→ PostgreSQL bloquea la fila y valida estado/password/límites
→ PostgreSQL reserva current_downloads antes de entregar
→ server crea signed URL de 45 segundos
→ browser descarga ciphertext
→ browser descifra AES-256-GCM localmente
→ archivo original
```

## Flujo con contraseña

1. El archivo se cifra en browser con la derivación PBKDF2 existente.
2. La creación envía el password por TLS a una RPC autenticada.
3. PostgreSQL almacena un verificador bcrypt mediante `pgcrypto`; no guarda plaintext.
4. La metadata pública solo indica `password_required`.
5. El password se envía a la server function al autorizar.
6. PostgreSQL verifica bcrypt. Para documentos legacy sin bcrypt, compara el SHA-256 anterior exclusivamente server-side.
7. El cliente recibe signed URL, nombre, MIME, IV y salt; nunca recibe hash/verificador/path.
8. El browser deriva la clave PBKDF2 y descifra.

El KDF AES (PBKDF2) y el verificador de acceso (bcrypt) tienen propósitos separados.

## Flujo sin contraseña

La clave AES aleatoria se convierte a Base64 URL-safe y se añade únicamente como fragmento:

```text
/d/{shortUrl}#key=<base64url>
```

El fragmento no forma parte de la solicitud HTTP, no se guarda en DB y no se envía a la server function. El receptor lo convierte en memoria al formato Base64 requerido por Web Crypto. La pantalla de creación es el único momento en que el sistema puede entregar ese enlace completo; tras perderlo no existe recuperación server-side por diseño.

Los botones históricos de lista quedan deshabilitados para documentos sin password porque la base de datos no posee la clave y construirían enlaces incompletos.

## Short URL

Se sustituyó `Math.random()` por 18 bytes de `crypto.getRandomValues`, codificados Base64 URL-safe (24 caracteres). La restricción UNIQUE sigue resolviendo colisiones excepcionales; el usuario puede reintentar la creación.

## Concurrencia y límites

`authorize_encrypted_document_download` ejecuta `SELECT ... FOR UPDATE`, valida revocación, expiración, one-time y max downloads, y aumenta el contador dentro de la misma transacción antes de devolver el path al servidor.

Para `max_downloads=1` o one-time, dos solicitudes simultáneas serializan sobre la misma fila: una reserva y la otra observa el límite consumido.

Si Storage no logra crear la signed URL, la server function llama `release_encrypted_document_download` para compensar el contador. Si el cliente recibe la URL pero falla luego la red o el descifrado, la reserva permanece consumida: la autorización ya fue emitida y no existe confirmación confiable del cliente.

## SQL y RLS

La nueva migración:

- añade `revoked`, `revoked_at` y `password_verifier`;
- mantiene el bucket privado;
- elimina la policy `anon SELECT` global versionada;
- limita SELECT/INSERT/DELETE del creador a la carpeta cuyo primer segmento es `auth.uid()`;
- revoca ejecución pública de las tres RPCs inseguras anteriores;
- crea metadata pública mínima;
- crea inserción autenticada con bcrypt;
- crea autorización y compensación exclusivas de `service_role`;
- fija `search_path` y cualifica objetos.

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` se lee desde `process.env` únicamente dentro de server runtime.
- La variable no usa prefijo `VITE_`.
- No se devuelve service role, password hash, verifier, owner UUID ni storage path.
- La descarga directa anon fue eliminada.
- Los logs success/failure se originan dentro de la RPC server-side.
- No se implementa fingerprinting ni geolocalización.
- RSA y 2FA se declaran no disponibles; la UI ya no simula niveles distintos.
- El upload usa `application/octet-stream`.
- La UI valida un máximo de 50 MiB y la RPC repite la validación.

## Configuración manual requerida

1. Definir `SUPABASE_SERVICE_ROLE_KEY` como secreto server-only en Vercel/hosting.
2. Aplicar la migración nueva en Supabase después de revisarla.
3. Confirmar en producción:
   - bucket `encrypted-documents` privado;
   - ausencia de anon SELECT;
   - grants de RPC exactamente como la migración;
   - extensión `pgcrypto` disponible en schema `extensions`.

## Migración

```text
MIGRATION REQUIRED: YES

WHY:
Añade revocación, bcrypt, autorización atómica y hardening de Storage/RPC.

TABLES:
public.encrypted_documents
public.document_access_logs
storage.buckets
storage.objects (policies)

FIELDS:
revoked
revoked_at
password_verifier

FUNCTIONS:
get_encrypted_document_public_metadata
create_encrypted_document
authorize_encrypted_document_download
release_encrypted_document_download

POLICIES REMOVED:
Allow public select of encrypted documents
Allow authenticated users to upload encrypted documents
Allow owners to delete their encrypted documents
policies homónimas nuevas si existían

POLICIES ADDED:
Encrypted document owners can select
Encrypted document owners can insert
Encrypted document owners can delete

RLS IMPACT:
Receptores anon dejan de leer Storage. Creadores solo operan dentro de su carpeta.

STORAGE IMPACT:
Bucket forzado a private; entrega pública solo por signed URL temporal.

BACKWARD COMPATIBILITY:
Documentos con password legacy se verifican server-side con SHA-256 hasta recrearlos.
Documentos sin password legacy no poseen una clave recuperable y deben recrearse.
```

## Pruebas realizadas

Revisión estática del diff y de las firmas/rutas. El entorno de trabajo no contiene checkout ni dependencias, por lo que build, TypeScript, ESLint, ejecución SQL, prueba de concurrencia y QA real no pueden ejecutarse aquí.

## Plan de QA manual

- aplicar migración en preview;
- configurar service role server-only;
- build y lint;
- crear Excel/PDF con espacios, paréntesis y Unicode;
- probar 50 MiB y >50 MiB;
- probar password correcto/incorrecto y payload Network;
- probar QR sin password en otro navegador;
- ejecutar dos autorizaciones simultáneas con max=1;
- probar expiración y revocación;
- verificar acceso directo bucket/path denegado;
- esperar >45 s y verificar signed URL expirada;
- probar Chrome desktop y Android/iPhone;
- escanear QR físico y abrir el Excel descargado.

```text
VISUAL_QA: MANUAL_REQUIRED
SCAN_QA: MANUAL_REQUIRED
```

---

CHATGPT WORK FINAL REPORT

TASK:
ENC-DOC-SECURE-DELIVERY-02

STATUS:
IMPLEMENTED_IN_BRANCH — pending migration, environment secret and real QA.

ROOT_CAUSE_FIXED:
YES

FILES_READ:
Required encrypted-document routes, encryption service, browser/server Supabase clients, types, server entry, route tree, package/config files, related migrations and investigation.

FILES_MODIFIED:
src/routes/d.$shortUrl.tsx
src/routes/encrypted-documents.tsx
src/lib/supabase/server.ts
src/types/encrypted-documents.ts

FILES_CREATED:
src/lib/encrypted-document-delivery.ts
supabase/migrations/20260821190000_secure_encrypted_document_delivery.sql
docs/arreglos-ui/ENC-DOC-SECURE-DELIVERY-02.md

AGENT_SIGNATURES:
// Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02

MIGRATION:
REQUIRED

MIGRATION_APPLIED:
NOT_AUTHORIZED

STORAGE_BUCKET:
PRIVATE

ANON_STORAGE_SELECT:
ABSENT_AFTER_MIGRATION

SERVER_AUTHORIZATION:
TanStack Start createServerFn + service-role-only atomic PostgreSQL RPC.

SIGNED_URL_TTL:
45 seconds

PASSWORD_HASH_EXPOSED_TO_CLIENT:
NO

SERVICE_ROLE_EXPOSED_TO_CLIENT:
NO

NO_PASSWORD_KEY_FLOW:
Base64url AES key in #key fragment; never sent to server or stored in DB.

SHORT_URL_GENERATION:
18 cryptographically random bytes encoded Base64url.

REVOCATION:
revoked/revoked_at, enforced before reservation.

ATOMIC_DOWNLOAD_LIMIT:
SELECT FOR UPDATE + validation + increment in one transaction.

BUILD:
NOT_RUN_NO_LOCAL_CHECKOUT

TYPESCRIPT:
BLOCKED_PREEXISTING

ESLINT:
errors: NOT_RUN
warnings: NOT_RUN

TESTS:
STATIC_REVIEW_ONLY; REAL_QA_REQUIRED

CONCURRENCY_TEST:
MANUAL_REQUIRED

VISUAL_QA:
MANUAL_REQUIRED

SCAN_QA:
MANUAL_REQUIRED

OUT_OF_SCOPE_SOURCE_CHANGES:
NONE

OUT_OF_SCOPE_OPERATIONS:
No SQL applied; no bucket or production environment changed.

MANUAL_PENDING:
Configure SUPABASE_SERVICE_ROLE_KEY, apply migration in preview, build/lint, concurrency test, desktop/mobile/physical QR QA.

FINAL_VERDICT:
Secure delivery is implemented in the feature branch, but deployment acceptance remains pending until the migration, server secret and real end-to-end QA are completed.
