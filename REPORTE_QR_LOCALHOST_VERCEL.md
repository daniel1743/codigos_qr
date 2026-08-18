# Reporte: QR apuntando a localhost en Vercel

Fecha: 2026-08-17

## Problema reportado

El codigo QR generado por la aplicacion seguia apuntando a `localhost`, por ejemplo `http://localhost:3000/...`, aun cuando la aplicacion ya estaba desplegada en Vercel.

Esto causa error al escanear desde un telefono, porque `localhost` en el telefono significa "el propio telefono", no el computador ni Vercel.

## Hallazgos

### 1. Variable de entorno local con localhost

En `.env.local` existe:

```env
VITE_APP_URL=http://localhost:3000
```

Esto es aceptable solo para desarrollo local, pero no debe usarse como URL publica de un QR que sera escaneado desde otros dispositivos.

### 2. Plantilla publica tambien tenia localhost

Antes, `.env.example` tenia:

```env
VITE_APP_URL=http://localhost:3000
```

Esto podia inducir a configurar la misma variable en Vercel con `localhost`, lo que dejaria la aplicacion generando URLs publicas incorrectas.

Se cambio a:

```env
VITE_APP_URL=https://tu-dominio.vercel.app
```

### 3. La funcion de URL publica depende de `VITE_APP_URL`

La funcion esta en:

```text
src/lib/url.ts
```

Su responsabilidad es generar la URL publica del perfil:

```text
/p/{slug}
```

Ejemplo esperado en produccion:

```text
https://codigos-qr.vercel.app/p/mi-slug
```

### 4. Riesgo con SSR/hidratacion

La app usa TanStack Start/Vite y puede renderizar parte del componente en servidor.

Si el QR se genera durante el primer render usando `VITE_APP_URL=http://localhost:3000`, el canvas del QR puede quedar creado con localhost antes de que el navegador corrija la URL.

Por eso no basta con que `getPublicProfileUrl()` tenga fallback a `window.location.origin`; tambien hay que evitar que el QR se pinte prematuramente con la URL incorrecta.

## Cambios realizados

### 1. `src/lib/url.ts`

Se ajusto `getPublicProfileUrl(slug)` para que, cuando este en navegador, use la URL real de la ventana:

```ts
let appUrl = env.appUrl;

if (typeof window !== "undefined") {
  appUrl = window.location.origin;
}
```

Esto hace que si la app esta abierta en Vercel, use automaticamente:

```text
https://<dominio-vercel>
```

en vez de `localhost`.

### 2. `src/components/editor/ShareSection.tsx`

Se cambio la generacion de `publicUrl` para ejecutarse despues de montar en cliente:

```ts
const [publicUrl, setPublicUrl] = useState("");

useEffect(() => {
  setPublicUrl(slug ? getPublicProfileUrl(slug) : "");
}, [slug]);
```

Y el QR ahora solo se renderiza si `publicUrl` ya existe:

```tsx
{published && slug && publicUrl && (
  <QRCodeCanvas value={publicUrl} />
)}
```

Objetivo: impedir que el canvas del QR nazca con `localhost` durante el render inicial.

### 3. `.env.example`

Se reemplazo el ejemplo de localhost por un dominio Vercel generico:

```env
VITE_APP_URL=https://tu-dominio.vercel.app
```

### 4. `.gitignore`

Se agrego:

```gitignore
.vercel
```

Esto evita subir metadata local de Vercel al repositorio.

## Validacion realizada

Se ejecuto:

```bash
npm run build
```

Resultado: build exitoso.

Tambien se hizo commit y push a GitHub:

```text
0172d4b corrige URL publica del QR
```

## Punto pendiente importante en Vercel

Revisar en Vercel:

```text
Project Settings > Environment Variables
```

Buscar:

```env
VITE_APP_URL
```

Si existe con este valor:

```env
http://localhost:3000
```

debe cambiarse por el dominio real de Vercel, por ejemplo:

```env
https://codigos-qr.vercel.app
```

o eliminarse si se decide confiar siempre en `window.location.origin` en el cliente.

Despues de cambiar una variable en Vercel hay que redeployar, porque las variables `VITE_*` quedan embebidas en el build.

## Recomendacion tecnica

La solucion aplicada es defensiva y correcta para el QR mostrado en el navegador:

- En produccion usa `window.location.origin`.
- Evita renderizar el QR hasta estar en cliente.
- Reduce el riesgo de que un build mal configurado con `localhost` genere un QR incorrecto.

Aun asi, conviene corregir tambien la variable en Vercel porque otros lugares del codigo podrian seguir usando `env.appUrl` directamente en servidor o en funciones futuras.

## Como probar

1. Confirmar que Vercel ya redeployo el commit `0172d4b`.
2. Abrir la app desde el dominio real de Vercel.
3. Publicar o actualizar el perfil.
4. Descargar/generar un QR nuevo.
5. Escanearlo con el telefono.
6. Confirmar que abre una URL como:

```text
https://codigos-qr.vercel.app/p/{slug}
```

No sirve probar con QRs descargados antes del cambio, porque esos PNG pueden tener `localhost` ya codificado.

