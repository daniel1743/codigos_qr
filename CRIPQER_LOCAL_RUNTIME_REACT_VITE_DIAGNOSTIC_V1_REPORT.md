# CRIPQER — Local Runtime React/Vite Diagnostic V1

Fecha: 2026-09-23  
Modo: diagnóstico estricto únicamente  
Cambios de código/dependencias/base de datos: ninguno durante este diagnóstico

## Clasificación final

**Primaria: `STALE_SERVICE_WORKER_OR_BROWSER_CACHE`**

Secundarias:

- `PORT_OR_PROCESS_CONFLICT`: PID `31608` ya escucha en `localhost:8080`.
- `HMR_WEBSOCKET_CONFIGURATION`: no fue posible validar un arranque limpio porque el puerto estaba ocupado; el servidor existente sirve HTML, pero `/editor` no responde en 5 segundos.
- La duplicación de React **no** aparece en la resolución de Node/npm.

## 1. Procesos y puertos

Comandos ejecutados:

```powershell
tasklist | findstr node
netstat -ano | findstr :8080
netstat -ano | findstr :5173
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Select-Object ProcessId,CommandLine
```

Resultado relevante:

```text
node.exe 3828
node.exe 5116
node.exe 31608

TCP [::1]:8080 [::]:0 LISTENING 31608
```

La línea de comando del proceso activo fue:

```text
"C:\Program Files\nodejs\node.exe" node_modules/vite/bin/vite.js dev --port 8080 --strictPort --host localhost ...
```

El puerto `5173` no tenía listener. No se terminó ningún proceso.

## 2. Resolución React

Comandos ejecutados:

```powershell
npm ls react react-dom
npm ls react react-dom --all
node -e "console.log('react', require.resolve('react')); console.log('react-dom', require.resolve('react-dom')); console.log(require('react/package.json').version); console.log(require('react-dom/package.json').version)"
```

Resultado exacto de resolución:

```text
react C:\Users\Lenovo\Desktop\proyectos desplegados importante\generador de QR\node_modules\react\index.js
react-dom C:\Users\Lenovo\Desktop\proyectos desplegados importante\generador de QR\node_modules\react-dom\index.js
19.2.8
19.2.8
```

`npm ls --all` mostró `react@19.2.8` y `react-dom@19.2.8` deduped en las dependencias React relevantes. No hay evidencia de una segunda versión instalada en el árbol activo.

## 3. Cache local

Existe:

```text
node_modules/.vite — 2026-09-23 18:31:09
```

No existen `.tanstack`, `.vinxi` ni `.nitro` en la raíz del proyecto.

No se eliminaron directorios de cache.

## 4. Arranque limpio de Vite

Comando ejecutado:

```powershell
npm run dev -- --host localhost --port 8080 --strictPort
```

El script actual expandió a:

```text
vite dev --force --host localhost --port 8080 --strictPort
```

Salida relevante:

```text
[vite] (client) Forced re-optimization of dependencies
error when starting dev server:
Error: Port 8080 is already in use
```

También apareció el warning conocido de la ruta de test `src/routes/__tests__/pages.routing.test.ts`, que no exporta `Route` y no se incluye en el route tree. No es la causa del runtime React.

## 5. HTTP probe

Comandos ejecutados contra el proceso ya existente:

```powershell
Invoke-WebRequest http://localhost:8080/ -UseBasicParsing -TimeoutSec 5
Invoke-WebRequest http://localhost:8080/editor -UseBasicParsing -TimeoutSec 5
```

Resultados:

```text
http://localhost:8080/ status=200 type=text/html; charset=utf-8 length=118497
http://localhost:8080/editor ERROR The request was canceled due to the configured HttpClient.Timeout of 5 seconds elapsing.
```

La respuesta de `/` contiene HTML de TanStack Start en modo desarrollo y referencias `virtual:tanstack-start-dev-client-entry`. La petición a `/editor` no terminó dentro de 5 segundos.

## 6. HMR/WebSocket/configuración

`vite.config.ts` no contiene configuración explícita de `server`, `hmr`, proxy u origin. El wrapper `@lovable.dev/vite-tanstack-config` sí aporta deduplicación de:

```text
react
react-dom
react/jsx-runtime
react/jsx-dev-runtime
```

No fue posible observar un handshake WebSocket limpio porque el proceso de prueba no pudo arrancar en 8080. El conflicto de listener impide descartar por completo el estado del proceso residual como causa secundaria.

Clasificación HMR: **`HMR_CONFIG_NORMAL`**, con evidencia operativa incompleta por proceso/puerto ocupado.

## 7. Service Worker

`src/routes/__root.tsx` registra `/sw.js` sin comprobar `import.meta.env.DEV`:

```text
navigator.serviceWorker.register("/sw.js")
```

`public/sw.js`:

- usa `CACHE_NAME = "cripqer-brand-cache-v2"`;
- intercepta GET same-origin;
- usa Network First para navegación HTML;
- usa **stale-while-revalidate** para los demás assets;
- guarda respuestas same-origin con status 200.

Conclusión: el Service Worker **sí se registra durante desarrollo** y **sí puede devolver assets JS/CSS antiguos**. Esto es compatible con la combinación de hashes Vite antiguos y los errores `Invalid hook call` / `useState` con dispatcher nulo.

Clasificación: **`SERVICE_WORKER_DEVELOPMENT_RISK_CONFIRMED`**.

## 8. Package/lock consistency

`package.json` solicita:

```text
react     ^19.2.0
react-dom ^19.2.0
```

`package-lock.json` resuelve:

```text
node_modules/react     19.2.8
node_modules/react-dom 19.2.8
```

No se ejecutaron `npm install` ni `npm ci`. No hay desacuerdo material entre package manifest, lockfile y árbol instalado.

## 9. Paquetes anidados

Se encontraron `package.json` dentro de carpetas de snapshots/staging:

```text
986e7731-8ba6-4d3e-90f0-e17884ea365e/package.json
986e7731-8ba6-4d3e-90f0-e17884ea365e/src/package.json
.staging/magic-direct-page-editor-pilot-20260922/package.json
.staging/magic-direct-page-editor-pilot-20260922/src/package.json
```

No se encontraron `node_modules` anidados dentro de esas fronteras. El único `node_modules` adicional relevante está bajo `.vercel/output/functions/__server.func`, generado por el build. No hay evidencia de que esas carpetas estén resolviendo React para el árbol `src` activo.

## 10. Build independiente del navegador

Comando:

```powershell
npm run build
```

Resultado: **PASS**.

El build terminó con salida Nitro/Vercel generada. Solo emitió warnings no bloqueantes:

- regla CSS `@theme` desconocida para LightningCSS;
- ruta de test sin export `Route`;
- chunks mayores a 500 kB.

No hubo error de React, TypeScript de bundling ni fallo de generación de producción.

## Recomendación siguiente

Detener manualmente el servidor Node que ocupa 8080, iniciar una sola instancia limpia y retirar el Service Worker/cache del origen `localhost:8080` desde DevTools antes de probar de nuevo. La corrección de código del Service Worker queda fuera de este diagnóstico estricto.

No se tocaron Supabase, Auth, editores, Engine V2, versiones, lockfile ni `vite.config.ts` durante esta tarea.
