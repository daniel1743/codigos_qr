# 14. Catálogo de Plataformas y Correcciones Auth (QR-UI-12 & QR-UI-11B)

## 1. Correcciones de Autenticación (Auth)
- **Funcionalidad de Contraseña**: Se integró el toggle de visibilidad (icono de ojo) para la contraseña, con el estado showPassword.
- **Registro Extendido**: Se añadieron los campos de Nombre completo (con icono de User) y Términos y condiciones (checkbox obligatorio) **solo en modo registro**.
- **Envío de Metadatos**: El nombre se envía a Supabase bajo options: { data: { full_name: name } }.
- Todo resuelto de forma segura sin requerir migraciones de base de datos extra.

## 2. Catálogo de Plataformas
- **Catálogo Unificado**: Se creó src/constants/platforms.ts incluyendo ~35 redes sociales y plataformas organizadas en categorías (Populares, Mensajería, Música, Profesional, Contacto, etc).
- **Componente Buscador**: Se implementó PlatformPicker.tsx (basado en Radix Command/Combobox) que permite al usuario buscar y filtrar opciones al instante sin una lista abrumadora.
- **Autofill Inteligente**: Al elegir una plataforma, el label de texto se rellena automáticamente solo si el usuario no lo ha personalizado.
- **Integración Global**: El componente PlatformPicker fue integrado tanto en LinksSection.tsx (sidebar) como en ContextualToolbar.tsx (editor flotante).
- **Fallback Estables**: Se mantuvo la compatibilidad con perfiles antiguos, las plataformas desconocidas caen en la opción "Enlace personalizado" y el máximo de 8 enlaces sigue protegido.
