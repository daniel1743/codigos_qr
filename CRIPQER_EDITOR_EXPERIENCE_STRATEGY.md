# CRIPQER EDITOR EXPERIENCE STRATEGY

> STATUS: CANONICAL EDITOR PRODUCT STRATEGY
>
> Este documento representa la estrategia vigente del sistema de edicion
> de Cripqer.
>
> Ante contradicciones con documentos historicos sobre Basic Editor,
> Power Editor, acceso publico, acceso Premium o modelo dual de editores,
> este documento prevalece para estrategia de producto.
>
> Este documento NO autoriza implementacion.

## 1. Canonical Status

Este documento es la autoridad vigente para la estrategia de producto del sistema de edicion de Cripqer: relacion entre Basic/Quick editing, Power/Advanced editing, acceso Free/Pro, Founding Access, preservacion de documentos y experiencia de edicion.

Su alcance es estrategico. No modifica rutas, UI, entitlements, canonical persistence, billing, Supabase ni codigo fuente. No autoriza eliminar Basic Editor, liberar Power Editor, cambiar planes, cambiar comportamiento de downgrade ni redirigir usuarios.

## 2. Executive Decision

La decision final es:

> ONE EDITOR SYSTEM, TWO EXPERIENCE LEVELS.

Cripqer tendra un unico sistema oficial de edicion basado en el documento canonico, el renderer canonico y las capacidades actualmente asociadas al Power Editor.

Hacia el usuario, el producto no debe presentarse como una eleccion entre "Basic Editor" y "Power Editor". Debe presentarse como:

- `Editar pagina`
- `Edicion rapida`
- `Diseno avanzado`

Basic Editor y Power Editor no deben evolucionar como dos productos independientes que compiten entre si. La simplicidad de Basic se conserva como experiencia Quick Edit. La potencia de Power se conserva como experiencia Advanced Edit.

## 3. Why The Strategy Changed

La estrategia historica de dos editores resolvia una necesidad real de transicion: proteger el editor existente mientras se preparaba el documento canonico y el Power Editor. Pero mantener dos productos de edicion independientes a largo plazo crea problemas:

- duplica mantenimiento;
- duplica UX;
- duplica bugs;
- crea dudas sobre cual editor usar;
- aumenta riesgo de divergencia;
- complica persistencia;
- complica Engine V2;
- complica monetizacion;
- puede destruir campos que un modo no entiende;
- vuelve confusa la promesa Free/Pro.

La estrategia final conserva lo bueno de ambas etapas:

- una interfaz simple para usuarios que solo quieren editar contenido y publicar;
- controles avanzados para usuarios que necesitan precision profesional;
- un mismo documento canonico;
- un mismo renderer;
- una misma fuente de verdad;
- preservacion no destructiva entre modos.

## 4. One Editor System

El sistema oficial debe seguir este modelo:

```text
ONBOARDING
    ↓
ENGINE V2
    ↓
CANONICAL DOCUMENT
    ↓
┌───────────────────────────┐
│                           │
↓                           ↓
QUICK EDIT             ADVANCED EDIT
simple UX              full controls
│                           │
└────────────┬──────────────┘
             ↓
     SAME CANONICAL DATA
             ↓
        SAME RENDERER
             ↓
          PUBLISH
```

Invariantes:

- un solo documento canonico;
- un solo renderer de produccion;
- un solo modelo de persistencia;
- Engine V2 produce el mismo documento que ambos modos editan;
- Quick y Advanced preservan los campos que no controlan;
- cambiar de modo no destruye configuracion;
- no hay bifurcacion de datos entre editores.

## 5. Quick Edit Experience

Nombre recomendado para usuario: `Edicion rapida`.

Proposito: ofrecer una experiencia simple, clara y de baja friccion para personas que solamente necesitan modificar contenido y estilos esenciales.

Quick Edit puede cubrir:

- contenido;
- avatar y banner;
- bio;
- links;
- WhatsApp;
- redes sociales;
- servicios basicos;
- imagenes;
- botones;
- tarjetas;
- colores esenciales;
- tipografia esencial;
- ordenamiento;
- publicacion.

Regla arquitectonica: Quick Edit no debe convertirse en un segundo documento, segundo renderer, segundo motor ni producto independiente. Es una experiencia simplificada sobre el mismo sistema canonico.

## 6. Advanced Edit Experience

Nombre recomendado para usuario: `Diseno avanzado`.

Proposito: exponer controles profesionales y de mayor precision para usuarios que necesitan mas control visual, responsive y comercial.

Advanced Edit puede incluir:

- tipografia avanzada;
- layouts avanzados;
- responsive manual;
- motion;
- efectos premium;
- controles avanzados de cards/buttons;
- secciones premium;
- bloques premium;
- templates premium;
- controles profesionales adicionales.

Advanced Edit no debe ser una pared intimidante de controles. Debe ser el modo para usuarios que quieren mas capacidad y estan listos para manejar mas precision.

## 7. Free Product Philosophy

Free debe permitir crear y publicar una pagina genuinamente profesional, util y atractiva.

Free no debe:

- parecer deliberadamente malo;
- llenar toda la interfaz de candados;
- mostrar decenas de controles inutilizables;
- usar frustracion como principal mecanismo de upgrade;
- obligar al usuario a pagar para obtener una pagina minimamente digna.

Free resuelve el problema basico del usuario. Pro amplia lo que puede hacer, no repara una experiencia intencionalmente incompleta.

## 8. Pro Product Philosophy

Pro representa mas capacidad, mas control profesional y mas valor de conversion.

Pro no es:

- solamente mas colores;
- solamente mas efectos;
- solamente quitar candados;
- una pagina Free deliberadamente degradada.

Valor futuro de Pro puede incluir:

- control avanzado de diseno;
- responsive avanzado;
- capacidades comerciales avanzadas;
- analytics superiores;
- campanas;
- integraciones;
- tracking de conversion;
- automatizacion;
- branding removal;
- capacidades avanzadas de paginas.

Pro debe vender valor real: mejor control, mayor capacidad y mas posibilidad de convertir. No debe depender de hacer sentir insuficiente a Free.

## 9. Progressive Disclosure

El usuario Free no debe entrar al editor y encontrarse inmediatamente con una pared de funciones Premium bloqueadas.

Regla UX:

> Mostrar primero los controles utiles para su contexto y revelar opciones avanzadas de manera progresiva.

Ejemplo:

Al editar un boton, Free ve los controles normales disponibles. Una opcion discreta como `Mas opciones de diseno` puede revelar capacidades avanzadas identificadas claramente como Pro.

Evitar:

- 20+ candados simultaneos;
- tooltips de upgrade por toda la interfaz;
- controles disabled dominando la experiencia;
- interrupciones constantes de monetizacion;
- convertir el editor en un catalogo de cosas que el usuario no puede tocar.

## 10. Founding / Beta Access

Founding Access queda aprobado como estrategia para etapa inicial.

Nombre preferido: `Founding Access`.

Alternativas aceptables: `Early Access`, `Beta Pro Access`.

Principio:

Durante la etapa inicial de Cripqer, los primeros usuarios pueden recibir acceso completo a las capacidades Pro para permitir validacion real del producto.

Mensaje sugerido:

> Estas usando Cripqer durante nuestra etapa inicial. Como uno de nuestros primeros usuarios, tienes acceso completo a las herramientas Pro mientras construimos y validamos la plataforma.

Objetivos:

- observar que capacidades realmente utiliza la gente;
- validar Power/Advanced Editor;
- detectar funciones consideradas esenciales;
- detectar capacidades por las que existiria disposicion a pagar;
- validar responsive;
- validar guardado;
- validar reopen;
- validar publish;
- validar estabilidad.

Regla importante: no cerrar definitivamente la matriz Free/Pro solo por hipotesis internas antes de recopilar uso real de usuarios tempranos.

## 11. Downgrade & Preservation

Principio no negociable:

> Cambiar de plan o terminar Founding Access nunca debe destruir el trabajo del usuario.

Comportamiento requerido:

- preservar configuracion Premium almacenada;
- no borrar efectos;
- no reemplazar config por defaults Free;
- no destruir layout;
- no sanitizar destructivamente el canonical document.

Comportamiento futuro permitido:

- bloquear modificacion de una capacidad Premium;
- mostrar upgrade para editar esa capacidad;
- preservar el valor almacenado.

Decision abierta:

La politica exacta sobre si una capacidad Premium ya publicada continua renderizandose despues de un downgrade debe definirse por separado antes de monetizacion general.

Hasta que exista esa decision, no asumir comportamiento destructivo.

## 12. Mobile Experience

Mobile is first-class.

En movil, Cripqer puede priorizar Quick Edit o controles contextuales simplificados sin cambiar de motor ni documento.

Regla:

> Simplificar interfaz no significa limitar arquitectura.

Los controles avanzados pueden seguir siendo accesibles mediante inspector, sheets, drawers o modos especializados cuando la experiencia tactil lo permita.

El objetivo movil no es mostrar toda la complejidad de escritorio al mismo tiempo. Es permitir crear, editar, guardar, reabrir, publicar y corregir sin romper el documento canonico.

## 13. Engine V2 Relationship

Engine V2 genera la pagina. El editor permite refinamiento humano.

Flujo:

1. Usuario explica negocio/objetivo.
2. Onboarding recopila contexto util.
3. Engine V2 crea un canonical document valido.
4. Usuario ve resultado.
5. Puede hacer Edicion rapida.
6. Puede entrar a Diseno avanzado.
7. Ambos operan sobre el mismo documento.
8. Se publica con el mismo renderer.

Lenguaje a evitar:

- `elige Basic Editor`;
- `elige Power Editor`.

Lenguaje preferido:

- `Editar contenido`;
- `Personalizar diseno`;
- `Edicion rapida`;
- `Diseno avanzado`.

## 14. Canonical Architecture

El documento canonico y el renderer canonico son la base del sistema.

Reglas:

- no crear un segundo production renderer;
- no crear un segundo production engine;
- no crear un segundo production canonical document;
- no crear una persistencia paralela para Quick Edit;
- no interpretar la simplicidad UX como una razon para guardar datos mas pobres;
- no permitir que Quick Edit destruya campos avanzados;
- no permitir que Advanced Edit rompa datos basicos del perfil.

La arquitectura debe permitir que un documento creado por Engine V2 sea refinado en Quick Edit o Advanced Edit sin conversion destructiva.

## 15. Product UX Principles

Principios oficiales:

- Simplicity without architectural duplication.
- Capability without intimidation.
- Free must be genuinely useful.
- Pro adds value; it does not repair artificial limitations.
- Progressive disclosure over lock-wall UX.
- Preserve user data.
- One canonical system.
- Mobile is first-class.
- Functionality before visual polish.
- Validate monetization with real behavior.

## 16. What Must Not Be Built

No construir:

- dos editores como productos independientes;
- un segundo renderer de produccion para Quick Edit;
- un segundo modelo de persistencia para Free;
- una version Free deliberadamente degradada;
- un Power Editor lleno de controles bloqueados como principal experiencia Free;
- una monetizacion basada en frustracion constante;
- una migracion destructiva al cambiar de plan;
- un clon de Canva o Figma como destino estrategico del editor;
- una carrera infinita de efectos visuales que no ayuden a crear, publicar o convertir.

El editor es infraestructura de creacion dentro del sistema de conversion. No es el moat completo del producto.

## 17. Relationship With Existing Documentation

| Document                                              | Relevant historical statement                                                         | Current relationship                                                                                                                                                | Status                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `CRIPQER_PRODUCT_NORTH_STAR.md`                       | `Power Editor is the default primary editor.`                                         | Se conserva la idea de que el sistema avanzado/canonico es la base completa, pero hacia usuario existe un solo producto de edicion con experiencias Quick/Advanced. | PARTIAL_OVERLAP; strategy refined here. |
| `README_PRODUCT_STRATEGY.md`                          | Free usa Quick/Basic; Pro incluye Power Editor. Free debe ser atractivo y publicable. | Compatible con esta estrategia, pero se redefine como un solo sistema con dos niveles de experiencia, no dos productos separados.                                   | COMPLEMENTARY.                          |
| `CRIPQER_DUAL_EDITOR_ARCHITECTURE.md`                 | `Basic Editor remains the public editor`; Power puede ser futuro/privado.             | Superado como estrategia final. Fue correcto como etapa de transicion.                                                                                              | SUPERSEDED_FOR_EDITOR_STRATEGY.         |
| `CRIPQER_PRODUCT_CAPABILITY_POLICY_CORE_V1_REPORT.md` | `Power Editor access is public to all tiers`; capabilities se gatean por policy.      | Se mantiene la distincion acceso vs capabilities. Founding Access puede habilitar todo temporalmente. La matriz final Free/Pro sigue abierta.                       | COMPLEMENTARY_WITH_OPEN_DECISIONS.      |
| `CRIPQER_OFFICIAL_PRODUCT_VISION.md`                  | Cripqer compite contra perdida de oportunidades, no contra Linktree.                  | Este documento aplica esa vision al editor: el editor crea la experiencia de conversion, pero no es el producto completo.                                           | SUBORDINATE_DOMAIN_CANON.               |
| `CRIPQER_ENGINE_POWER_EDITOR_MIGRATION_PLAN.md`       | Premium gating debe gatear acceso/controles sin mutar canonical config.               | Compatible con preservacion no destructiva; no autoriza implementacion.                                                                                             | HISTORICAL / TECHNICAL.                 |
| `CRIPQER_POWER_EDITOR_PRIMARY_ROUTING_REPORT.md`      | Canonical valid profile abre Power; legacy Basic queda Basic.                         | Describe una etapa tecnica de ruteo. Estrategicamente debe converger hacia un solo producto UX Quick/Advanced.                                                      | HISTORICAL / TECHNICAL.                 |

## 18. Superseded Decisions

Decisiones superadas para estrategia de producto:

1. `Basic Editor remains the public editor; Power is future/private.`
   - Resolucion: SUPERSEDED. La simplicidad de Basic se conserva como Quick Edit, no como arquitectura/producto independiente.

2. `Power Editor is the default primary editor.`
   - Resolucion: REFINED. El sistema avanzado/Power constituye la base completa del sistema de edicion, pero el usuario no debe elegir entre productos separados. Hay un solo producto de edicion con Quick y Advanced.

3. `Power Editor access is public to all tiers` como frase aislada.
   - Resolucion: REFINED. Debe distinguirse acceso al sistema de edicion de acceso a capabilities. Durante Founding/Beta Access pueden habilitarse todas las capabilities. La matriz definitiva Free/Pro sera validada posteriormente.

4. `Free vs Pro` decidido solo por locks visuales.
   - Resolucion: SUPERSEDED. Free debe ser util y profesional; Pro agrega capacidad y valor, no repara una experiencia artificialmente mala.

Estas decisiones no deben borrarse de la historia. Deben leerse como etapas de transicion hacia el sistema unificado.

## 19. Open Decisions

Siguen abiertas:

- matriz final exacta Free vs Pro;
- duracion de Founding Access;
- que ocurre con rendering Premium despues de downgrade;
- precio final;
- limites cuantitativos por tier;
- que capacidades de conversion seran Pro vs Business;
- comunicacion comercial final para Early/Founding users;
- si algunos controles avanzados deben estar visibles, escondidos o revelados por contexto en Free;
- politica final de publicacion de contenido Premium ya publicado tras cambio de plan.

No inventar una respuesta para decisiones que necesitan datos de uso o decision comercial posterior.

## 20. Canonical Summary

Cripqer debe tener un solo sistema de edicion.

Ese sistema ofrece:

- Quick Edit para simplicidad;
- Advanced Edit para control profesional;
- mismo documento canonico;
- mismo renderer;
- misma persistencia;
- Free util;
- Pro con mayor capacidad;
- progressive disclosure en vez de pared de candados;
- Founding Access completo durante validacion temprana;
- preservacion no destructiva del trabajo del usuario.

THIS DOCUMENT DOES NOT AUTHORIZE IMPLEMENTATION.

La estrategia describe el destino de producto y arquitectura.

No debe:

- eliminarse Basic Editor todavia;
- redirigirse ninguna ruta;
- liberarse Power Editor;
- cambiarse entitlement;
- modificarse UI;
- cambiarse canonical persistence;
- cambiarse billing;

sin una tarea de implementacion separada, explicita y acotada.
