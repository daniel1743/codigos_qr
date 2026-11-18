import type { AgentResponse, BusinessContext, ChatMessage, ChatOption } from "../types/cripqer";

export type SalesObjection =
  | "already_competitor"
  | "parity"
  | "skepticism"
  | "price"
  | "convince"
  | "reject";

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function detectSalesObjection(input: string): SalesObjection | null {
  const value = normalize(input);
  const mentionsCompetitor = /linktree|lintri|beacons|otra plataforma|otras/.test(value);

  if (/no me interesa|no quiero registr|no voy a cambiar|prefiero quedarme|no necesito/.test(value)) {
    return "reject";
  }
  if (/debo pagar|tengo que pagar|hay que pagar|es gratis|gratis|precio|costo|cuanto cuesta|no tengo dinero/.test(value)) {
    return "price";
  }
  if (mentionsCompetitor && /eso tambien lo hace|tambien lo hace|que ofrece.*no|que tiene.*no|todo eso/.test(value)) {
    return "parity";
  }
  if (mentionsCompetitor && /ya tengo|uso |pertenezco|migrar|cambiar|por que cambiar|porque cambiar/.test(value)) {
    return "already_competitor";
  }
  if (/convenceme|convenceme|dame una razon|por que elegir|vale la pena probar/.test(value)) {
    return "convince";
  }
  if (/no me convence|no me convences|no estoy convenc|no veo ninguna razon|no has dicho nada|nada excepcional|no es excepcional/.test(value)) {
    return "skepticism";
  }
  return null;
}

function options(...options: ChatOption[]): AgentResponse["actions"] {
  return [{ type: "SHOW_OPTIONS", options }];
}

function needLabel(context: BusinessContext): string {
  if (context.primaryGoal === "sales" || context.primaryGoal === "orders") return "vender o recibir pedidos";
  if (context.primaryGoal === "appointments" || context.primaryGoal === "bookings" || context.primaryGoal === "reservations") return "recibir reservas o citas";
  if (context.primaryGoal === "leads") return "conseguir contactos";
  return "ordenar tu presencia y facilitar el contacto";
}

export function buildSalesObjectionResponse(
  objection: SalesObjection,
  context: BusinessContext,
  history: ChatMessage[] = [],
): AgentResponse {
  const hasPreviousCommercialAnswer = history.some(
    (message) => message.role === "assistant" && /gratis|qr|whatsapp|metricas|landing|linktree/i.test(message.text),
  );

  switch (objection) {
    case "already_competitor":
      return {
        text: "No necesitas cambiar por cambiar. Si Linktree ya te sirve para listar enlaces, está cumpliendo su función; Cripqer encaja cuando quieres convertir ese enlace en una presentación comercial más guiada, con tu propuesta, contacto/WhatsApp, QR editable y métricas básicas en el mismo destino. La comparación justa es qué experiencia quieres que tenga tu visitante, no qué logo aparece en la bio.",
        actions: options(
          { label: "Comparar funciones", message: "¿Qué diferencia real hay?" },
          { label: "Ver diseños", message: "Muéstrame diseños" },
        ),
      };
    case "parity":
      return {
        text: `Tienes razón: reunir enlaces, personalizar una página y mostrar métricas no son funciones exclusivas de Cripqer. La razón para elegirlo no es una promesa aislada, sino el encaje: una página comercial guiada para presentar ${needLabel(context)}, llevar a un contacto claro desde redes o QR y empezar con las capacidades base gratuitas. Si tu prioridad es otra, también puede convenirte mantener tu herramienta actual.`,
        actions: options(
          { label: "Explorar diferencias", message: "¿Qué diferencia práctica aporta Cripqer?" },
          { label: "Resolver mis dudas", message: "Tengo otra duda comercial" },
        ),
      };
    case "skepticism":
      return {
        text: hasPreviousCommercialAnswer
          ? "Es válido: una lista de funciones no basta para decidir. La prueba concreta sería preparar una página base con tu propio objetivo, revisar si el recorrido hacia el contacto queda más claro y medir el interés básico; si no te aporta, no tienes por qué cambiar. ¿Qué tendría que mejorar para que te resultara útil: la presentación, el contacto o la medición?"
          : `Te entiendo. No tendría sentido pedirte que cambies solo porque suena bien; la razón concreta es que puedes convertir tu perfil en un destino ordenado para ${needLabel(context)}, probar una página base y comprobar si el recorrido hacia el contacto se entiende mejor. ¿Qué parte necesitas evaluar primero: presentación, contacto o métricas?`,
        actions: options(
          { label: "Ver diseños", message: "Muéstrame diseños" },
          { label: "Resolver mis dudas", message: "Quiero resolver mis dudas" },
        ),
      };
    case "price":
      return {
        text: "No necesitas pagar para validar si Cripqer te sirve: el nivel gratuito incluye crear, editar y publicar una página base. Las métricas básicas están disponibles cuando la analítica está habilitada; las funciones avanzadas y sus precios dependen de la configuración vigente. Antes de hablar de registro, dime qué necesitas además de la página base para comprobar si el nivel gratuito te alcanza.",
        actions: options(
          { label: "Qué incluye gratis", message: "¿Qué incluye exactamente lo gratis?" },
          { label: "Explorar diferencias", message: "¿Qué diferencia práctica aporta Cripqer?" },
        ),
      };
    case "convince":
      return {
        text: `Te doy una razón comprobable, no una promesa: Cripqer reúne presentación, contacto, distribución por QR y métricas básicas en una página que puedes editar, y el nivel gratuito permite probar la base sin pagar. Si tu necesidad es ${needLabel(context)}, esa combinación puede ser una mejor decisión que seguir enviando a la gente a enlaces dispersos; lo correcto es probarla con tu caso.`,
        actions: options(
          { label: "Ver diseños", message: "Muéstrame diseños" },
          { label: "Crear mi página", message: "Quiero crear mi página" },
        ),
      };
    case "reject":
      return {
        text: "Entendido. No tienes que registrarte ni cambiar de herramienta ahora. Si más adelante quieres comparar una necesidad concreta —contacto, presentación, QR o métricas básicas— puedo ayudarte a revisarla sin presión.",
        actions: [],
      };
  }
}

export function salesObjectionGuidance(question: string, history: ChatMessage[] = []): string {
  const objection = detectSalesObjection(question);
  if (!objection) return "";
  const priorAnswers = history.filter((message) => message.role === "assistant").length;
  return [
    `OBJECIÓN COMERCIAL DETECTADA: ${objection}.`,
    "Resuelve primero la duda que bloquea la decisión; no cierres con registro ni repitas la línea gratuita automáticamente.",
    objection === "parity"
      ? "Reconoce que las funciones comunes no son exclusivas. Diferencia por encaje, recorrido comercial y combinación de capacidades confirmadas, no por una exclusividad inventada."
      : objection === "already_competitor"
        ? "No ataques la alternativa ni ordenes migrar. Explica cuándo Cripqer complementa o puede ser mejor decisión y propone comparar o ver un diseño."
        : objection === "price"
          ? "Explica el alcance gratuito confirmado y pregunta qué capacidad necesita antes de hablar de planes. No inventes precios."
          : objection === "reject"
            ? "Respeta el rechazo y no muestres CTA de registro. Deja abierta una ayuda futura sin insistir."
            : "Presenta un beneficio verificable y, si falta información, formula una sola pregunta de descubrimiento útil.",
    `Ya hubo ${priorAnswers} respuesta(s) del asistente: evita repetir el mismo argumento o la misma pregunta.`,
  ].join("\n");
}
