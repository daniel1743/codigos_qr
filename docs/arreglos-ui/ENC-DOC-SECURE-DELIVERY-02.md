# Entrega Segura End-to-End de Documentos Encriptados

Este documento detalla los cambios de arquitectura y seguridad implementados en el módulo de **Documentos Encriptados** bajo la especificación `ENC-DOC-SECURE-DELIVERY-02`.

---

## 1. Arquitectura Anterior (Insegura)
Anteriormente, el flujo público de descarga de archivos cifrados dependía enteramente de permisos directos en el navegador (cliente) usando la clave anónima (`anon` key) de Supabase:
* El cliente anónimo consultaba la tabla `encrypted_documents` directamente.
* La política de RLS permitía a cualquier usuario anónimo leer la metadata (incluyendo el `password_hash` SHA-256 y la ruta física del archivo `encrypted_file_path`).
* El navegador del cliente anónimo intentaba descargar el archivo de forma directa desde el bucket `encrypted-documents`.
* Si el bucket se configuraba como privado, la descarga fallaba (`Object not found`), y si se abría al público, cualquier persona podía descargar cualquier binario cifrado sin autorización.

---

## 2. Nueva Arquitectura Segura (Server-Side Authorization)
Hemos implementado un flujo de autorización atómico y firma de URLs en el lado del servidor, manteniendo el almacenamiento **100% privado**:

```text
QR (con enlace corto /d/{shortUrl})
 ➔ El navegador carga la página pública y obtiene solo metadata básica mediante una RPC restringida.
 ➔ El usuario ingresa la contraseña (si aplica).
 ➔ Se hace una llamada a la función del servidor TanStack Start (`authorizeDownloadFn`).
 ➔ El servidor (con privilegios de Service Role):
     1. Llama a la función de base de datos `authorize_and_claim_download` que bloquea la fila (`FOR UPDATE`) para evitar condiciones de carrera, verifica límites de descarga, expiración y revocación, e incrementa atómicamente el contador de descargas.
     2. Valida la contraseña comparando su hash derivado mediante PBKDF2 (10,000 iteraciones) con sal única.
     3. Si falla, revierte el contador (compensación) y registra un log de acceso fallido.
     4. Si tiene éxito, genera una Signed URL temporal en Supabase Storage (válida por 60 segundos) y registra el log de acceso exitoso.
 ➔ El navegador descarga el ciphertext usando la URL firmada de corta duración.
 ➔ El navegador descifra el archivo localmente (AES-GCM en el cliente) y gatilla la descarga con el nombre y tipo original del archivo.
```

---

## 3. Hardening de Base de Datos y Políticas

### Base de Datos (`supabase/migrations/20260821050000_secure_encrypted_document_delivery.sql`):
- **Revocación:** Se añadieron las columnas `revoked` (boolean) y `revoked_at` (timestamptz) a la tabla `encrypted_documents`.
- **Hardening RLS:** Se eliminaron todas las políticas de lectura pública (`anon SELECT`) sobre las tablas `encrypted_documents` y `document_access_logs`.
- **Hardening Storage:** Se eliminó la política pública de SELECT sobre el bucket `encrypted-documents`. El bucket queda configurado como **completamente privado**. Solo el propietario autenticado del archivo puede interactuar con sus objetos dentro de su carpeta exclusiva (`auth.uid()::text`).
- **Funciones Creadas:**
  - `get_encrypted_document_metadata(p_short_url)`: Devuelve únicamente campos no confidenciales (excluyendo contraseñas, rutas físicas e IVs/sales de cifrado antes de autorizarse).
  - `authorize_and_claim_download(p_short_url)`: Operación atómica de bloqueo de fila y consumo de descarga (bypassa RLS mediante `SECURITY DEFINER` pero con ejecución revocada a usuarios públicos; solo ejecutable por el servidor con `service_role`).
  - `decrement_document_downloads(p_document_id)`: Función de compensación en caso de que la validación de contraseña o firma de URL falle.
  - `log_document_access(p_document_id, p_success, p_user_agent)`: Inserta logs de acceso de forma segura.

---

## 4. Flujo de Archivos Sin Contraseña (URL Hash Fragment)
Para mantener el principio de Zero-Knowledge en archivos sin contraseña (donde la llave es generada aleatoriamente y no se guarda en el servidor):
- Al crear el archivo, se genera la URL corta incluyendo la llave de descifrado en el fragmento de la URL (`#key=<llave_base64>`).
- Este fragmento de la URL **nunca** viaja al servidor en las peticiones HTTP y no queda registrado en la base de datos.
- El receptor escanea el QR o copia el enlace que incluye el hash, el navegador extrae la llave mediante `window.location.hash`, realiza la autorización de descarga al servidor sin enviar la clave, descarga el archivo cifrado y aplica la clave del hash localmente para descifrar.
- Una vez cargada la clave en memoria, se limpia la barra de navegación usando `history.replaceState` para mayor privacidad.

---

## 5. Pruebas de Concurrencia y Seguridad

1. **Race Conditions:** El uso de `FOR UPDATE` en `authorize_and_claim_download` asegura un bloqueo exclusivo a nivel de fila durante la comprobación de límites e incremento. Si se configuran `max_downloads = 1` y ocurren múltiples peticiones paralelas, solo una pasará exitosamente; las demás serán rechazadas con `DOWNLOAD_LIMIT_REACHED`.
2. **Exposición de Credenciales:** La variable `SUPABASE_SERVICE_ROLE_KEY` se lee exclusivamente en el entorno del servidor y nunca se expone en el bundle de cliente generado para el navegador.
