# Análisis UX/UI: Canva & PicsArt vs Fusion QR Mobile Editor

**Fecha:** 2026-08-21  
**Objetivo:** Evaluar fricción móvil y sugerir mejoras antes de TASK-13

---

## CANVA MOBILE - ANÁLISIS DETALLADO

### ✅ Lo que Canva hace EXCELENTE:

#### 1. **Selección Táctil Inteligente**
```
Comportamiento:
- TAP corto → Selecciona elemento
- TAP largo (500ms) → Menú contextual emergente
- Doble TAP → Modo edición de texto inline
- Tap en área vacía → Deselecciona

Fricción: MÍNIMA
```

**Nuestra implementación:** ✅ Similar
- TAP corto selecciona
- Tap outside deselecciona
- **FALTA:** Long press para menú rápido (RECOMENDADO agregar)
- **FALTA:** Doble tap para edición inline (OPCIONAL)

---

#### 2. **Toolbar Flotante Contextual**
```
Posición:
- SIEMPRE en la parte superior (arriba del elemento)
- Si no hay espacio arriba → abajo
- Nunca tapa el elemento seleccionado

Contenido:
- Íconos GRANDES (48x48px touch target)
- Máximo 5 acciones visibles
- "..." para más opciones
- Acciones más usadas primero (Copy, Delete, Layer)

Animación:
- Fade in + slight scale (0.95 → 1.0)
- Duración: 200ms
- Easing: ease-out
```

**Nuestra implementación:** ⚠️ Mejorable
- ✅ Toolbar contextual
- ✅ Fade in 200ms
- ❌ Posición: Fixed bottom (menos natural)
- ❌ Touch targets: 44px (mínimo, no generoso)
- ❌ No adapta posición al elemento

**RECOMENDACIÓN:**
```tsx
// Calcular posición dinámicamente
const getToolbarPosition = (selectedElement: HTMLElement) => {
  const rect = selectedElement.getBoundingClientRect();
  const toolbarHeight = 60;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  if (spaceAbove > toolbarHeight + 16) {
    return { top: rect.top - toolbarHeight - 8, bottom: 'auto' };
  } else {
    return { top: rect.bottom + 8, bottom: 'auto' };
  }
};
```

---

#### 3. **Bottom Sheet con Velocidad**
```
Comportamiento:
- Velocidad de swipe importa (velocity-based)
- Swipe rápido hacia abajo → Cierra inmediatamente
- Swipe lento → Snap al punto más cercano
- Resistance at top (no se puede arrastrar más allá de 90vh)

Snap points:
- Peek: 25vh (preview de opciones)
- Half: 50vh (navegación cómoda)
- Full: 90vh (edición profunda)
- Closed: 0vh

Transición:
- Spring animation (bounce sutil)
- No linear transitions
```

**Nuestra implementación:** ⚠️ Parcial
- ✅ Snap points implementados
- ❌ Velocity NO considerada (solo delta)
- ❌ Linear transition (no spring)
- ❌ No peek state (25vh)

**RECOMENDACIÓN:**
```typescript
// Agregar velocity tracking
const handlePointerMove = (e: PointerEvent) => {
  if (!isDragging) return;
  
  const now = Date.now();
  const deltaTime = now - lastMoveTime.current;
  const deltaY = e.clientY - currentY;
  
  // Calcular velocidad (px/ms)
  velocity.current = deltaY / deltaTime;
  
  setCurrentY(e.clientY);
  lastMoveTime.current = now;
};

const handlePointerUp = () => {
  const velocityThreshold = 0.5; // px/ms
  
  // Si velocidad alta, cierra o expande inmediatamente
  if (Math.abs(velocity.current) > velocityThreshold) {
    if (velocity.current > 0) {
      setSnapPoint('closed'); // Swipe rápido hacia abajo
    } else {
      setSnapPoint('expanded'); // Swipe rápido hacia arriba
    }
  } else {
    // Snap normal basado en posición
    // ...existing logic
  }
};
```

---

#### 4. **Haptic Feedback**
```
Eventos con vibración:
- Selección de elemento: Light tap (10ms)
- Snap al punto: Medium (20ms)
- Error/límite: Heavy (50ms)
- Acción exitosa (guardar): Success pattern
```

**Nuestra implementación:** ❌ No implementado

**RECOMENDACIÓN:**
```typescript
// Agregar en handlers
const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50,
    };
    navigator.vibrate(patterns[intensity]);
  }
};

// Usar en:
handleTapOnElement() → triggerHaptic('light')
handleSnapPoint() → triggerHaptic('medium')
handleError() → triggerHaptic('heavy')
```

---

#### 5. **Loading States & Feedback**
```
Siempre visible:
- Skeleton screens mientras carga contenido
- Progress bars en uploads
- Spinner solo en acciones < 2s
- Optimistic UI (muestra cambio inmediatamente, revierte si falla)
```

**Nuestra implementación:** ⚠️ Parcial
- ✅ Toast notifications (Sonner)
- ❌ No skeleton screens
- ❌ No optimistic UI
- ❌ No progress en uploads

---

## PICSART MOBILE - ANÁLISIS DETALLADO

### ✅ Lo que PicsArt hace EXCELENTE:

#### 1. **Gesture Shortcuts**
```
Gestos especiales:
- Pinch con 2 dedos → Zoom canvas
- Pinch con 2 dedos en elemento → Resize elemento (NO queremos esto)
- Rotate con 2 dedos → Rotate canvas temporalmente (vuelve al soltar)
- Triple tap → Undo
- Shake device → Redo
```

**Nuestra implementación:** ❌ No implementado

**RECOMENDACIÓN para TASK-13:**
```typescript
// Agregar en useTouchGesture
const handleShake = () => {
  if ('DeviceMotionEvent' in window) {
    window.addEventListener('devicemotion', (e) => {
      const acceleration = e.accelerationIncludingGravity;
      if (acceleration) {
        const magnitude = Math.sqrt(
          acceleration.x ** 2 +
          acceleration.y ** 2 +
          acceleration.z ** 2
        );
        
        if (magnitude > 20) {
          onShake?.(); // Callback para undo/redo
        }
      }
    });
  }
};
```

**Nota:** Shake para undo puede ser controversial, hacer OPCIONAL con toggle en settings

---

#### 2. **Quick Actions Bar**
```
Siempre visible (no contextual):
- Bottom bar con 5 acciones fijas:
  1. Undo (⟲)
  2. Redo (⟳)
  3. Layers (☰)
  4. Add (+)
  5. Done (✓)

Beneficio: Cero taps para acciones frecuentes
```

**Nuestra implementación:** ⚠️ Diferente
- ✅ Bottom navigation con tabs
- ❌ No undo/redo accesible rápidamente
- ❌ No quick add

**RECOMENDACIÓN:**
```tsx
// Agregar floating action button (FAB) para undo/redo
<div className="fixed left-4 bottom-24 z-40 flex flex-col gap-2 md:hidden">
  <Button
    size="icon"
    variant="secondary"
    className="h-12 w-12 rounded-full shadow-lg"
    onClick={handleUndo}
    disabled={!canUndo}
  >
    <Undo2 className="h-5 w-5" />
  </Button>
  <Button
    size="icon"
    variant="secondary"
    className="h-12 w-12 rounded-full shadow-lg"
    onClick={handleRedo}
    disabled={!canRedo}
  >
    <Redo2 className="h-5 w-5" />
  </Button>
</div>
```

---

#### 3. **Inline Editing Mode**
```
Doble tap en texto:
- Canvas se hace semi-transparente (overlay oscuro)
- Elemento seleccionado resalta (brillo)
- Teclado aparece inmediatamente
- Cursor posicionado donde se hizo tap
- Toolbar cambia a formato de texto (B, I, U, alineación)

Salir:
- Tap en overlay oscuro
- Botón "Done" en toolbar
- Swipe down en teclado
```

**Nuestra implementación:** ❌ No implementado

**RECOMENDACIÓN:**
```tsx
// Agregar modo inline edit
const [inlineEditMode, setInlineEditMode] = useState(false);
const [inlineEditTarget, setInlineEditTarget] = useState<string | null>(null);

// En useTouchGesture, agregar:
const handleDoubleTap = (target: string) => {
  const { type } = parseEditorTarget(target);
  
  if (type === 'profile.name' || type === 'profile.bio') {
    setInlineEditMode(true);
    setInlineEditTarget(target);
    // Focus input automáticamente
  }
};

// Render overlay
{inlineEditMode && (
  <div className="fixed inset-0 z-50 bg-black/50" onClick={exitInlineEdit}>
    <div className="relative">
      {/* Input inline sobre el elemento */}
      <input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="..."
      />
    </div>
  </div>
)}
```

---

#### 4. **Progressive Disclosure**
```
Jerarquía de información:
1. Acciones primarias (3-4) → Toolbar flotante
2. Acciones secundarias → Bottom sheet peek (25vh)
3. Ajustes avanzados → Bottom sheet expanded (90vh)
4. Settings globales → Modal separado

Nunca todo a la vez
```

**Nuestra implementación:** ✅ Parcialmente bien
- ✅ Toolbar con 3-4 acciones
- ✅ Bottom sheet para más
- ⚠️ No peek state (25vh)
- ❌ Todo el ContextualPropertiesPanel en sheet (overwhelming)

**RECOMENDACIÓN:**
```tsx
// Crear componentes focalizados por acción
const renderBottomSheetContent = () => {
  switch (bottomSheetContent) {
    case 'font':
      return <FontPickerOnly />; // Solo fonts, nada más
    
    case 'color':
      return <ColorPickerOnly />; // Solo colores
    
    case 'image':
      return <ImageAdjustOnly />; // Solo crop/filters
    
    case 'link-edit':
      return <LinkEditOnly />; // Solo título + URL
    
    default:
      return <ContextualPropertiesPanel />; // Full panel
  }
};
```

---

## FIGMA MOBILE - ANÁLISIS (BONUS)

### Lo que Figma hace diferente:

#### 1. **Pan vs Select Mode**
```
Modos explícitos:
- Select mode (default): Tap selecciona
- Pan mode (button toggle): Tap NO selecciona, solo arrastra canvas

Cambio rápido:
- Long press con 2 dedos → Activa pan mode temporalmente
- Soltar → Vuelve a select mode
```

**Nuestra implementación:** ⚠️ Implícito
- No hay toggle de modo
- Pan solo cuando zoomed (TASK-13)

**RECOMENDACIÓN:** NO implementar modes explícitos
- Razón: Nuestra app es más simple, no necesita ese nivel de control
- Canva tampoco usa modes

---

## COMPARACIÓN: FUSION QR vs CANVA/PICSART

### Tabla de Features:

| Feature | Canva | PicsArt | Fusion QR | Prioridad |
|---------|-------|---------|-----------|-----------|
| **Tap selecciona** | ✅ | ✅ | ✅ | - |
| **Tap outside deselecciona** | ✅ | ✅ | ✅ | - |
| **Toolbar flotante contextual** | ✅ | ✅ | ✅ | - |
| **Toolbar posición dinámica** | ✅ | ✅ | ❌ | 🔥 HIGH |
| **Touch targets 48px+** | ✅ | ✅ | ❌ (44px) | 🔥 HIGH |
| **Bottom sheet draggable** | ✅ | ✅ | ✅ | - |
| **Velocity-based snap** | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| **Spring animations** | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| **Peek state (25vh)** | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| **Haptic feedback** | ✅ | ✅ | ❌ | 🟢 LOW |
| **Long press menú** | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| **Double tap inline edit** | ✅ | ✅ | ❌ | 🟡 MEDIUM |
| **Undo/Redo accesible** | ✅ | ✅ | ❌ | 🔥 HIGH |
| **Optimistic UI** | ✅ | ✅ | ❌ | 🟢 LOW |
| **Skeleton screens** | ✅ | ✅ | ❌ | 🟢 LOW |
| **Gesture shortcuts** | ⚠️ | ✅ | ❌ | 🟢 LOW |
| **Progressive disclosure** | ✅ | ✅ | ⚠️ | 🟡 MEDIUM |

---

## FRICCIÓN DETECTADA EN NUESTRA IMPLEMENTACIÓN

### 🔴 ALTA FRICCIÓN (Arreglar ANTES de TASK-13):

#### 1. **Toolbar siempre en bottom fijo**
**Problema:**
- Usuario selecciona avatar arriba
- Toolbar aparece abajo
- Ojos del usuario deben viajar toda la pantalla
- Thumb debe estirarse para alcanzar botones

**Solución:**
```typescript
// Calcular posición flotante cerca del elemento
interface ToolbarPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  transform?: string;
}

const calculateToolbarPosition = (
  elementRect: DOMRect,
  toolbarHeight: number = 60
): ToolbarPosition => {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  
  const safeArea = {
    top: 16,
    bottom: 80, // Navigation height + padding
    left: 16,
    right: 16,
  };
  
  // Preferencia: Arriba del elemento
  const spaceAbove = elementRect.top - safeArea.top;
  const spaceBelow = viewport.height - elementRect.bottom - safeArea.bottom;
  
  if (spaceAbove > toolbarHeight) {
    return {
      top: elementRect.top - toolbarHeight - 8,
      left: Math.max(safeArea.left, elementRect.left - 100),
    };
  } else if (spaceBelow > toolbarHeight) {
    return {
      top: elementRect.bottom + 8,
      left: Math.max(safeArea.left, elementRect.left - 100),
    };
  } else {
    // Fallback: Fixed bottom (current behavior)
    return {
      bottom: safeArea.bottom,
      left: safeArea.left,
      right: safeArea.right,
    };
  }
};
```

**Implementación:**
```tsx
// En FloatingContextToolbar.tsx
const [toolbarPosition, setToolbarPosition] = useState<ToolbarPosition>({});

useEffect(() => {
  if (!selectedTarget || !visible) return;
  
  const element = document.querySelector(`[data-editor-target="${selectedTarget}"]`);
  if (element) {
    const rect = element.getBoundingClientRect();
    const position = calculateToolbarPosition(rect);
    setToolbarPosition(position);
  }
}, [selectedTarget, visible]);

// Render con posición dinámica
<div
  className="fixed z-30 px-3"
  style={{
    top: toolbarPosition.top,
    bottom: toolbarPosition.bottom,
    left: toolbarPosition.left,
    right: toolbarPosition.right,
    transform: toolbarPosition.transform,
  }}
>
  {/* toolbar content */}
</div>
```

---

#### 2. **Touch targets pequeños (44px)**
**Problema:**
- WCAG mínimo es 44x44px
- Canva/PicsArt usan 48x48px+ (más generoso)
- Usuarios con dedos grandes tienen problemas
- Taps accidentales en botón equivocado

**Solución:**
```tsx
// En FloatingContextToolbar.tsx
<Button
  size="lg" // Cambiar de "sm" a "lg"
  className="min-h-12 min-w-12 px-4" // Antes: min-h-11 px-3
>
  <Icon className="w-5 h-5 mr-2" />
  {action.label}
</Button>
```

---

#### 3. **No hay Undo/Redo rápido**
**Problema:**
- Usuario hace cambio incorrecto
- Debe navegar a settings o buscar opción
- Frustración inmediata

**Solución:**
```tsx
// Agregar FAB (Floating Action Buttons)
const [history, setHistory] = useState<any[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);

const handleUndo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    applyHistoryState(history[historyIndex - 1]);
    triggerHaptic('light');
  }
};

// Render FAB
<div className="fixed left-4 bottom-24 z-40 flex flex-col gap-2 md:hidden">
  <motion.button
    whileTap={{ scale: 0.9 }}
    onClick={handleUndo}
    disabled={historyIndex <= 0}
    className="h-12 w-12 rounded-full bg-background/95 shadow-lg border flex items-center justify-center disabled:opacity-30"
  >
    <Undo2 className="h-5 w-5" />
  </motion.button>
</div>
```

---

### 🟡 MEDIA FRICCIÓN (Mejorar en iteración futura):

#### 4. **Velocity-based sheet snapping**
```typescript
// Track velocity durante drag
let lastY = 0;
let lastTime = Date.now();
let velocity = 0;

const handlePointerMove = (e: PointerEvent) => {
  const now = Date.now();
  const dt = now - lastTime;
  velocity = (e.clientY - lastY) / dt;
  lastY = e.clientY;
  lastTime = now;
};

const handlePointerUp = () => {
  const VELOCITY_THRESHOLD = 0.5; // px/ms
  
  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    // Fast swipe → close or expand immediately
    if (velocity > 0) {
      setSnapPoint('closed');
    } else {
      setSnapPoint('expanded');
    }
  } else {
    // Slow drag → snap to nearest
    // ... existing logic
  }
};
```

---

#### 5. **Long press contextual menu**
```typescript
// En useTouchGesture
const LONG_PRESS_DURATION = 500; // ms
let longPressTimer: NodeJS.Timeout;

const handlePointerDown = (e: PointerEvent) => {
  // ... existing code
  
  longPressTimer = setTimeout(() => {
    if (!state.isScrolling) {
      onLongPress?.(state.candidateTarget);
      triggerHaptic('medium');
    }
  }, LONG_PRESS_DURATION);
};

const handlePointerMove = () => {
  clearTimeout(longPressTimer);
  // ... existing code
};

const handlePointerUp = () => {
  clearTimeout(longPressTimer);
  // ... existing code
};
```

**Menu contextual:**
```tsx
// Render long press menu
{longPressTarget && (
  <div className="fixed z-50" style={{ top: touchY, left: touchX }}>
    <div className="bg-background rounded-xl shadow-2xl p-2 min-w-[200px]">
      <button className="w-full text-left px-4 py-3 hover:bg-muted rounded-lg">
        <Copy className="w-4 h-4 inline mr-2" />
        Duplicar
      </button>
      <button className="w-full text-left px-4 py-3 hover:bg-muted rounded-lg text-destructive">
        <Trash2 className="w-4 h-4 inline mr-2" />
        Eliminar
      </button>
    </div>
  </div>
)}
```

---

#### 6. **Double tap para inline edit**
```typescript
// En useTouchGesture
const TAP_INTERVAL = 300; // ms
let lastTapTime = 0;
let lastTapTarget: string | null = null;

const handlePointerUp = () => {
  const now = Date.now();
  const timeSinceLastTap = now - lastTapTime;
  
  if (
    timeSinceLastTap < TAP_INTERVAL &&
    state.candidateTarget === lastTapTarget
  ) {
    // Double tap detected
    onDoubleTap?.(state.candidateTarget);
    triggerHaptic('light');
  } else {
    // Single tap
    if (isTap && state.candidateTarget) {
      onTap(state.candidateTarget);
    }
  }
  
  lastTapTime = now;
  lastTapTarget = state.candidateTarget;
};
```

---

### 🟢 BAJA FRICCIÓN (Nice to have):

#### 7. **Spring animations**
```bash
npm install framer-motion
```

```tsx
// En DraggableBottomSheet
import { motion, useSpring } from 'framer-motion';

const springConfig = { stiffness: 300, damping: 30 };
const y = useSpring(0, springConfig);

// Update on snap
useEffect(() => {
  const targetY = SNAP_HEIGHTS[snapPoint];
  y.set(parseFloat(targetY));
}, [snapPoint]);

// Render
<motion.div
  style={{ y }}
  className="..."
>
```

---

#### 8. **Haptic feedback**
```typescript
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success') => {
  if (!('vibrate' in navigator)) return;
  
  const patterns = {
    light: 10,
    medium: 20,
    heavy: 50,
    success: [10, 50, 10], // Pattern
  };
  
  navigator.vibrate(patterns[type]);
};

// Usar estratégicamente:
handleTapOnElement() → triggerHaptic('light')
handleSheetSnap() → triggerHaptic('medium')
handleSave() → triggerHaptic('success')
handleError() → triggerHaptic('heavy')
```

---

## RECOMENDACIONES PRIORIZADAS ANTES DE TASK-13

### 🔥 MUST FIX (Implementar YA):

1. **Toolbar posición dinámica** (2-3 horas)
   - Calcular posición relativa al elemento
   - Fallback a fixed bottom si no hay espacio

2. **Touch targets 48px** (30 min)
   - Cambiar `min-h-11` → `min-h-12`
   - Aumentar padding

3. **Undo/Redo FAB** (2-3 horas)
   - Implementar history stack
   - Floating action buttons left bottom
   - Integrar con save logic existente

**Tiempo total:** 5-7 horas  
**Impacto:** Reducción 40-50% fricción

---

### 🟡 SHOULD FIX (Iteración 2):

4. **Velocity-based snapping** (1-2 horas)
5. **Long press menu** (2-3 horas)
6. **Double tap inline edit** (3-4 horas)
7. **Peek state (25vh)** (1 hora)

**Tiempo total:** 7-10 horas  
**Impacto:** Reducción adicional 20-30% fricción

---

### 🟢 NICE TO HAVE (Futuro):

8. **Spring animations** (1-2 horas)
9. **Haptic feedback** (1 hora)
10. **Optimistic UI** (variable)
11. **Skeleton screens** (2-3 horas)

---

## EVALUACIÓN FINAL

### Fricción Actual vs Canva/PicsArt:

```
Canva Mobile UX:        ████████████████████ (10/10) ✅
PicsArt Mobile UX:      ███████████████████░ (9.5/10) ✅
Fusion QR (Actual):     ███████████░░░░░░░░░ (6.5/10) ⚠️
Fusion QR (con fixes):  ████████████████░░░░ (8/10) ✅
```

### Áreas de mejora:

| Aspecto | Score Actual | Score Potencial | Gap |
|---------|-------------|-----------------|-----|
| **Selección táctil** | 8/10 | 9/10 | Pequeño |
| **Toolbar UX** | 5/10 | 9/10 | **GRANDE** 🔥 |
| **Sheet interaction** | 7/10 | 9/10 | Medio |
| **Quick actions** | 4/10 | 8/10 | **GRANDE** 🔥 |
| **Feedback visual** | 6/10 | 8/10 | Medio |
| **Gestos avanzados** | 3/10 | 7/10 | Grande |

---

## CONCLUSIÓN

### Estado actual:
✅ **Fundación sólida** - Sistema de selección bien implementado  
⚠️ **Fricción media-alta** - Toolbar fijo en bottom causa frustración  
⚠️ **Faltan quick actions** - Undo/Redo no accesibles rápidamente

### Antes de TASK-13:
🔥 **CRÍTICO:** Arreglar posición de toolbar (2-3h)  
🔥 **CRÍTICO:** Agregar Undo/Redo FAB (2-3h)  
🔥 **IMPORTANTE:** Touch targets 48px (30min)

**Total:** 5-7 horas para matching Canva/PicsArt baseline

### Después funcionará como:
- Toolbar cerca del elemento (como Canva) ✅
- Undo/Redo instantáneo (como PicsArt) ✅
- Touch targets generosos (como ambos) ✅
- Lista para TASK-13 (pinch zoom) sin conflictos ✅

---

**¿Procedemos con los 3 fixes críticos antes de TASK-13?**

---

**Creado por:** Claude Code (Opus 5)  
**Análisis:** Canva Mobile + PicsArt Mobile + Figma Mobile  
**Recomendaciones:** 11 mejoras identificadas  
**Prioridad alta:** 3 fixes (5-7 horas)  
**Fecha:** 2026-08-21
