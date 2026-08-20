# Plan: Sistema QR Premium Avanzado + Analytics + Panel Admin

## RESUMEN EJECUTIVO

Implementar un sistema completo de generación de QR con efectos Premium (degradados, neón), logos editables, analytics avanzados, y panel de administración con gestión de invitaciones y permisos Premium.

---

## FASES DE IMPLEMENTACIÓN

### FASE 1: RENDERER QR AVANZADO (Base técnica)
**Prioridad:** P0 - Bloqueante para todo lo demás  
**Tiempo estimado:** 3-4 horas

#### Decisión técnica: ¿Qué librería usar?

**Opciones evaluadas:**
1. `qrcode.react` (actual) - ❌ No soporta degradados/efectos
2. `qr-code-styling` - ✅ Soporta degradados, dots, corners, frames
3. Custom Canvas - ⚠️ Complejo, mucho desarrollo

**Decisión: Usar `qr-code-styling`**

**Justificación:**
- ✅ Soporta gradientes (linear/radial)
- ✅ Soporta dots shapes (rounded, dots, classy, extra-rounded)
- ✅ Soporta corner shapes
- ✅ Soporta frames
- ✅ Logo con customización
- ✅ SVG y Canvas export
- ✅ Buena documentación

#### Tareas Fase 1:

1. **Instalar dependencia**
   ```bash
   npm install qr-code-styling
   ```

2. **Crear wrapper component**
   - `src/components/qr/QRCodeAdvanced.tsx`
   - Wrapper para `qr-code-styling`
   - Props: todas las opciones de estilo
   - Compatibilidad con sistema actual

3. **Extender tipos de template**
   ```typescript
   interface QRTemplateAdvanced {
     // Existentes
     qr_foreground_color: string;
     qr_background_color: string;
     qr_logo_enabled: boolean;
     
     // Nuevos
     gradient?: {
       type: 'linear' | 'radial';
       colorStops: Array<{ offset: number; color: string }>;
       rotation?: number; // para linear
     };
     dotsStyle?: 'square' | 'dots' | 'rounded' | 'extra-rounded' | 'classy';
     cornersSquareStyle?: 'square' | 'extra-rounded' | 'dot';
     cornersDotStyle?: 'square' | 'dot';
     effect?: 'none' | 'neon' | 'glow';
   }
   ```

4. **Migrar ShareSection**
   - Reemplazar `QRCodeCanvas`/`QRCodeSVG` con `QRCodeAdvanced`
   - Mantener compatibilidad con QR simples existentes
   - Fallback a renderer simple si propiedades avanzadas no están

5. **Validación de escaneo**
   - Función `validateAdvancedQR(options)` 
   - Verificar contraste en degradados
   - Verificar que dots/corners no rompan escaneo
   - Retornar warnings si hay riesgo

---

### FASE 2: LOGOS INTERNOS EDITABLES (Premium feature)
**Prioridad:** P1  
**Tiempo estimado:** 2-3 horas

#### Arquitectura de logos

**Storage:**
- Bucket Supabase: `demo-logos`
- Estructura: `/categories/{category}/{logo-name}.svg`

**Tabla nueva:** `demo_logos`
```sql
CREATE TABLE demo_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'business', 'food', 'beauty', etc.
  file_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  tier TEXT DEFAULT 'premium', -- 'free' o 'premium'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Logos iniciales a crear:**
- **Business:** briefcase, chart, handshake, star, check (5)
- **Food:** fork-knife, coffee, cake, wine, chef-hat (5)
- **Beauty:** sparkles, flower, heart, leaf, scissors (5)
- **Tech:** code, cpu, wifi, rocket, gear (5)
- **Creative:** palette, camera, music, pen, brush (5)
- **Total:** 25 logos demo

#### Componentes:

1. **`DemoLogoSelector.tsx`**
   - Dialog para elegir logo demo
   - Filtro por categoría
   - Preview del logo en el QR
   - Solo visible para Premium

2. **`DemoLogoEditor.tsx`** (Admin only)
   - Upload de nuevos logos demo
   - Editar nombre/categoría
   - Eliminar logos
   - Preview antes de guardar

#### Flujo usuario:

```
Usuario Premium en QR Studio:
  → "Logo Central" sección
    → Toggle "Usar logo"
    → Botón "Subir mi logo" (actual)
    → NUEVO: Botón "Elegir logo demo" (Premium badge)
      → Abre DemoLogoSelector
      → Elige logo → Se aplica temporalmente
      → Puede cambiar colores del QR para combinar
      → Al descargar, logo demo se incluye
```

**Importante:** Logos demo NO son editables por usuarios. Solo selección + aplicación.

---

### FASE 3: PLANTILLAS QR AVANZADAS (Actualizar catálogo)
**Prioridad:** P1  
**Tiempo estimado:** 2 horas

#### Nuevas plantillas Premium con efectos:

**Degradados (6 nuevas):**
1. **Sunset Pro** - Degradado naranja a rosa
2. **Ocean Deep** - Degradado azul profundo a cyan
3. **Forest Mist** - Verde bosque a verde claro
4. **Purple Rain** - Morado oscuro a lavanda
5. **Fire** - Rojo a naranja brillante
6. **Ice** - Azul hielo a blanco

**Neón (4 nuevas):**
1. **Neon Pink** - Rosa neón con glow effect
2. **Cyber Blue** - Azul eléctrico con glow
3. **Toxic Green** - Verde neón seguro
4. **Ultraviolet** - Violeta neón con glow

**Elegantes con logo (4 nuevas):**
1. **Minimalist Pro** - Negro + logo business
2. **Boutique Gold** - Dorado + logo elegante
3. **Chef Special** - Terracota + logo food
4. **Beauty Essence** - Rosa suave + logo beauty

**Total nuevas:** 14 plantillas Premium avanzadas

#### Actualizar `qr-templates.ts`:

```typescript
interface QRTemplateAdvanced extends QRTemplate {
  gradient?: GradientOptions;
  dotsStyle?: DotsStyle;
  effect?: 'none' | 'neon' | 'glow';
  demoLogoId?: string; // Si viene con logo demo
}
```

---

### FASE 4: ANALYTICS AVANZADOS (Tracking detallado)
**Prioridad:** P0 (crítico para admin)  
**Tiempo estimado:** 3-4 horas

#### Base de datos - Nueva tabla `qr_analytics`

```sql
CREATE TABLE qr_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Datos del evento
  event_type TEXT NOT NULL, -- 'view' | 'link_click'
  link_id UUID REFERENCES profile_links(id) ON DELETE SET NULL,
  
  -- Geolocalización aproximada (IP-based)
  country TEXT,
  city TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  
  -- Contexto técnico
  user_agent TEXT,
  device_type TEXT, -- 'mobile' | 'desktop' | 'tablet'
  browser TEXT,
  os TEXT,
  
  -- Temporal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata adicional
  referrer TEXT,
  session_id TEXT -- Para agrupar clics de misma sesión
);

-- Índices para performance
CREATE INDEX idx_qr_analytics_profile_id ON qr_analytics(profile_id);
CREATE INDEX idx_qr_analytics_created_at ON qr_analytics(created_at);
CREATE INDEX idx_qr_analytics_event_type ON qr_analytics(event_type);
CREATE INDEX idx_qr_analytics_profile_event ON qr_analytics(profile_id, event_type);
```

#### RLS Policies:

```sql
-- Solo el dueño del perfil puede ver sus analytics
CREATE POLICY "Users can read their own analytics"
ON qr_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = qr_analytics.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Admin puede ver todo
CREATE POLICY "Admin can read all analytics"
ON qr_analytics FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users
    WHERE email = 'falcondaniel37@gmail.com'
  )
);
```

#### Servicio de tracking:

**`src/services/analyticsService.ts`**

```typescript
// Track view de página
async trackPageView(profileId: string, context: AnalyticsContext)

// Track click en link
async trackLinkClick(profileId: string, linkId: string, context: AnalyticsContext)

// Obtener analytics de un perfil
async getProfileAnalytics(profileId: string, filters: AnalyticsFilters)

// Obtener analytics agregados
async getAggregatedAnalytics(profileId: string, period: 'day' | 'week' | 'month')
```

#### Geolocalización:

**API a usar:** `ip-api.com` (gratuita, 45 req/min)

```typescript
async function getLocationFromIP(ip: string) {
  const response = await fetch(`http://ip-api.com/json/${ip}`);
  return {
    country: data.country,
    city: data.city,
    lat: data.lat,
    lon: data.lon
  };
}
```

**Nota:** Obtener IP del cliente en el edge/server para privacy.

#### Integración en páginas públicas:

**Modificar `p.$publicId.tsx` y `$alias.tsx`:**

```typescript
useEffect(() => {
  // Track view
  analyticsService.trackPageView(profile.id, {
    userAgent: navigator.userAgent,
    referrer: document.referrer
  });
}, [profile.id]);

// En cada link click
const handleLinkClick = (link: ProfileLink) => {
  analyticsService.trackLinkClick(profile.id, link.id, {
    userAgent: navigator.userAgent
  });
  
  // Abrir link
  window.open(link.url, '_blank');
};
```

---

### FASE 5: PANEL DE ADMINISTRACIÓN
**Prioridad:** P0 (crítico)  
**Tiempo estimado:** 4-5 horas

#### Arquitectura de permisos:

**Tabla `admin_users`:**
```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'admin', -- 'super_admin' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insertar super admin inicial
INSERT INTO admin_users (user_id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'falcondaniel37@gmail.com'),
  'falcondaniel37@gmail.com',
  'super_admin'
);
```

**Tabla `premium_users`:**
```sql
CREATE TABLE premium_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  tier TEXT DEFAULT 'premium', -- 'premium' | 'premium_pro'
  
  -- Origen del premium
  source TEXT DEFAULT 'admin_grant', -- 'admin_grant' | 'invitation' | 'purchase'
  granted_by UUID REFERENCES auth.users(id),
  invitation_code TEXT,
  
  -- Temporal
  expires_at TIMESTAMPTZ, -- NULL = permanente
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_premium_users_user_id ON premium_users(user_id);
CREATE INDEX idx_premium_users_email ON premium_users(email);
```

**Tabla `invitation_codes`:**
```sql
CREATE TABLE invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'PREMIUM-XXXX-XXXX'
  
  -- Configuración
  max_uses INT DEFAULT 1, -- Cuántas veces se puede usar
  current_uses INT DEFAULT 0,
  tier TEXT DEFAULT 'premium',
  duration_days INT, -- NULL = permanente
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Código expira
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
```

#### Componentes del panel:

**1. `AdminPanel.tsx` (Principal)**
```
Tabs:
  - Dashboard (métricas generales)
  - Usuarios Premium
  - Códigos de invitación
  - Demo Logos
  - Analytics Global
  - Plantillas QR (futuro)
```

**2. `AdminDashboard.tsx`**
```
Métricas:
  - Total usuarios registrados
  - Usuarios Premium activos
  - Códigos de invitación usados
  - QRs creados esta semana
  - Top 10 QRs más vistos
  - Mapa de ubicaciones (agregado)
```

**3. `PremiumUsersPanel.tsx`**
```
Features:
  - Lista de usuarios Premium
  - Filtros: tier, source, activo/expirado
  - Otorgar Premium manual
  - Revocar Premium
  - Ver analytics del usuario
  - Extender duración
```

**4. `InvitationCodesPanel.tsx`**
```
Features:
  - Lista de códigos activos/usados
  - Crear nuevo código
    - Max usos
    - Duración
    - Tier
  - Desactivar código
  - Ver quiénes usaron cada código
```

**5. `AnalyticsGlobalPanel.tsx`**
```
Visualizaciones:
  - Chart de views por día (últimos 30 días)
  - Chart de link clicks por día
  - Top enlaces más clickeados (global)
  - Mapa de ubicaciones
  - Device types (pie chart)
  - Browser distribution
```

#### Ruta del panel:

**Nueva ruta: `/admin`**
- Protegida: solo `falcondaniel37@gmail.com`
- Sidebar con tabs
- Responsive mobile

**Hook de protección:**
```typescript
// src/hooks/useIsAdmin.ts
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const adminEmail = 'falcondaniel37@gmail.com';
      setIsAdmin(user?.email === adminEmail);
      setLoading(false);
    });
  }, []);
  
  return { isAdmin, loading };
}
```

---

### FASE 6: SISTEMA DE INVITACIONES (Usuario final)
**Prioridad:** P1  
**Tiempo estimado:** 2 horas

#### Flow de canje de código:

**Componente: `InvitationRedeemDialog.tsx`**

```
Usuario en app → Ve badge "Desbloquear Premium"
  → Click → Abre dialog
    → Opción 1: "Tengo un código de invitación"
      → Input para código
      → Validar y canjear
      → Si éxito: activar Premium
    → Opción 2: "Comprar Premium" (placeholder por ahora)
```

**Servicio:**
```typescript
// src/services/invitationService.ts
async redeemInvitationCode(userId: string, code: string) {
  // 1. Validar código existe y activo
  // 2. Verificar no exceda max_uses
  // 3. Crear registro en premium_users
  // 4. Incrementar current_uses
  // 5. Retornar success
}
```

**Edge function (opcional pero recomendado):**
```typescript
// supabase/functions/redeem-invitation/index.ts
// Validación server-side para evitar fraude
```

---

### FASE 7: ACTUALIZAR ENTITLEMENTS
**Prioridad:** P0  
**Tiempo estimado:** 1 hora

#### Actualizar `src/lib/entitlements.ts`:

```typescript
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const supabase = getBrowserSupabaseClient();
  
  // Verificar si es admin
  const { data: adminData } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  // Verificar si es Premium
  const { data: premiumData } = await supabase
    .from('premium_users')
    .select('tier, expires_at')
    .eq('user_id', userId)
    .single();
  
  const isPremium = premiumData && (
    !premiumData.expires_at || 
    new Date(premiumData.expires_at) > new Date()
  );
  
  return {
    plan: isPremium ? 'premium' : 'free',
    isAdmin: !!adminData,
    canUsePremiumTemplates: isPremium,
    canUseAdvancedQR: isPremium,
    canUseDemoLogos: isPremium,
    canViewAnalytics: isPremium || !!adminData,
  };
}
```

#### Agregar cache para performance:

```typescript
const entitlementsCache = new Map<string, { data: UserEntitlements; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
```

---

## DEPENDENCIAS Y ORDEN

```
FASE 1 (Renderer)
  ↓
FASE 3 (Plantillas avanzadas) + FASE 2 (Logos) en paralelo
  ↓
FASE 4 (Analytics) + FASE 7 (Entitlements) en paralelo
  ↓
FASE 5 (Admin Panel)
  ↓
FASE 6 (Invitaciones)
```

---

## MIGRACIONES SQL NECESARIAS

1. `20260819_add_advanced_qr_fields.sql` - Campos en profiles
2. `20260819_create_demo_logos.sql` - Tabla logos
3. `20260819_create_analytics.sql` - Tabla analytics
4. `20260819_create_admin_system.sql` - Admin + Premium + Invitations
5. `20260819_seed_demo_logos.sql` - Insertar 25 logos iniciales

---

## ESTIMACIÓN TOTAL

- **Tiempo de desarrollo:** 17-21 horas
- **Fases críticas:** 1, 4, 5, 7
- **Puede hacerse en:** 2-3 días de trabajo dedicado

---

## RIESGOS Y MITIGACIONES

**Riesgo 1:** Degradados rompen escaneo
- **Mitigación:** Validación de contraste + tests manuales con múltiples scanners

**Riesgo 2:** Analytics consumen mucho storage
- **Mitigación:** Política de retención (90 días), agregación diaria

**Riesgo 3:** IP geolocation API limits
- **Mitigación:** Cache de IPs, fallback a "Unknown"

**Riesgo 4:** Fraude en códigos de invitación
- **Mitigación:** Edge function server-side, rate limiting

---

## TESTING REQUERIDO

**Fase 1:**
- [ ] QR con degradado escanea en 5 apps diferentes
- [ ] QR con neón escanea
- [ ] QR con dots rounded escanea
- [ ] Export PNG/SVG funciona

**Fase 2:**
- [ ] Logo demo se aplica correctamente
- [ ] Logo demo persiste en descarga
- [ ] Solo Premium puede elegir logo demo

**Fase 4:**
- [ ] View tracking funciona en mobile/desktop
- [ ] Link click tracking funciona
- [ ] Geolocation aproximada es correcta
- [ ] Multiple clics misma sesión se agrupan

**Fase 5:**
- [ ] Solo admin puede acceder a `/admin`
- [ ] Métricas se ven correctamente
- [ ] Otorgar Premium funciona
- [ ] Crear código de invitación funciona

**Fase 6:**
- [ ] Canjear código válido otorga Premium
- [ ] Código con max_uses se agota
- [ ] Código expirado no se puede canjear

---

## PRÓXIMOS PASOS

1. **¿Aprobar este plan?**
2. **¿Alguna modificación o prioridad diferente?**
3. **¿Comenzar con Fase 1 (Renderer)?**

