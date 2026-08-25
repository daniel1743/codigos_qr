# Análisis de Arquitectura del Editor - PASS A

## Fecha: 2026-08-24
## Estado: En proceso de auditoría

## Archivos Inspeccionados

### 1. Ruta React
- **Archivo**: `src/routes/template-builder.tsx`
- **Función**: Wrapper que carga el editor HTML en un iframe
- **Líneas**: 24 líneas
- **Observación**: Es solo un contenedor iframe, no contiene lógica del editor

### 2. Editor Principal
- **Archivo**: `public/template-builder.html`
- **Líneas**: 2,229 líneas
- **Tipo**: Aplicación standalone HTML/CSS/JavaScript
- **Observación**: Editor completo autocontenido con toda la lógica

## Arquitectura Encontrada

### Modelo de Estado Central

```javascript
appState = {
    schemaVersion: 1,
    identity: {
        logoText: string,
        subtitleText: string,
        titleText: string,
        profileImg: string,
        bannerImg: string
    },
    socials: {
        enabled: boolean,
        displayMode: string,
        items: Array<{id, platform, label, url, iconId, enabled}>
    },
    content: {
        footerText: string
    },
    links: Array<{id, text, icon, url, fullWidth}>,
    appearance: {
        bgImage: string,
        bgOverlay: number,
        bgStart: string,
        bgMid: string,
        bgEnd: string,
        bgAngle: number,
        btnBgStart: string,
        btnBgEnd: string,
        btnBorderColor: string,
        accentBgStart: string,
        accentBgEnd: string,
        accentIconColor: string,
        btnTextColor: string,
        fontLogo: string,
        fontHeading: string,
        fontSubtitle: string,
        fontBody: string,
        themeId: string,
        btnPresetId: string,
        textPrimary: string,
        textSubtitle: string,
        profileBorderColor: string,
        profileRadius: string,
        btnRadius: string,
        banner: {
            enabled: boolean,
            heightPreset: string,
            positionY: number,
            imageOpacity: number,
            fusionPreset: string,
            fusionStrength: number
        }
    },
    layout: {
        gridCols: number,
        profileBorder: number,
        profileSize: number,
        logoSize: number,
        titleSize: number,
        devicePreview: string
    }
}
```

## Funciones Core del Config

### 1. `DEFAULT_TEMPLATE_CONFIG` (líneas 1112-1178)
- ✅ Existe configuración canónica por defecto
- ✅ Incluye `schemaVersion: 1`
- ✅ Estructura completa y bien definida

### 2. `validateTemplateConfig(config)` (líneas 1183-1195)
- ✅ Existe validador
- ✅ Verifica schemaVersion
- ✅ Valida que links sea array
- ✅ Verifica IDs únicos en links
- ✅ Valida tipos de datos (gridCols como número)
- ⚠️  No valida todos los campos profundamente

### 3. `normalizeTemplateConfig(config)` (líneas 1197-1225)
- ✅ Existe normalizador
- ✅ Hace merge profundo con defaults
- ✅ Maneja arrays correctamente
- ✅ Genera IDs si faltan en links
- ✅ Maneja legacy btnPresetId
- ⚠️  Línea 1233: BUG - referencia a `target` sin definir (debería ser `def`)

### 4. `getTemplateConfig()` (líneas 1227-1229)
- ✅ Existe función de exportación
- ✅ Retorna deep clone de appState
- ✅ Evita referencias mutables

### 5. `loadTemplateConfig(config)` (líneas 1231-1253)
- ✅ Existe función de importación
- ✅ Valida config antes de cargar
- ✅ Normaliza config
- ✅ Sincroniza controles UI
- ✅ Aplica CSS
- ✅ Renderiza canvas
- ✅ Renderiza lista de controles
- ✅ Restaura vista de dispositivo
- ⚠️  Líneas 1232-1239: Código suelto antes de validation (socials normalization)

## Sistema de Imágenes (S3)

### Optimización de Imágenes (líneas 977-1091)
- ✅ Cliente-side resize
- ✅ Conversión a WebP
- ✅ Calidad configurable (0.85)
- ✅ Dimensiones máximas por slot (profile: 1200px, otros: 1920px)
- ✅ Blob URL lifecycle management
- ✅ Revoke de URLs al remover/reemplazar
- ✅ **NO serializa File/Blob al config** ✅✅✅

### Slots de Imágenes
1. **profile**: Avatar del usuario
2. **banner**: Banner superior con fusión
3. **background**: Fondo general

### Gestión de ObjectURLs
- ✅ `window.activeObjectUrls = {}` - Tracking de URLs activas
- ✅ `revokeObjectUrl(slot)` - Limpieza de URLs
- ✅ Las Blob URLs no se serializan en config

## Sistema de Banner (S4)

### Configuración de Banner (líneas 1161-1168 en DEFAULT_CONFIG)
```javascript
banner: {
    enabled: true,
    heightPreset: 'medium',  // 'compact' | 'medium' | 'large'
    positionY: 50,           // 0-100
    imageOpacity: 100,       // 30-100
    fusionPreset: 'soft',    // 'none' | 'soft' | 'medium' | 'deep'
    fusionStrength: 60       // 0-100
}
```

### Funciones de Banner
- ✅ `setBannerHeight(preset)` (línea 1695)
- ✅ `setBannerFusion(preset)` (línea 1701)
- ✅ `updateBannerSettings()` (línea 1674)
- ✅ `syncBannerButtons()` (línea 1707)

### Aplicación CSS (líneas 1309-1340)
- ✅ `--banner-pos-y`: Posición vertical de imagen
- ✅ `--banner-opacity`: Intensidad de imagen
- ✅ `--banner-height`: Altura del banner (180px/250px/350px)
- ✅ `--banner-mask`: Gradiente de fusión con fondo

## Temas Premium (S5)

### PREMIUM_THEMES (líneas 1589-1600)
- ✅ 10 temas predefinidos
- ✅ IDs: black-gold, black-silver, platinum, rose-gold, emerald-luxury, executive-blue, burgundy-elegant, ivory-gold, graphite, premium-white
- ✅ Cada tema incluye configuración completa de appearance
- ✅ Cada tema incluye configuración de banner

### Funciones de Temas
- ✅ `renderThemeSelector()` (línea 1639)
- ✅ `applyTheme(themeId)` (línea 1656)
- ✅ Deep merge de theme.appearance sobre appState.appearance
- ✅ Almacena `themeId` en config
- ✅ Al modificar manualmente, cambia a `themeId: 'custom'`

## Presets de Botones (S6)

### BUTTON_PRESETS (líneas 1606-1614)
- ✅ 7 presets: solid, glass, outline, soft, premium, minimal, legacy
- ✅ Cada preset define:
  - bgStartOpacity, bgEndOpacity
  - borderOpacity, borderWidth
  - shadow, backdropFilter
  - hoverTransform, hoverShadow

### Funciones de Presets
- ✅ `renderButtonPresetSelector()` (línea 1616)
- ✅ `applyButtonPreset(presetId)` (línea 1633)
- ✅ Preset 'legacy' oculto (para backward compatibility)
- ✅ Se almacena `btnPresetId` en config

### Aplicación CSS (líneas 1284-1292)
- ✅ Busca preset por ID
- ✅ Aplica opacidades a colores base usando `hexToRgba()`
- ✅ Variables CSS dinámicas

## Sistema de Redes Sociales (S8)

### SOCIAL_PLATFORMS (líneas 1455-1467)
- ✅ Registry de 10 plataformas
- ✅ Cada plataforma: id, label, placeholder, icon
- ✅ Plataformas: instagram, facebook, tiktok, youtube, linkedin, twitter, whatsapp, telegram, email, website

### Configuración en appState (líneas 1121-1125)
```javascript
socials: {
    enabled: true,
    displayMode: 'icons',
    items: []
}
```

### Funciones Sociales
- ✅ `addSocial(platformId)` (línea 1469)
- ✅ `removeSocial(id)` (línea 1485)
- ✅ `toggleSocial(id)` (línea 1491)
- ✅ `updateSocialUrl(id, url)` (línea 1500)
- ✅ `normalizeUrl(url, platformId)` (línea 1508) - Sanitización
- ✅ `renderSocialsEditor()` (línea 1521)

### Estructura de Social Item
```javascript
{
    id: 'social_' + random,
    platform: platformId,
    label: string,
    url: string,
    iconId: platform.id,
    enabled: boolean
}
```

## Renderer

### `renderCanvas()` (líneas 1942-1996)
- ✅ Renderiza logo, subtitle, title, profile, footer
- ✅ Renderiza social icons (legacy usando campos directos del estado)
- ✅ Renderiza botones dinámicos desde `appState.links`
- ✅ Aplica fullWidth correctamente
- ✅ Respeta `layout.gridCols`
- ⚠️  Social icons usa legacy: busca `appState.socials.ig/tk/yt/li` en lugar de `appState.socials.items`

### `applyStateToCSS()` (líneas 1269-1346)
- ✅ Sincroniza todas las variables CSS desde appState
- ✅ Maneja banner CSS
- ✅ Maneja temas
- ✅ Maneja button presets con opacidades
- ✅ Determinístico: mismo estado → mismo CSS

## Gestión de Botones

### Funciones (líneas 1806-1840)
- ✅ `addButton()` - Genera ID único con timestamp + random
- ✅ `removeButton(id)` - Elimina por ID
- ✅ `toggleFullWidth(id)` - Toggle de ancho completo
- ✅ `updateButtonData(id, key, val)` - Actualización genérica
- ✅ IDs estables después de generación

### Drag & Drop (líneas 1789-1803)
- ✅ SortableJS para reordenar
- ✅ `setupSortable()` reordena array en `appState.links`
- ✅ Orden persiste en config
- ✅ Re-renderiza después de reordenar

## Hallazgos Críticos

### ✅ FORTALEZAS
1. **Config centralizado**: appState bien estructurado
2. **Validación existe**: validateTemplateConfig funcional
3. **Normalización existe**: normalizeTemplateConfig con merge profundo
4. **Serialización limpia**: getTemplateConfig retorna clone sin referencias
5. **No serializa objetos no-serializables**: Imágenes usan URLs, no File/Blob
6. **IDs estables**: Generados y persistidos
7. **Temas y Presets**: Sistema robusto con metadata
8. **Renderer determinístico**: Consume estado, no depende de UI oculta

### ⚠️ DEFECTOS BLOQUEANTES

#### 1. **BUG en normalizeTemplateConfig (línea 1233)**
```javascript
// LINEA 1232-1239 - CODIGO SUELTO ANTES DE VALIDATION
if (!target.socials || !target.socials.items) {
    target.socials = {
        enabled: true,
        displayMode: 'icons',
        items: []
    };
}
```
**Problema**: `target` no está definido en este contexto. Debería ser `def`.
**Impacto**: Crash al cargar config sin socials.

#### 2. **Social Icons Renderer Legacy (líneas 1956-1968)**
```javascript
socialMap.forEach(s => {
    if(appState.socials[s.id]) {  // ❌ Busca appState.socials.ig directamente
        hasSocials = true;
        socialContainer.innerHTML += `<a href="${appState.socials[s.id]}"...`;
    }
});
```
**Problema**: Usa estructura legacy en lugar de `appState.socials.items[]`
**Impacto**: Socials no se renderizan desde config válido.

#### 3. **Falta Social Editor UI en Content Tab**
**Problema**: No hay `<div id="socials-list"></div>` en el HTML
**Impacto**: `renderSocialsEditor()` no tiene contenedor donde renderizar.

### ⚠️ ADVERTENCIAS NO BLOQUEANTES

1. **IconId no estandarizado**: Los botones usan clases de FontAwesome directamente, no IDs abstractos
2. **Font values inconsistentes**: Algunos usan font-family completa, otros solo nombre
3. **Validación superficial**: No valida profundamente todos los campos

## Próximos Pasos

1. ✅ Parchar defectos bloqueantes
2. ✅ Crear fixtures de prueba (1-5 botones)
3. ✅ Ejecutar round-trip tests
4. ✅ Ejecutar QA con Playwright
5. ✅ Generar matriz de readiness
6. ✅ Producir reporte final
