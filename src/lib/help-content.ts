/**
 * Ayuda y soporte — FUENTE CANÓNICA del conocimiento de Cripqer.
 *
 * Única fuente de verdad del contenido de ayuda/FAQ:
 *   - La página /help (src/routes/help.tsx) renderiza las preguntas y respuestas desde aquí.
 *   - El Asistente de ayuda (src/lib/support-assistant) construye su conocimiento desde
 *     este mismo archivo (ver knowledge.server.ts).
 *   - La FAQ pública de la landing (CripqerLanding.tsx, LANDING_FAQ_IDS) resuelve sus
 *     artículos por id con getHelpArticle().
 *
 * No dupliques estas respuestas en otro archivo: si algo cambia, se cambia aquí y tanto
 * la FAQ visible como el asistente quedan sincronizados por construcción.
 *
 * Estructura: categorías → artículos (FAQ). Cada artículo incluye `keywords` para que el
 * buscador de /help entienda sinónimos y el asistente reconozca preguntas parafraseadas.
 *
 * Ningún dato inventado: cada respuesta describe comportamiento real del app verificado
 * en este repo. Cuando una función todavía no existe, su artículo vive en la categoría
 * `limites` y lo dice — no se promete como si estuviera disponible.
 */

export type HelpCategory = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

export type HelpArticle = {
  id: string;
  category: string;
  question: string;
  answer: string;
  /** Sinónimos y términos extra para el buscador y las paráfrasis. */
  keywords?: string[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "primeros-pasos",
    label: "Primeros pasos",
    description: "Empieza con tu página y tu QR",
    icon: "rocket",
  },
  {
    id: "mi-pagina",
    label: "Mi página",
    description: "Contenido, enlaces y publicación",
    icon: "layout",
  },
  {
    id: "codigos-qr",
    label: "Códigos QR",
    description: "Creación y descarga",
    icon: "qr",
  },
  {
    id: "personalizacion",
    label: "Personalización",
    description: "Colores, textos y estilo",
    icon: "palette",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Visitas y escaneos",
    icon: "chart",
  },
  {
    id: "documentos",
    label: "Documentos",
    description: "Archivos protegidos con contraseña",
    icon: "lock",
  },
  {
    id: "cuenta-planes",
    label: "Cuenta y planes",
    description: "Tu cuenta y qué incluye cada plan",
    icon: "user",
  },
  {
    id: "limites",
    label: "Lo que aún no está",
    description: "Funciones todavía en preparación",
    icon: "alert",
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Primeros pasos ───────────────────────────────────────────────
  {
    id: "what_is_cripqer",
    category: "primeros-pasos",
    question: "¿Cripqer es un generador de QR?",
    answer:
      "Sí, pero es mucho más que eso. El QR es el punto de acceso: lo que creas con Cripqer es la página que aparece después del escaneo, y puedes editarla, personalizarla y medirla cuando quieras. Como el QR apunta a tu página y no a su contenido, puedes cambiar textos, fotos y enlaces sin imprimir un QR nuevo.",
    keywords: ["qr", "generador", "codigo qr", "dinamico", "que es", "solo qr"],
  },
  {
    id: "need_design_or_code",
    category: "primeros-pasos",
    question: "¿Necesito saber de diseño o programación?",
    answer:
      "No. Cripqer está pensado para que puedas crear y editar tu página de forma visual, sin escribir código. Puedes comenzar con un diseño listo y personalizar textos, colores, imágenes, botones y secciones a tu manera.",
    keywords: ["programar", "programacion", "codigo", "diseno", "html", "css", "no se programar"],
  },
  {
    id: "start_from_zero",
    category: "primeros-pasos",
    question: "¿Cómo empiezo desde cero?",
    answer:
      "Crea tu cuenta y comienza con «Crear mi página». Cripqer te ayudará a partir de una página inicial que luego puedes personalizar en el editor. Cuando esté lista, publícala para que otros puedan verla y usa su enlace o su código QR.",
    keywords: ["empezar", "comenzar", "crear cuenta", "nuevo", "primera pagina", "registro"],
  },
  {
    id: "edit_after_print",
    category: "primeros-pasos",
    question: "¿Puedo cambiar el contenido después de imprimir el QR?",
    answer:
      "Sí. Esa es una de las principales ventajas de los QR dinámicos de Cripqer. Puedes modificar textos, imágenes, enlaces, productos o secciones de tu página y el QR impreso seguirá llevando al contenido publicado más reciente.",
    keywords: ["imprimir", "impreso", "tarjetas", "afiches", "cambiar contenido", "actualizar"],
  },
  // ── Mi página ────────────────────────────────────────────────────
  {
    id: "edit_page",
    category: "mi-pagina",
    question: "¿Cómo edito mi página?",
    answer:
      "Entra a «Mi página» y selecciona «Editar mi página». Se abrirá el editor visual de Cripqer, donde puedes modificar el contenido y el diseño directamente sobre la página. Cuando termines, guarda y pulsa «Publicar» para que los cambios se vean al escanear el QR.",
    keywords: ["editar", "editor", "mi pagina", "modificar", "diseno", "cambiar pagina"],
  },
  {
    // El mecanismo real es borrador/publicado, no una caché del navegador: la página
    // pública sirve publicado_template_config y nunca el borrador (ver
    // routes/pg.$publicId.tsx y public-entry-resolution/PUBLISHING_POLICY.md). La única
    // caché real es el service worker (public/sw.js), network-first, que solo responde
    // con copia guardada si falla la red.
    id: "changes_not_visible",
    category: "mi-pagina",
    question: "¿Por qué no veo mis cambios al escanear el QR?",
    answer:
      "Porque mientras editas, los cambios se guardan como borrador y tus visitantes siguen viendo la última versión publicada. Usa el botón «Publicar» del editor para hacerlos visibles: la página pública nunca muestra el borrador. La vista previa del editor sí te muestra tus cambios recientes. Si quien escanea está sin conexión, su navegador puede mostrarle una copia guardada para funcionar offline.",
    keywords: [
      "no veo cambios",
      "muestra viejo",
      "antiguo",
      "no se actualiza",
      "publicar",
      "guardar",
      "borrador",
      "cache",
    ],
  },
  {
    // La contraseña existe, pero solo para los documentos cifrados (sección Documentos,
    // validada en servidor en routes/d.$shortUrl.tsx). No hay contraseña para la página
    // pública ni para el perfil.
    id: "private_qr",
    category: "mi-pagina",
    question: "¿Puedo compartir algo privado con un QR?",
    answer:
      "Sí, con la sección «Documentos»: subes un archivo y lo proteges con contraseña, que se valida en el servidor antes de permitir la descarga. Tu página pública, en cambio, no admite contraseña: lo que compartes por QR como página lo ve cualquiera que tenga el enlace.",
    keywords: ["privado", "protegido", "contrasena", "seguro", "documentos", "confidencial"],
  },
  {
    // Lista real del BlockPicker (isolated/magic-page-editor/data/blockKit.ts). Los
    // productos no son un bloque propio: viven en «Colección» y «Catálogo».
    id: "page_sections",
    category: "mi-pagina",
    question: "¿Qué secciones puedo añadir a mi página?",
    answer:
      "Puedes añadir Botón, Portada, Perfil, Texto, Enlaces/CTA, Redes sociales, Separador, Imagen, Galería, Vídeo, Colección, Tarjetas de imagen, Reseñas, Servicios, Llamado a la acción, WhatsApp, Contacto, Ubicación y Catálogo. Los productos y los servicios se muestran dentro de «Colección» y «Catálogo».",
    keywords: [
      "secciones",
      "bloques",
      "anadir",
      "contenido",
      "galeria",
      "botones",
      "productos",
      "servicios",
      "catalogo",
      "que puedo poner",
    ],
  },
  {
    // Verificado: el detalle de página expone «Despublicar» (routes/pages.$pageId.tsx) y
    // la página pública no resuelve nada si no hay versión publicada.
    id: "unpublish_page",
    category: "mi-pagina",
    question: "¿Puedo despublicar mi página?",
    answer:
      "Sí. En el detalle de tu página encontrarás el botón «Despublicar»: mientras esté despublicada, ni el enlace ni el QR mostrarán tu página. Puedes volver a publicarla cuando quieras y el QR seguirá siendo el mismo.",
    keywords: ["despublicar", "ocultar", "quitar de linea", "no visible", "pausar"],
  },
  {
    // Verificado en lib/url.ts: el QR codifica el public_id permanente; el alias
    // (/pg/a/{slug}) es solo para compartir.
    id: "custom_vs_permanent_link",
    category: "mi-pagina",
    question: "¿Qué diferencia hay entre mi enlace personalizado y mi enlace permanente?",
    answer:
      "El enlace permanente se basa en el identificador de tu página y nunca cambia. El personalizado es un alias más corto y reconocible para compartir: puedes cambiarlo cuando quieras sin romper nada, porque tu QR impreso apunta siempre al enlace permanente.",
    keywords: [
      "alias",
      "slug",
      "enlace personalizado",
      "enlace permanente",
      "url",
      "cambiar enlace",
    ],
  },
  // ── Códigos QR ───────────────────────────────────────────────────
  {
    // La sección del menú se llama «QR» (app-shell/DesktopSidebar.tsx), no «QR Studio»:
    // ese nombre solo existe en el código interno.
    id: "download_qr",
    category: "codigos-qr",
    question: "¿Dónde descargo mi código QR?",
    answer:
      "En la sección «QR» de la navegación principal, titulada «Tu código QR»: ahí puedes personalizar el diseño, guardarlo y descargar el código para imprimirlo o usarlo en tarjetas, afiches, empaques y redes sociales. El QR siempre apunta a tu página, así que no se desactualiza cuando editas el contenido.",
    keywords: ["descargar", "descarga", "qr", "imprimir", "exportar", "donde descargo"],
  },
  {
    id: "qr_formats",
    category: "codigos-qr",
    question: "¿En qué formatos puedo descargar mi código QR?",
    answer:
      "En PNG, para usarlo en digital o en materiales caseros, y en SVG, que es vectorial y se puede escalar sin perder calidad, ideal para imprenta. Eliges el formato en el momento de la descarga.",
    keywords: ["png", "svg", "formato", "formatos", "calidad", "vector", "imprenta"],
  },
  {
    // Verificado en el editor de QR: «Cambia el dibujo, no el destino».
    id: "qr_design",
    category: "codigos-qr",
    question: "¿Si cambio los colores o el diseño de mi QR, deja de funcionar?",
    answer:
      "No. El diseño cambia el dibujo del código, no su destino: puedes ajustar colores, forma y marco y el QR seguirá llevando a tu página. Cambia el dibujo, no el destino.",
    keywords: ["colores qr", "diseno qr", "marco", "forma", "deja de funcionar"],
  },
  {
    // Verificado: el detalle de página ofrece el panel «QR de esta página».
    id: "page_qr",
    category: "codigos-qr",
    question: "¿Dónde encuentro el QR de una página concreta?",
    answer:
      "En el detalle de la página, con la opción «QR de esta página»: se despliega un panel con el QR de esa página para personalizarlo y descargarlo.",
    keywords: ["qr de la pagina", "varias paginas", "panel qr", "qr especifico"],
  },
  {
    id: "qr_changes",
    category: "codigos-qr",
    question: "¿El QR cambia si edito mi página?",
    answer:
      "No. Puedes editar el contenido de tu página sin cambiar el QR. Mientras mantengas la misma página, el código continuará funcionando y llevará a la versión publicada más reciente. Cambiar tu enlace personalizado tampoco cambia el QR impreso.",
    keywords: ["qr cambia", "cambiar qr", "mismo qr", "nuevo qr", "reemplazar", "otro qr"],
  },
  // ── Personalización ──────────────────────────────────────────────
  {
    id: "change_colors",
    category: "personalizacion",
    question: "¿Cómo cambio los colores de mi página?",
    answer:
      "Desde el editor puedes modificar la apariencia de tu página utilizando las opciones de colores y estilos disponibles, que incluyen combinaciones preparadas para ayudarte a mantener un diseño atractivo y coherente. También puedes tocar un texto o una sección concreta para cambiar su color puntual y ver el resultado al instante en la vista previa.",
    keywords: ["colores", "color", "paleta", "estilo", "apariencia", "diseno", "cambiar color"],
  },
  {
    // Verificado de extremo a extremo: applyTemplateDefinition(current, id, keepContent)
    // en premium-template-studio/engine/TemplateFactory.ts, expuesto en la UI con el
    // interruptor «Conservar mi contenido» (components/editor/Sidebar.tsx).
    id: "change_template",
    category: "personalizacion",
    question: "¿Puedo cambiar de plantilla más adelante?",
    answer:
      "Sí. En el editor de plantillas puedes aplicar otro diseño y activar «Conservar mi contenido»: tus textos, fotos, enlaces, productos y servicios se mantienen y solo cambia la presentación. Si desactivas esa opción, el nuevo diseño llega con su propio contenido de ejemplo.",
    keywords: ["plantilla", "template", "cambiar plantilla", "diseno", "estructura", "otro diseno"],
  },
  {
    id: "own_logo",
    category: "personalizacion",
    question: "¿Puedo usar mi propio logo?",
    answer:
      "Sí. Puedes utilizar tu propio logo, fotografía o identidad visual para personalizar tu página y mantenerla alineada con tu marca o negocio: en el editor toca tu avatar o imagen de perfil para subirlo, y ajusta la forma del marco y su tamaño.",
    keywords: ["logo", "marca", "branding", "mi marca", "identidad visual", "avatar", "imagen"],
  },
  // ── Analytics ────────────────────────────────────────────────────
  {
    // Verificado en el motor de métricas: «escaneos» y «visitas» son series distintas.
    // Un qr_scan solo lo emite la ruta /q/{public_id}; una visita directa a la página
    // nunca se cuenta como escaneo.
    id: "qr_scan_analytics",
    category: "analytics",
    question: "¿Puedo saber cuántas personas escanean mi QR?",
    answer:
      "Sí. En Analytics puedes consultar el rendimiento de tu página y de tus QR. El panel distingue los escaneos de las visitas: un escaneo se cuenta cuando alguien entra desde tu código QR, y una visita directa a la página se cuenta como visita, no como escaneo. También puedes ver los clics en tus enlaces, los dispositivos, los países y el origen del tráfico.",
    keywords: [
      "escaneos",
      "estadisticas",
      "metricas",
      "cuantas personas",
      "visitas",
      "rendimiento",
    ],
  },
  {
    // Verificado: el registro es síncrono (RPC directo a qr_analytics), sin cola ni lote.
    // Lo que sí depende del plan son los widgets avanzados, que se muestran bloqueados.
    id: "realtime_analytics",
    category: "analytics",
    question: "¿Las estadísticas se actualizan en tiempo real?",
    answer:
      "Sí: las visitas y los escaneos se registran en el momento en que ocurren, sin procesamiento por lotes, y se reflejan en Analytics. Lo que sí depende de tu plan son los widgets avanzados —horas punta, comparación de periodos, dispositivos, fuentes de tráfico y geografía—, que aparecen bloqueados si tu plan no los incluye.",
    keywords: ["tiempo real", "inmediato", "latencia", "demora", "se actualizan"],
  },
  // ── Documentos ───────────────────────────────────────────────────
  {
    // Verificado: sección /encrypted-documents (subida, cifrado y contraseña) y entrega
    // con verificación de contraseña en servidor (routes/d.$shortUrl.tsx).
    id: "protect_document",
    category: "documentos",
    question: "¿Cómo protejo un documento con contraseña?",
    answer:
      "Sube el archivo desde la sección «Documentos» y define una contraseña. El documento se guarda cifrado y la contraseña se valida en el servidor antes de permitir la descarga. Cada documento tiene su propio enlace y su propio QR de acceso.",
    keywords: ["documentos", "contrasena", "proteger", "cifrado", "cifrar", "archivo", "privado"],
  },
  {
    id: "document_options",
    category: "documentos",
    question: "¿Puedo poner caducidad o límite de descargas a un documento?",
    answer:
      "Sí. Al proteger un documento puedes elegir su nivel de cifrado (Estándar, Alto o Máximo) y definir una fecha de caducidad, un número máximo de descargas, descarga única y revocación del enlace.",
    keywords: ["caducidad", "expira", "limite", "descargas", "revocar", "un solo uso", "nivel"],
  },
  {
    id: "document_privacy",
    category: "documentos",
    question: "¿Cripqer puede ver mis archivos?",
    answer:
      "El archivo se cifra y la contraseña se guarda sin estar en claro: se verifica en el servidor antes de permitir la descarga. Cripqer no comparte tus contraseñas ni tus llaves.",
    keywords: ["privacidad", "seguridad", "ver archivos", "cifrado", "confidencial"],
  },
  // ── Cuenta y planes ──────────────────────────────────────────────
  {
    id: "change_account_data",
    category: "cuenta-planes",
    question: "¿Cómo cambio mi nombre, email o foto?",
    answer:
      "Tu nombre y tu foto se cambian desde el editor de tu página, tocando tu perfil o tu avatar. En «Cuenta» puedes ver tu identidad, tus enlaces públicos (personalizado y permanente) y cerrar sesión.",
    keywords: ["nombre", "email", "correo", "foto", "perfil", "cuenta", "datos", "cambiar datos"],
  },
  {
    id: "logout",
    category: "cuenta-planes",
    question: "¿Cómo cierro sesión?",
    answer: "En «Cuenta», al final de la página, dentro del panel «Sesión»: pulsa «Cerrar sesión».",
    keywords: ["cerrar sesion", "salir", "logout", "desconectar"],
  },
  {
    // Verificado contra los entitlements reales: el núcleo gratuito incluye contenido,
    // estilo básico, bloques/plantillas estándar y publicación; en acceso anticipado los
    // controles visuales avanzados están concedidos a todos los tiers. Lo único bloqueado
    // es quitar la marca Cripqer y los widgets avanzados de analítica.
    id: "free_plan",
    category: "cuenta-planes",
    question: "¿Qué incluye el plan gratuito?",
    answer:
      "El plan gratuito está pensado para que puedas crear, publicar y compartir una página funcional de Cripqer: incluye la edición de contenido y estilo básico, los bloques y las plantillas estándar, y tu QR con las estadísticas básicas. Durante esta fase de acceso anticipado también están disponibles los controles visuales avanzados. Lo que queda reservado a planes superiores es quitar la marca Cripqer del pie de página y los widgets avanzados de analítica.",
    keywords: [
      "gratis",
      "gratuito",
      "free",
      "plan",
      "precio",
      "incluye",
      "planes",
      "cuanto cuesta",
    ],
  },
  {
    // Verificado en components/help/SupportAssistantChat.tsx (el bot prepara el
    // borrador, la persona envía) y en lib/support-assistant/ticket-rules.ts
    // (seguridad → prioridad alta automática).
    id: "how_to_get_help",
    category: "cuenta-planes",
    question: "¿Cómo pido ayuda o reporto un problema?",
    answer:
      "En «Ayuda y soporte» tienes el buscador de preguntas frecuentes y un asistente. Si el asistente no resuelve tu caso, pídele que prepare un ticket: se abre un formulario con el asunto y la descripción redactados desde la conversación, eliges la categoría (pagos, cuenta, seguridad, uso de la app u otro) y lo envías tú. Los problemas de seguridad se marcan con prioridad alta de forma automática. Puedes seguir el estado en «Mis tickets»; el correo directo de soporte todavía no está habilitado.",
    keywords: ["soporte", "ayuda", "ticket", "reclamo", "reportar", "contacto", "problema"],
  },
  // ── Lo que aún no está ───────────────────────────────────────────
  {
    // No hay flujo de recuperación en la app (Auth.tsx solo ofrece acceso y registro).
    // El asistente debe decirlo en vez de inventar un enlace.
    id: "forgot_password",
    category: "limites",
    question: "Olvidé mi contraseña, ¿cómo la recupero?",
    answer:
      "Todavía no hay un flujo de recuperación de contraseña desde la app. Estamos trabajando en ello.",
    keywords: ["olvide contrasena", "recuperar", "restablecer", "no puedo entrar", "reset"],
  },
  {
    id: "change_email",
    category: "limites",
    question: "¿Puedo cambiar el correo de mi cuenta?",
    answer:
      "Todavía no hay una opción en la app para cambiar el correo con el que te registraste. Estamos trabajando en ello.",
    keywords: ["cambiar correo", "email", "cuenta", "cambiar email"],
  },
  {
    // La eliminación de cuenta (DangerZone) existe en el prototipo pero no se portó:
    // no hay capacidad real detrás (ver routes/account.tsx).
    id: "delete_account",
    category: "limites",
    question: "¿Cómo elimino mi cuenta?",
    answer:
      "Todavía no hay una opción para eliminar tu cuenta desde la app. Estamos trabajando en ello.",
    keywords: ["eliminar cuenta", "borrar cuenta", "dar de baja", "delete account"],
  },
  {
    // El catálogo de precios de pago está vacío en el código: no hay oferta contratable,
    // así que el asistente no debe explicar un checkout que no existe.
    id: "change_plan",
    category: "limites",
    question: "¿Cómo cambio de plan o contrato uno superior?",
    answer:
      "Todavía no está disponible la contratación ni el cambio de plan desde la app. Hoy todas las funciones del editor están abiertas, incluido el acceso anticipado a los controles visuales avanzados.",
    keywords: ["cambiar plan", "upgrade", "contratar", "pagar", "suscripcion", "facturacion"],
  },
];

/** Devuelve un artículo por id (para enlazar a la FAQ desde otras vistas). */
export function getHelpArticle(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.id === id);
}

/**
 * Buscador de la FAQ: normaliza sin acentos y filtra sobre pregunta + respuesta + keywords,
 * de modo que “logo” o “programar” encuentren su artículo aunque no aparezcan literalmente
 * en la pregunta.
 */
export function searchHelpArticles(query: string): HelpArticle[] {
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const normalized = normalize(query).trim();
  if (!normalized) return HELP_ARTICLES;

  const terms = normalized.split(/\s+/);
  return HELP_ARTICLES.filter((article) => {
    const haystack = normalize(
      [article.question, article.answer, ...(article.keywords ?? [])].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
