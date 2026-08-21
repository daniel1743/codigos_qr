# Plan de Simplificación UX del Editor QR

## AUDITORÍA COMPLETA - ESTADO ACTUAL

### Arquitectura actual del editor (editor.tsx)

**Tabs principales:**
1. **"profile"** → ProfileSection
2. **"links"** → LinksSection  
3. **"design"** → DesignSection
4. **"text"** → TextSection
5. **"elements"** → ElementsSection
6. **"qr"** → ShareSection (publicar + personalizar QR)

**Problema identificado:** Las opciones están distribuidas sin jerarquía clara y muchos controles compiten por atención simultáneamente.

---

### INVENTARIO DETALLADO POR SECCIÓN

#### 1. ProfileSection (Datos/Perfil)
**Contenido actual:**
- Avatar upload
- Nombre para mostrar
- Biografía (con toolbar de negrita)
- Enlace personalizado (slug)
- Pie de página (toggle + texto)

**Evaluación:** ✅ Sección bien organizada, no necesita cambios mayores. Solo renombrar tab.

---

#### 2. LinksSection (Enlaces)
**Contenido actual:**
- Lista de enlaces (accordion con preview)
- Agregar enlace (botón)
- Por cada enlace (dentro del accordion):
  - Plataforma (selector con búsqueda)
  - Título/Etiqueta
  - Descripción (para premium)
  - URL de destino
  - **Imagen premium de la red:**
    - Logo de la red
    - Usar mi avatar
    - Subir foto personalizada
  - Activar/desactivar
  - Ordenar (arriba/abajo)
  - Eliminar

**Evaluación:** ✅ Buen uso de accordion contextual. Los controles aparecen solo cuando expandes un enlace. Mantener estructura.

---

#### 3. DesignSection (Diseño)
**Contenido actual (MUY EXTENSO):**

##### a) Template Picker (TemplatePicker component)
- Selector de plantillas prediseñadas

##### b) Social Covers & Hero Social (Premium)
- Toggle: Activar Social Covers
- Alto premium (slider 48-88px)
- Modelos premium (12 estilos diferentes):
  - badge_left, split_capsule, ribbon_label, avatar_capsule
  - solid_subscribe, raised_gloss, heart_badge, angled_tab
  - leaf_outline, metal_coin, neon_lumen, glass_orbit
- Botón "Imagen por enlace" → envía a LinksSection
- Hero Social: selector de enlace destacado

##### c) Portada y Avatar
- Imagen de portada (upload + preview)
- Forma del avatar (circle/rounded/none)
- Aro del avatar:
  - Activar/desactivar
  - Color del aro (6 presets + picker)
  - Grosor (thin/medium)

##### d) Fondo
- Tabs: Sólido vs Degradado
- **Sólido:**
  - 6 colores rápidos
  - Color picker
- **Degradado:**
  - Color 1 + Color 2
  - Tipo (lineal/radial)
  - Dirección (6 opciones)
  - Galería de 6 presets sugeridos

##### e) Botones
- Color de botón (6 presets + picker)
- Texto del botón (3 presets + picker)
- Alerta de contraste (si aplica)
- Forma del botón (recto/curvo/píldora)
- Separación entre botones (compact/standard/generous)
- Estilo de enlaces (12 variantes):
  - solid, outline, soft, pill, minimal, line, card
  - 5 estilos premium: image_right, image_left, detail_arrow, classic_card, minimal_badge

**Evaluación:** ⚠️ **SOBRECARGA CRÍTICA**. Demasiadas opciones abiertas simultáneamente. Necesita revelación progresiva urgente.

---

#### 4. TextSection (Texto)
**Contenido actual:**

##### a) Fuente principal (SectionGroup collapsible)
- Preview de fuente activa
- Búsqueda
- Categorías (7): Todas, Neutra, Geométrica, Amigable, Elegante, Impacto, Manuscrita
- Listado de 39 fuentes con preview

##### b) Nombre (SectionGroup collapsible)
- Color: Automático vs Personalizado
- Si personalizado: picker + alerta de contraste
- Tamaño (S/M/L/XL)
- Peso (light/normal/semibold/bold)
- Alineación (left/center/right)

##### c) Descripción (SectionGroup collapsible)
- Color: Automático vs Personalizado
- Si personalizado: picker + alerta de contraste
- Tamaño (S/M/L)
- Peso (light/normal/semibold)
- Alineación

##### d) Botones (SectionGroup collapsible)
- Tamaño de texto (pequeño/medio/grande)
- Peso (normal/semibold/bold)
- Alineación del contenido
- Posición del icono (left/right)

**Evaluación:** ✅ Ya usa collapsibles (SectionGroup). Bien organizado pero se puede mejorar la jerarquía.

---

#### 5. ElementsSection (Elementos decorativos)
**Contenido actual:**
- Formas de fondo (5 opciones: none, circles, squares, lines, mixed)
- Ambiente (4 opciones: plano, cinemático, aura, shadow)
- Intensidad (subtle/medium/strong)
- Botón "Limpiar elementos"

**Evaluación:** ✅ Sección pequeña y bien delimitada. Mantener.

---

#### 6. ShareSection (QR)
**Contenido actual (MUY EXTENSO):**

##### a) Estado y publicación
- Badge de estado (publicado/sin publicar)
- Alerta si no está publicado
- Guardar borrador
- Publicar ahora
- Validación de requisitos

##### b) Estadísticas
- Card de aperturas/visitas

##### c) Vista previa del QR
- QR renderizado (advanced/svg/canvas según opciones)
- Regenerar patrón
- Copiar enlace
- Abrir página

##### d) Diseños QR (Galería)
- Botón para abrir galería de plantillas QR

##### e) Personalizar QR
- Patrón principal (color picker)
- Fondo seguro (color picker)
- Presets: "Seguro" y "3 esquinas"
- Alerta de contraste

##### f) Forma del QR
- 4 estilos de puntos (clásico/suave/puntos/sello)
- Forma de los 3 cuadros (select)

##### g) Colores de esquinas
- 4 pickers independientes:
  - Arriba izquierda
  - Arriba derecha
  - Abajo izquierda
  - Centro de cuadros

##### h) Marco visual
- 5 opciones de frame (simple/sello/etiqueta/celular/bebida)

##### i) Efectos Premium
- 6 presets: clásico, neón pink, neón cyan, sunset, galaxy, emerald

##### j) Logo Central
- Toggle activar/desactivar
- Preview del logo
- Subir logo
- Eliminar logo

##### k) Exportar
- Formato (PNG/SVG)
- Resolución (5 opciones)
- Restaurar QR clásico
- Descargar

##### l) Historial de versiones visuales
- Galería horizontal con miniaturas
- Botón "Usar esta apariencia"

**Evaluación:** ⚠️ **SOBRECARGA EXTREMA**. Necesita reorganización completa con revelación progresiva.

---

## ESTRATEGIA DE REORGANIZACIÓN APROBADA

### Nueva estructura de tabs (4 categorías principales)

```
1. PERFIL
   - Avatar
   - Nombre
   - Biografía
   - Enlace personalizado
   - Pie de página

2. ENLACES
   - Lista de enlaces (accordion contextual)
   - [Al expandir]: configuración específica del enlace

3. APARIENCIA
   ├── Plantilla (presets primero)
   ├── Fondo
   ├── Botones
   ├── Tipografía
   └── Decoración

4. QR
   ├── Publicar
   ├── Compartir
   └── Personalizar QR
```

---

## PLAN DE IMPLEMENTACIÓN DETALLADO

### FASE P0 - ALTO IMPACTO INMEDIATO

#### Tarea 1: Renombrar tabs principales
**Archivo:** `src/routes/editor.tsx`

**Cambios:**
```typescript
// ANTES:
const TABS = [
  { id: "profile", label: "Datos", icon: UserCircle },
  { id: "links", label: "Enlaces", icon: LinkIcon },
  { id: "design", label: "Diseño", icon: Palette },
  { id: "text", label: "Texto", icon: Type },
  { id: "elements", label: "Elementos", icon: Shapes },
  { id: "qr", label: "QR", icon: QrCode },
]

// DESPUÉS:
const TABS = [
  { id: "profile", label: "Perfil", icon: UserCircle },
  { id: "links", label: "Enlaces", icon: LinkIcon },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "qr", label: "QR", icon: QrCode },
]
```

**TypeScript:**
```typescript
type TabId = "profile" | "links" | "appearance" | "qr";
```

---

#### Tarea 2: Crear AppearanceSection unificada
**Nuevo archivo:** `src/components/editor/AppearanceSection.tsx`

**Estructura:**
```tsx
export function AppearanceSection({ profile, onChange, userId, links, onManageLinkImages }) {
  return (
    <div className="space-y-6">
      <Header />
      
      {/* 1. PLANTILLAS PRIMERO */}
      <TemplatePicker profile={profile} onChange={onChange} />
      
      {/* 2. PERSONALIZACIÓN MANUAL (Collapsible) */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger>
          <Wand2 /> Personalizar manualmente
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Subsecciones colapsables */}
          <FondoSection />
          <BotonesSection />
          <TipografiaSection />
          <DecoracionSection />
          <SocialCoversSection />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

**Subsecciones internas (todas collapsibles por defecto):**

1. **FondoSection** (extraído de DesignSection líneas 631-766)
   - Sólido/Degradado tabs
   - Colores rápidos
   - Personalización avanzada

2. **BotonesSection** (extraído de DesignSection líneas 768-997)
   - Colores (patrón + texto)
   - Alerta de contraste
   - Forma del botón
   - Separación
   - Estilos de enlace (grid de 12 opciones)

3. **TipografiaSection** (extraído completo de TextSection)
   - Fuente principal (con búsqueda + categorías)
   - Nombre (collapsible)
   - Descripción (collapsible)
   - Botones (collapsible)

4. **DecoracionSection** (extraído completo de ElementsSection)
   - Formas de fondo
   - Ambiente
   - Intensidad
   - Limpiar

5. **SocialCoversSection** (extraído de DesignSection líneas 291-477)
   - Toggle Social Covers
   - Alto premium
   - Modelos premium (grid compacto)
   - Hero Social

6. **PortadaAvatarSection** (extraído de DesignSection líneas 479-629)
   - Portada (upload)
   - Forma del avatar
   - Aro del avatar

---

#### Tarea 3: Reorganizar ShareSection (QR)
**Archivo:** `src/components/editor/ShareSection.tsx`

**Nueva estructura con collapsibles:**

```tsx
export function ShareSection({ ... }) {
  return (
    <div className="space-y-5">
      {/* GRUPO 1: PUBLICACIÓN */}
      <PublicarCard>
        - Estado (badge)
        - Guardar borrador
        - Publicar ahora
        - Validación
      </PublicarCard>
      
      {/* GRUPO 2: COMPARTIR */}
      {published && (
        <>
          <EstadisticasCard />
          
          <QRPreviewCard>
            - Vista previa QR
            - Regenerar patrón
            - Copiar enlace
            - Abrir página
          </QRPreviewCard>
          
          {/* GRUPO 3: PERSONALIZAR (Collapsibles) */}
          <Collapsible>
            <CollapsibleTrigger>
              <Layers /> Diseños QR (Plantillas)
            </CollapsibleTrigger>
            <CollapsibleContent>
              <GaleriaButton />
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible>
            <CollapsibleTrigger>
              <Palette /> Colores del QR
            </CollapsibleTrigger>
            <CollapsibleContent>
              - Patrón principal
              - Fondo
              - Presets
              - Alerta contraste
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible>
            <CollapsibleTrigger>
              <Circle /> Forma y esquinas
            </CollapsibleTrigger>
            <CollapsibleContent>
              - Forma del QR
              - Forma de cuadros
              - Colores de esquinas (4 pickers)
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible>
            <CollapsibleTrigger>
              <Sparkles /> Efectos Premium
            </CollapsibleTrigger>
            <CollapsibleContent>
              - Grid de 6 efectos
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible>
            <CollapsibleTrigger>
              <Square /> Marco visual
            </CollapsibleTrigger>
            <CollapsibleContent>
              - Grid de 5 frames
            </CollapsibleContent>
          </Collapsible>
          
          <Collapsible>
            <CollapsibleTrigger>
              <ImageIcon /> Logo central
            </CollapsibleTrigger>
            <CollapsibleContent>
              - Toggle + upload + preview
            </CollapsibleContent>
          </Collapsible>
          
          <ExportarCard>
            - Formato
            - Resolución
            - Restaurar clásico
            - Descargar
          </ExportarCard>
          
          <HistorialVersiones />
        </>
      )}
    </div>
  )
}
```

---

#### Tarea 4: Actualizar renderActiveSection en editor.tsx
**Archivo:** `src/routes/editor.tsx` (líneas 438-489)

```typescript
const renderActiveSection = () => {
  switch (activeTab) {
    case "profile":
      return (
        <ProfileSection
          profile={profile}
          onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
          userId={session.user.id}
        />
      );
    case "links":
      return <LinksSection links={links} onChange={setLinks} userId={session.user.id} />;
    case "appearance":
      return (
        <AppearanceSection
          profile={profile}
          onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
          userId={session.user.id}
          links={links}
          onManageLinkImages={() => {
            setActiveTab("links");
            setPanelOpen(true);
          }}
        />
      );
    case "qr":
      return (
        <ShareSection
          publicId={savedPublicId || ""}
          published={isPublished}
          saving={saving}
          onSave={handleSave}
          isValid={validate()}
          profile={profile}
          onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
        />
      );
    default:
      return null;
  }
};
```

---

### FASE P1 - MUY RECOMENDABLE

#### Tarea 5: Mejorar tooltips contextuales
**Archivos afectados:** Todos los componentes de secciones

**Agregar tooltips en:**
- Imagen del enlace: "Puedes usar el logo de la red, tu avatar principal o una foto diferente."
- Preset: "Aplica una combinación lista de colores, fuente y botones."
- Fondo: "Cambia el fondo de tu página pública."
- Publicar: "Guarda los cambios y actualiza tu página pública."

**Componente a usar:**
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip"
```

---

#### Tarea 6: Estados vacíos educativos
**Archivo:** `src/components/editor/LinksSection.tsx` (línea 456)

**Ya existe, mejorar:**
```tsx
{links.length === 0 && (
  <div className="...">
    <LinkIcon />
    <p>Agrega tu primer enlace</p>
    <p className="text-xs">
      Conecta WhatsApp, Instagram, TikTok, tu web y otras redes.
    </p>
    <Button onClick={handleAddLink}>
      <Plus /> Agregar enlace
    </Button>
  </div>
)}
```

---

#### Tarea 7: Galería visual organizada para estilos premium
**Archivo:** `src/components/editor/AppearanceSection.tsx` (subsección BotonesSection)

**Mejorar grid de estilos:**
```tsx
{/* Agrupar por categoría */}
<div className="space-y-4">
  <Label className="text-xs text-muted-foreground">Básicos</Label>
  <div className="grid grid-cols-3 gap-2">
    {basicStyles.map(...)}
  </div>
  
  <Label className="text-xs text-muted-foreground flex items-center gap-2">
    <Crown className="w-3 h-3 text-amber-500" />
    Premium
  </Label>
  <div className="grid grid-cols-2 gap-2">
    {premiumStyles.map(...)}
  </div>
</div>
```

---

### FASE P2 - DESPUÉS

#### Tarea 8: Busqueda de fuentes mejorada
**Ya existe** en TextSection (líneas 208-217). Mantener.

#### Tarea 9: Onboarding de 3-4 pasos (FUTURO)
No implementar ahora. Dejar documentado para futuras mejoras.

#### Tarea 10: Modo Básico vs Avanzado (FUTURO)
No implementar ahora. La revelación progresiva con collapsibles cumple el mismo objetivo.

---

## CRITERIOS DE ÉXITO

Un usuario nuevo debe poder responder:

✅ **¿Dónde cambio mi foto?** → Perfil
✅ **¿Dónde agrego Instagram?** → Enlaces
✅ **¿Dónde cambio la foto de Instagram?** → Enlaces > Expandir Instagram
✅ **¿Dónde cambio el fondo?** → Apariencia > Fondo
✅ **¿Dónde cambio la fuente?** → Apariencia > Personalizar > Tipografía
✅ **¿Dónde elijo un diseño listo?** → Apariencia > Plantillas (arriba)
✅ **¿Dónde edito mi QR?** → QR
✅ **¿Qué estoy modificando ahora?** → El título del panel lo indica
✅ **¿Dónde veo el resultado?** → Preview siempre visible a la derecha

---

## ORDEN DE IMPLEMENTACIÓN

### Sprint 1 (P0 Crítico)
1. ✅ Crear `AppearanceSection.tsx` con estructura base
2. ✅ Extraer subsecciones de DesignSection/TextSection/ElementsSection
3. ✅ Reorganizar ShareSection con collapsibles
4. ✅ Actualizar tabs en `editor.tsx`
5. ✅ Actualizar `renderActiveSection`
6. ✅ Eliminar imports de TextSection y ElementsSection obsoletos
7. ✅ Testing manual: Desktop y Mobile

### Sprint 2 (P1 Mejoras)
8. ✅ Tooltips contextuales
9. ✅ Estados vacíos mejorados
10. ✅ Galería de estilos agrupada

---

## ARCHIVOS A MODIFICAR

### Modificar:
1. ✅ `src/routes/editor.tsx` - Tabs y routing
2. ✅ `src/components/editor/ShareSection.tsx` - Reorganizar con collapsibles
3. ⚠️ `src/components/editor/DesignSection.tsx` - Extraer y eliminar (deprecated)
4. ⚠️ `src/components/editor/TextSection.tsx` - Mover a subsección (deprecated)
5. ⚠️ `src/components/editor/ElementsSection.tsx` - Mover a subsección (deprecated)

### Crear nuevos:
6. ✅ `src/components/editor/AppearanceSection.tsx` - Componente principal unificado

### Mantener sin cambios:
7. ✅ `src/components/editor/ProfileSection.tsx` - OK
8. ✅ `src/components/editor/LinksSection.tsx` - OK
9. ✅ `src/components/editor/TemplatePicker.tsx` - Reutilizar tal cual

---

## REGLAS DE IMPLEMENTACIÓN

### ✅ PERMITIDO:
- Reorganizar componentes existentes
- Crear nuevos componentes para mejorar jerarquía
- Usar Collapsible/Accordion de shadcn/ui
- Renombrar tabs
- Agrupar opciones relacionadas
- Agregar tooltips informativos

### ❌ NO PERMITIDO:
- Eliminar funcionalidades existentes
- Modificar QR rendering
- Modificar auth
- Modificar slug generation
- Modificar analytics
- Cambiar base de datos sin necesidad
- Inventar funciones nuevas
- Cambiar branding global
- Reconstruir componentes no relacionados

---

## NOTAS TÉCNICAS

### Dependencias necesarias:
```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { ChevronDown, Wand2 } from "lucide-react"
```

### Pattern de Collapsible a usar:
```tsx
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors border rounded-xl">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" />
      <span className="font-semibold text-sm">Título</span>
    </div>
    <ChevronDown className="w-4 h-4 transition-transform ui-open:rotate-180" />
  </CollapsibleTrigger>
  <CollapsibleContent className="p-4 space-y-4">
    {/* Contenido */}
  </CollapsibleContent>
</Collapsible>
```

---

## TESTING MANUAL REQUERIDO

### Desktop (md+):
- [ ] Preview visible mientras edito
- [ ] Panel colapsa y expande correctamente
- [ ] Tabs funcionan correctamente
- [ ] Collapsibles abren/cierran suavemente
- [ ] No hay scroll horizontal
- [ ] Todos los controles accesibles

### Mobile (<md):
- [ ] Bottom sheet funciona
- [ ] Tabs en bottom nav
- [ ] Collapsibles funcionan en móvil
- [ ] Preview escalable con zoom
- [ ] No hay elementos cortados

### Funcional:
- [ ] Guardar borrador funciona
- [ ] Publicar funciona
- [ ] Preview actualiza en vivo
- [ ] Presets de plantillas funcionan
- [ ] Upload de imágenes funciona
- [ ] Validación de URL funciona
- [ ] Descargar QR funciona

---

## DOCUMENTACIÓN FINAL

Al completar, crear:
- `docs/arreglos-ui/20_SIMPLIFICACION_IMPLEMENTADA.md`

Debe contener:
- Estructura anterior del panel
- Estructura nueva
- Componentes modificados
- Opciones movidas y destino
- Opciones que permanecieron intactas
- Comportamiento desktop vs mobile
- Build/typecheck/lint results
- Pendientes encontrados pero NO modificados

---

**FIN DEL PLAN**
