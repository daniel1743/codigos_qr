# Power Editor — Motor de composición jerárquica V6

**Fase:** 0 — contrato técnico corregido y auditoría de solo lectura
**Estado:** revisado; la autorización autónoma posterior habilita los incrementos definidos en el worktree aislado.
**Repositorio y worktree auditados:** `daniel1743/codigos_qr` en `/home/ubuntu/codigos_qr-power-editor-isolated`
**Rama verificada:** `chore/power-editor-isolated-copy`
**Commit base verificado:** `be1c43a2be401ee59f22e0762d2bdf159c7a2717`

## 1. Alcance y congelamientos

Este documento corrige el contrato de Fase 0 del motor de composición jerárquica. Es un entregable de diseño; no modifica código, tests existentes, artefactos, recetas, renderer, CSS, rutas, Supabase ni datos. Su objetivo es definir con precisión cómo superar la macroestructura plana actual sin alterar la semántica de los bloques existentes.

Permanecen congelados `/editor`, `/admin/template-studio`, rutas públicas, QR, `public_id`, `slug`, Supabase, migraciones, persistencia de borradores, publicación, generador de recetas, templates y artefactos existentes, renderer público heredado, navegación y el funcionamiento actual del Power Editor. Tampoco se hará commit, push, merge, despliegue, rebase, amend ni force push.

## 2. Diagnóstico factual de V5

El modelo actual define una `PageConfig` declarativa con `PageBlock[]` planos. Cada `PageBlock` conserva su `id`, `type`, `order`, `enabled`, `locked`, `groupId` y `props`. El editor ya dispone de 25 tipos de bloque, estilos avanzados y overrides de bloque para móvil, tablet y desktop.

El canvas, sin embargo, renderiza banner en un flujo separado y todos los demás bloques como hermanos dentro de `.ep-template-content`, ordenados por `PageBlock.order`. `composition.columns` sólo afecta a internals de algunos bloques —por ejemplo, enlaces, cards y galerías—; no expresa regiones de página, filas entre bloques, grids de documento ni relaciones padre/hijo.

> **Conclusión:** V5 tiene alta riqueza visual de bloque, pero mantiene una macroestructura predominantemente vertical. V6 debe aportar estructura y posicionamiento sin duplicar `PageBlock.props` ni reescribir los renderers de contenido existentes.

## 3. Principios de diseño V6

La fuente de verdad de contenido seguirá siendo `blocks`. El árbol `composition` será una segunda estructura, dedicada únicamente a ubicar referencias únicas hacia `PageBlock.id`. Un nodo estructural nunca contendrá copias de `props`, URLs, textos, enlaces ni datos de negocio de un bloque.

La hidratación será la única puerta de entrada. Debe aceptar formatos V5 o V6, clonar la entrada, validar el resultado y devolver siempre un `PageConfigV6` en memoria. No podrá guardar V6 automáticamente ni transformar `page_config` remoto durante una lectura.

## 4. Contrato TypeScript V6 corregido

### 4.1 Variantes explícitas y seguras de PageConfig

No se definirá `PageConfigV6` como `PageConfig & { version: 6 }`, porque `PageConfig.version` es actualmente un número genérico y esa intersección no distingue de forma segura las versiones. En su lugar, se separan el tipo común y las dos variantes discriminadas.

```ts
export type PageConfigCommon = Omit<PageConfig, "version">;

/** Entrada legacy: cubre los JSON históricos 0–5 sin campo composition. */
export type PageConfigV5Input = PageConfigCommon & {
  version?: 0 | 1 | 2 | 3 | 4 | 5;
  composition?: never;
};

/** Forma V5 normalizada, todavía lineal y sin árbol. */
export type PageConfigV5 = PageConfigCommon & {
  version: 5;
  composition?: never;
};

/** Forma V6 normalizada. */
export type PageConfigV6 = PageConfigCommon & {
  version: 6;
  composition: CompositionRootNode;
};

export type HydratablePageConfig = PageConfigV5Input | PageConfigV6;

export function hydratePageConfig(input: HydratablePageConfig): PageConfigV6;
```

La implementación futura normalizará primero una entrada histórica a `PageConfigV5` y sólo después aplicará el adaptador V5 → V6. La entrada se clona al inicio; ningún paso podrá mutar el objeto recibido.

### 4.2 Tipos de nodos y límites centrales

```ts
export type CompositionBreakpoint = "mobile" | "tablet" | "desktop";
export type CompositionNodeKind =
  | "root"
  | "section"
  | "container"
  | "stack"
  | "row"
  | "grid"
  | "column"
  | "overlay"
  | "fixed"
  | "block";

export type Anchor =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export type PositionMode = "flow" | "anchored" | "free";
export type HeightMode = "content" | "minimum" | "viewport";
export type AutoFlow = "row" | "column" | "dense";
export type RowDirection = "row" | "row-reverse";
export type CollapseMode = "stack" | "stack-reverse" | "preserve";

export const COMPOSITION_LIMITS = {
  maxDepth: 6,
  maxNodes: 96,
  maxGridColumns: 6,
  maxGridRows: 12,
  minSplitTrack: 25,
  maxSplitTrack: 75,
  minWidth: 0,
  maxWidth: 100,
  minHeight: 0,
  maxOffsetPercent: 40,
  maxOffsetPixels: 160,
  minZIndex: 0,
  maxZIndex: 20,
} as const;
```

`maxDepth` cuenta la raíz como profundidad cero. Un árbol válido puede alcanzar seis niveles por debajo de la raíz, no más. El límite de 96 nodos incluye contenedores y referencias de bloque. Un `blockId` puede tener una sola referencia en todo el árbol.

### 4.3 Responsive: forma parcial y precedencia exacta

```ts
export type GridOverride = {
  columns?: number;
  rows?: number;
  autoFlow?: AutoFlow;
};

export type SplitOverride = {
  direction?: RowDirection;
  tracks?: readonly [number, number];
  collapse?: CollapseMode;
  minColumnWidth?: number;
  maxColumnWidth?: number;
};

export type PositionOverride = {
  positionMode?: PositionMode;
  anchor?: Anchor;
  x?: number;
  y?: number;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  width?: number;
  height?: number;
  rotation?: number;
};

export type CompositionResponsive = {
  hidden?: boolean;
  order?: number;
  columns?: number;
  gap?: number;
  direction?: RowDirection;
  collapse?: CollapseMode;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  width?: number;
  maxWidth?: number;
  minWidth?: number;
  minHeight?: number;
  position?: PositionOverride;
  grid?: GridOverride;
  split?: SplitOverride;
};

export type CompositionResponsiveMap =
  Partial<Record<CompositionBreakpoint, CompositionResponsive>>;
```

La precedencia se aplica sin borrar valores de otros dispositivos:

| Viewport activo | Resolución de valores |
|---|---|
| `mobile` | `base → mobile` |
| `tablet` | `base → mobile → tablet` |
| `desktop` | `base → mobile → tablet → desktop` |

Cada merge es profundo para `grid`, `split` y `position`. Por ejemplo, cambiar `desktop.position.x` no borra `mobile.position.anchor` ni `tablet.position.offsetY`. `hidden` define visibilidad del nodo completo; los bloques mantienen además sus overrides V5 ya existentes. Si ambos declaran ocultamiento, se respeta el ocultamiento más restrictivo.

### 4.4 Estilos estructurales, grid, split, hero, overlay y fixed

```ts
export type GridPlacement = {
  columnStart?: number;
  columnSpan?: number;
  rowStart?: number;
  rowSpan?: number;
};

export type GridLayout = {
  columns: number;
  rows?: number;
  autoFlow?: AutoFlow;
  tracks?: {
    columns?: number[];
    rows?: number[];
  };
};

export type SplitLayout = {
  direction: RowDirection;
  tracks: readonly [number, number];
  collapse: CollapseMode;
  minColumnWidth?: number;
  maxColumnWidth?: number;
};

export type Position = {
  positionMode: PositionMode;
  anchor?: Anchor;
  x?: number;
  y?: number;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  width?: number;
  height?: number;
  rotation?: number;
};

export type FixedLayout = {
  edge: "top" | "bottom";
  inset: number;
  zIndex: number;
  safeArea: boolean;
  width?: number;
  maxWidth?: number;
  reserveSpace: boolean;
};

export type CompositionStyle = {
  width?: number;
  maxWidth?: number;
  minWidth?: number;
  minHeight?: number;
  padding?: number;
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  heightMode?: HeightMode;
  viewportHeight?: number;
  minViewportHeight?: number;
  verticalAlign?: "top" | "center" | "bottom";
  overflow?: "visible" | "hidden" | "clip";
  grid?: GridLayout;
  split?: SplitLayout;
  position?: Position;
  fixed?: FixedLayout;
  placement?: GridPlacement;
  responsive?: CompositionResponsiveMap;
};

export type CompositionNodeBase = {
  id: string;
  kind: CompositionNodeKind;
  enabled: boolean;
  locked?: boolean;
  name?: string;
  style?: CompositionStyle;
};

export type CompositionBranchNode = CompositionNodeBase & {
  kind: Exclude<CompositionNodeKind, "block">;
  children: CompositionNode[];
};

export type BlockReferenceNode = CompositionNodeBase & {
  kind: "block";
  blockId: string;
};

export type CompositionNode = CompositionBranchNode | BlockReferenceNode;
export type CompositionRootNode = CompositionBranchNode & { kind: "root" };
```

Un `grid` expone `columnStart`, `columnSpan`, `rowStart`, `rowSpan`, `autoFlow`, tracks y columnas/filas por breakpoint. Los spans se validan contra la cantidad efectiva de tracks del breakpoint activo. Grid sólo admite 1–6 columnas y 1–12 filas; un fallback móvil obligatorio debe tener una columna salvo que un override justificado indique dos columnas y la prueba responsive confirme ausencia de overflow.

Un `row` puede ser un split de tracks configurables, no un nombre fijo de template. Los tracks admitidos suman exactamente 100 y cada uno está entre 25 y 75; por tanto 40/60 y 60/40 son válidos. Dirección, tracks, colapso y anchos mínimos/máximos pueden variar por breakpoint. El fallback móvil por defecto es `stack`.

Una `section` puede ser hero a pantalla completa con `heightMode: "viewport"`, `viewportHeight` o `minViewportHeight`, alineación vertical y overflow definido. En móvil, el renderer futuro usará unidades de viewport seguras —por ejemplo `svh`/`dvh` con fallback—, nunca asumirá la altura estática del navegador y no podrá crear scroll horizontal.

`positionMode: "free"` sólo es válido bajo un ancestro `overlay`. `anchored` requiere `anchor`; `free` requiere `x` e `y` entre 0 y 100, más offsets acotados. Ningún nodo puede exceder `zIndex` 20, quedar permanentemente fuera de límites recuperables o capturar toda la interacción del canvas. La UI de una fase posterior deberá incluir **Restablecer posición** y conservar selección accesible.

Un nodo `fixed` requiere `edge`, `inset`, `zIndex`, `safeArea`, reglas responsive y `reserveSpace`. Sólo podrá contener CTA/contacto existente, deberá poder desactivarse, nunca ocultará de forma permanente footer o controles del editor y reservará espacio inferior cuando `edge = "bottom"`.

## 5. Ejemplos JSON de capacidades V6

Los siguientes ejemplos son contractuales; no son recetas ni se han insertado en el proyecto.

### 5.1 V5 lineal y resultado V6 exacto de hidratación

```json
{
  "version": 5,
  "profile": "premium",
  "blocks": [
    { "id": "banner", "type": "banner", "order": 0, "enabled": true, "props": {} },
    { "id": "profile", "type": "profile", "order": 1, "enabled": true, "props": { "verticalPosition": "transition", "overlap": 36 } },
    { "id": "heading", "type": "heading", "order": 2, "enabled": true, "props": {} },
    { "id": "links", "type": "links", "order": 3, "enabled": true, "props": {} },
    { "id": "footer", "type": "footer", "order": 4, "enabled": true, "props": {} }
  ]
}
```

```json
{
  "version": 6,
  "composition": {
    "id": "root",
    "kind": "root",
    "enabled": true,
    "children": [
      {
        "id": "legacy-hero",
        "kind": "section",
        "enabled": true,
        "children": [{ "id": "ref-banner", "kind": "block", "enabled": true, "blockId": "banner" }]
      },
      {
        "id": "legacy-body",
        "kind": "stack",
        "enabled": true,
        "children": [
          { "id": "ref-profile", "kind": "block", "enabled": true, "blockId": "profile" },
          { "id": "ref-heading", "kind": "block", "enabled": true, "blockId": "heading" },
          { "id": "ref-links", "kind": "block", "enabled": true, "blockId": "links" },
          { "id": "ref-footer", "kind": "block", "enabled": true, "blockId": "footer" }
        ]
      }
    ]
  }
}
```

Los objetos `blocks`, sus ids, props, estilos y `order` permanecen iguales. Sólo se añade una estructura en memoria. La hidratación no persiste esta forma V6.

### 5.2 Grid con placement válido y fallback móvil

```json
{
  "id": "services-grid",
  "kind": "grid",
  "enabled": true,
  "style": {
    "grid": { "columns": 3, "rows": 2, "autoFlow": "row" },
    "responsive": {
      "mobile": { "grid": { "columns": 1 }, "gap": 12 },
      "tablet": { "grid": { "columns": 2 }, "gap": 16 },
      "desktop": { "grid": { "columns": 3 }, "gap": 20 }
    }
  },
  "children": [
    {
      "id": "ref-services",
      "kind": "block",
      "enabled": true,
      "blockId": "services",
      "style": { "placement": { "columnStart": 1, "columnSpan": 2, "rowStart": 1, "rowSpan": 1 } }
    }
  ]
}
```

### 5.3 Split configurable, no rígido

```json
{
  "id": "media-copy",
  "kind": "row",
  "enabled": true,
  "style": {
    "split": { "direction": "row", "tracks": [40, 60], "collapse": "stack", "minColumnWidth": 220 },
    "responsive": {
      "mobile": { "split": { "collapse": "stack", "direction": "row" }, "order": 0 },
      "desktop": { "split": { "tracks": [40, 60], "direction": "row" } }
    }
  },
  "children": [
    { "id": "media-column", "kind": "column", "enabled": true, "children": [{ "id": "ref-video", "kind": "block", "enabled": true, "blockId": "video" }] },
    { "id": "copy-column", "kind": "column", "enabled": true, "children": [{ "id": "ref-heading", "kind": "block", "enabled": true, "blockId": "heading" }] }
  ]
}
```

### 5.4 Hero de viewport seguro

```json
{
  "id": "hero",
  "kind": "section",
  "enabled": true,
  "style": {
    "heightMode": "viewport",
    "minViewportHeight": 72,
    "verticalAlign": "center",
    "overflow": "hidden",
    "responsive": { "mobile": { "minHeight": 520 }, "desktop": { "minHeight": 680 } }
  },
  "children": [{ "id": "ref-banner", "kind": "block", "enabled": true, "blockId": "banner" }]
}
```

### 5.5 Overlay con anclaje, free limitado y fallback móvil

```json
{
  "id": "hero-overlay",
  "kind": "overlay",
  "enabled": true,
  "style": { "overflow": "visible" },
  "children": [
    { "id": "ref-banner", "kind": "block", "enabled": true, "blockId": "banner" },
    {
      "id": "ref-profile-overlay",
      "kind": "block",
      "enabled": true,
      "blockId": "profile",
      "style": {
        "position": { "positionMode": "anchored", "anchor": "bottom-center", "offsetY": 28, "zIndex": 8, "width": 72 },
        "responsive": {
          "mobile": { "position": { "positionMode": "anchored", "anchor": "bottom-center", "offsetY": 18, "zIndex": 8 } },
          "desktop": { "position": { "positionMode": "free", "x": 50, "y": 92, "offsetX": 0, "offsetY": 0, "zIndex": 8 } }
        }
      }
    }
  ]
}
```

### 5.6 CTA fijo con salida y reserva de espacio

```json
{
  "id": "bottom-cta",
  "kind": "fixed",
  "enabled": true,
  "style": {
    "fixed": { "edge": "bottom", "inset": 16, "zIndex": 16, "safeArea": true, "maxWidth": 640, "reserveSpace": true },
    "responsive": { "mobile": { "width": 100 }, "desktop": { "width": 72 } }
  },
  "children": [{ "id": "ref-links", "kind": "block", "enabled": true, "blockId": "links" }]
}
```

## 6. Validación pura e invariantes

La implementación posterior creará `validateComposition(config): CompositionIssue[]`, sin efectos secundarios. Los errores serán tipados, incluirán `code`, `nodeId`, `path` y mensaje de usuario; una operación inválida devuelve un resultado fallido y deja la configuración original intacta.

| Invariante | Regla exacta |
|---|---|
| Raíz | Existe una única raíz `kind: "root"`, sin padre ni `blockId`. |
| IDs | Cada `CompositionNode.id` es único y no vacío. |
| Referencias | Todo `blockId` existe en `blocks` y aparece una sola vez en composition. |
| Sin pérdida | Una operación estructural nunca elimina ni altera un `PageBlock` existente. |
| Ciclos | Ningún nodo puede ser ancestro de sí mismo; root no se mueve ni elimina. |
| Hijos | Sólo se aceptan combinaciones definidas por una tabla `allowedChildren`. Un nodo `block` no tiene hijos. |
| Profundidad/cantidad | Máximo seis niveles bajo root y 96 nodos totales. |
| Grid | Columnas 1–6, filas 1–12, starts ≥ 1, spans ≥ 1 y `start + span - 1` dentro de tracks efectivos. |
| Split | Dos tracks, cada uno 25–75, suma exacta 100; min/max width no negativos. |
| Posición | `x/y` 0–100, offsets ±160 px o ±40%, `zIndex` 0–20; `free` sólo bajo overlay. |
| Hero/fixed | Viewport/min viewport 1–100, CTA fixed con `reserveSpace`, edge y salida mediante `enabled`. |
| Responsive | Overrides parciales válidos, breakpoints conocidos y merge profundo sin borrar otros breakpoints. |

## 7. Operaciones puras de Fase 1

| Operación | Propósito | Condición de éxito |
|---|---|---|
| `normalizeV5(input)` | Normaliza histórico a V5 sin mutar. | Mantiene blocks, props, styles y order. |
| `upgradeV5ToV6(input)` | Construye `legacy-hero` + `legacy-body` deterministas. | Cada bloque V5 tiene una referencia única. |
| `hydratePageConfig(input)` | Acepta V5/V6 y devuelve V6 validado. | No persiste ni toca remoto. |
| `findNode(root, id)` | Ubica nodo sin mutar. | Retorna ruta estable o `undefined`. |
| `insertNode(config, parent, index, node)` | Inserta estructura o referencia. | Respeta hijos permitidos, límites y ids. |
| `moveNode(config, node, parent, index)` | Reubica estructura. | Sin ciclos; no altera `PageBlock.order`. |
| `wrapNodes(config, nodeIds, wrapper)` | Encapsula hermanos en row/grid/overlay. | Conserva orden relativo y padre común. |
| `unwrapNode(config, node)` | Elimina wrapper y reinserta hijos. | No borra blocks ni props. |
| `removeNode(config, node)` | Quita sólo estructura o referencia. | No elimina `PageBlock`; root protegida. |
| `setNodeStyle` / `setNodeResponsive` | Cambia props estructurales. | Merge profundo y límites validados. |
| `resetNodePosition(config, node, breakpoint?)` | Restablece ancla/offset seguro. | No toca estilos de PageBlock. |
| `flattenForLegacy(config)` | Contingencia V6 → V5. | Sólo éxito sin grid/overlay/fixed irreducible; nunca pierde información silenciosamente. |

## 8. Compatibilidad V5 y persistencia

Todos los bloques V5 conservan `id`, `type`, `props`, `style`, `order`, `enabled`, `locked`, `groupId`, capabilities, presets, theme y background. Banner, perfil superpuesto y footer conservan apariencia mediante el adaptador `legacy-hero`/`legacy-body`; la igualdad visual se probará en Fase 2, no se asume en Fase 1.

La Fase 1 no conecta guardado, no convierte PageConfig remoto durante lectura, no cambia `page_config`, no modifica tablas ni migraciones y no cambia las políticas RLS. La persistencia de borradores continúa con la forma actual; sólo una fase posterior, aprobada y respaldada por fixtures, podrá persistir V6.

`flattenForLegacy` es una herramienta de contingencia; no habilita a descartar estructuras V6 no linealizables. Si un V6 con grid, overlay o fixed no puede aplanarse sin pérdida, debe preservarse íntegro y abrirse en un entorno V6 compatible o restaurarse una versión previa.

## 9. Alcance cerrado de Fase 1

| Permitido | Prohibido |
|---|---|
| Tipos `PageConfigV5Input`, `PageConfigV5`, `PageConfigV6` y composición. | Renderer jerárquico o cambios a `CanvasBlock`. |
| Hidratación V5 → V6 en memoria. | UI, panel de composición, inspector, drag and drop. |
| Validación pura y operaciones inmutables. | CSS visible, rutas, preview, navegación o responsive visual. |
| Fixtures neutrales y pruebas unitarias de modelo. | Guardado remoto/local adicional, Supabase, migraciones o publicación. |
| Nuevos archivos de modelo/test estrictamente necesarios. | Generador de recetas, templates, artefactos, QR, `/editor` y `/admin/template-studio`. |

La lista de archivos de Fase 1 queda cerrada:

1. `src/power-editor/client/src/lib/editorCandidateModel.ts` — tipos discriminados, adaptador, validación y operaciones puras.
2. `src/power-editor/client/src/lib/editorCandidateModel.test.ts` — pruebas unitarias nuevas y neutrales.
3. `src/power-editor/client/src/lib/compositionFixtures.ts` — fixtures inmutables V5/V6, sin reseñas ni datos personales.

No se creará ni editará ningún otro archivo en Fase 1 sin una autorización adicional.

## 10. Fixtures y pruebas unitarias exactas de Fase 1

| Fixture o prueba | Comprobación |
|---|---|
| `v5-default-linear` | `hydratePageConfig` devuelve V6, no muta entrada y conserva todos los bloques/props/order. |
| `v5-banner-profile-overlap` | Banner, perfil con transición/overlap y footer conservan datos literalmente. |
| `v5-no-banner` | No agrega una sección vacía para banner deshabilitado/ausente. |
| `v5-content-rich` | Cada uno de los 25 tipos de bloque queda referenciado una vez y sólo una vez. |
| `v6-responsive-precedence` | Base → mobile → tablet → desktop aplica merge profundo y no borra valores. |
| `v6-grid-valid` | Grid con 3 columnas y spans válidos acepta placement. |
| `v6-grid-invalid-span` | Span fuera de columnas devuelve error y no muta. |
| `v6-split-valid` | Tracks 40/60, colapso móvil y orden responsive validan. |
| `v6-split-invalid-tracks` | Tracks no suman 100 o fuera de 25–75: rechazo tipado. |
| `v6-hero-safe` | heightMode viewport/minimum acepta límites válidos y rechaza fuera de 1–100. |
| `v6-overlay-anchored` | Anchor, offsets y zIndex dentro de límites aceptan. |
| `v6-free-outside-overlay` | `free` fuera de overlay devuelve error sin mutación. |
| `v6-fixed-cta` | Fixed bottom requiere reserva de espacio, safe-area y salida `enabled`. |
| `v6-cycle` | Movimiento que crea ciclo se rechaza. |
| `v6-duplicate-block-ref` | El segundo ref al mismo blockId se rechaza. |
| `v6-max-depth-and-nodes` | Profundidad > 6 o > 96 nodos se rechaza. |
| `v6-wrap-unwrap` | Conserva orden de hermanos y no altera blocks. |
| `v6-flattenable` | Stack lineal vuelve a V5 con igual orden. |
| `v6-not-flattenable` | Grid/overlay/fixed devuelve fallo explícito de contingencia. |

## 11. Matriz de impacto y rollback por fase

| Fase futura | Archivos autorizables | Validación de entrada | Rollback seguro |
|---|---|---|---|
| 1 — modelo | Los tres archivos cerrados en sección 9. | Suite unitaria completa del modelo. | Revertir el commit aislado; V5 no se modifica. |
| 2 — renderer | Nuevo `CompositionRenderer`, punto de delegación mínimo de `EditorCandidate.tsx` y CSS encapsulado nuevo. | Capturas V5 legacy en móvil/tablet/desktop. | Revertir renderer/CSS; el árbol aún no se persiste. |
| 3 — UI | Árbol, inspector y comandos estructurales nuevos. | Touch, teclado, Undo/Redo y selección. | Revertir sólo UI; modelo/fixtures permanecen. |
| 4 — persistencia | Hook/servicio de borrador estrictamente revisados. | Carga/recarga/propietario/sesión con V5 y V6. | Desactivar Save V6 sin borrar JSONB. |
| 5 — recetas | Generador y QA tras autorización independiente. | Métrica macroestructural y revisión visual humana. | Mantener templates como draft; no publicación automática. |

Cada fase posterior requiere checkpoint y commit atómico antes de avanzar; no se reescribe historia publicada. Ninguna Fase 1–5 incluye una migración SQL por defecto.

## 12. Confirmación de estado

Se realizó exclusivamente auditoría y documentación. No se escribió código TypeScript, CSS, renderer, tests, rutas, SQL, artefactos ni recetas; no se ejecutaron scripts de generación; no se modificó Supabase y no hubo operación de Git. El documento V6 es un contrato técnico revisado, no una implementación.

## 13. Autorización y transición de alcance

El gate literal de autorización de Fase 1 que existía al cierre de esta auditoría queda **sustituido** por la autorización posterior y más amplia del propietario: continuar de forma autónoma la investigación, implementación aislada, conexión interna de borradores, mejora del generador, QA y documentación, dejando **únicamente** el SQL de Supabase para revisión y aplicación manual final.

La sustitución no relaja los congelamientos. El alcance sigue restringido a este worktree y a los archivos estrictamente necesarios para el Power Editor; quedan excluidos Supabase real, publicación, sincronización real, commit, push, merge, deploy, `/editor`, `/admin/template-studio`, QR y rutas públicas.
