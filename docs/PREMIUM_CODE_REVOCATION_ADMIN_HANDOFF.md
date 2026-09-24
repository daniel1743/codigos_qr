# Revocación de Códigos Premium (Admin Handoff)

Este documento describe cómo gestionar y revocar el acceso a Premium, ya sea invalidando códigos no utilizados o revocando el acceso a cuentas que ya canjearon un código.

---

## 1. Desactivar un Código (Revocar código no utilizado)

**Descripción:**
Evita que un código que aún no ha sido utilizado pueda ser canjeado en el futuro. Es un proceso reversible (se puede reactivar si se desea, siempre que `current_uses < max_uses`).

**Acción Futura en Panel Admin:** "Desactivar código"

**Mecanismo Canónico:**
Modificar la columna `is_active` en la tabla `invitation_codes`.

### Ejemplo SQL (Desactivar)
```sql
UPDATE public.invitation_codes
SET is_active = false
WHERE id = '<CODE_ID>';
```

### Ejemplo SQL (Reactivar)
```sql
UPDATE public.invitation_codes
SET is_active = true
WHERE id = '<CODE_ID>'
  AND current_uses < max_uses;
```

---

## 2. Revocar Premium a Usuario (Revocar Premium ya canjeado)

**Descripción:**
Elimina el acceso Premium otorgado previamente a un usuario que ya canjeó un código. 

**Acción Futura en Panel Admin:** "Revocar Premium"

**Sistema Actual:** 
Actualmente, el sistema administra esto en la tabla `premium_users`.

**Comportamiento Actual:**
La implementación administrativa actual de Premium elimina completamente (DELETE) la fila del usuario en `premium_users`.

**Nota para Futura Documentación (Admin Audit):**
Antes de construir el sistema final de auditoría/historial en el Panel de Administración, considere evolucionar esto a una *revocación suave* o lógica (por ejemplo, agregando columnas como `revoked_at`, `revoked_by` o `reason`) en lugar de eliminar el registro. De esta manera, se preserva la evidencia histórica de que el usuario tuvo Premium y fue revocado.

---

## Entidades y Estados Adicionales Documentados
El futuro Panel de Administración debe permitir visualizar y gestionar los siguientes datos relacionados:

- **Código:** El texto del código (`code`).
- **Estado:** Activo/Inactivo (`is_active`), Expirado, Agotado.
- **Usos actuales:** `current_uses`.
- **Límite de usos:** `max_uses`.
- **Duración:** `duration_days` (NULL = Vitalicio, 365 = 1 año).
- **Usuario redimido / Email:** A quién se le otorgó (join con `premium_users`).
- **Fuente de redención:** `source` en `premium_users`.
- **Expiración de Premium:** `expires_at` en `premium_users`.
- **Futura Acción "Revocar":** Explicado en Nivel 2.
- **Futura Acción "Reactivar":** Explicado en Nivel 1.
