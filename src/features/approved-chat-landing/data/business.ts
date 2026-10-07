import type { ChannelId, ChatOption, TemplateId } from '../types/cripqer';

export interface BusinessType {
  id: string;
  label: string;
  keywords: string[];
  /** Default goal. `null` means it's genuinely ambiguous and worth one question. */
  goal: string | null;
  goalQuestion?: string;
  goalOptions?: ChatOption[];
  recommended: TemplateId[];
  showcaseLine: string;
  tagline: string;
}

export const businessTypes: BusinessType[] = [
{
  id: 'real_estate',
  label: 'Inmobiliaria',
  keywords: ['inmobiliari', 'corredor de propiedades', 'corredora de propiedades', 'bienes raices', 'agente de propiedades', 'propiedades'],
  goal: null,
  goalQuestion: '¿Quieres principalmente mostrar propiedades o conseguir personas interesadas?',
  goalOptions: [
  { label: 'Mostrar propiedades', message: 'Quiero mostrar mis propiedades' },
  { label: 'Conseguir clientes', message: 'Quiero conseguir clientes' }],

  recommended: ['professional_trust', 'visual_portfolio', 'minimal_premium'],
  showcaseLine: 'Para propiedades funciona algo que dé confianza y deje lucir las fotos. Puedo adaptar cualquiera de estos estilos a lo que haces.',
  tagline: 'Encuentra una propiedad que encaje contigo.'
},
{
  id: 'bakery',
  label: 'Pastelería',
  keywords: ['pasteleria', 'pastel', 'torta', 'reposteria', 'postre', 'cupcake', 'panaderia'],
  goal: 'orders',
  recommended: ['food_story', 'soft_beauty', 'local_friendly'],
  showcaseLine: 'Para una pastelería haría algo muy visual, con tus productos como protagonistas.',
  tagline: 'Tortas personalizadas para cada celebración.'
},
{
  id: 'barbershop',
  label: 'Barbería',
  keywords: ['barberia', 'barber', 'barbero', 'barba'],
  goal: 'bookings',
  recommended: ['dark_craft', 'minimal_premium', 'personal_brand'],
  showcaseLine: 'Para una barbería funciona algo con carácter: oscuro, cuidado y con buena fotografía.',
  tagline: 'Cortes clásicos con oficio moderno.'
},
{
  id: 'pets',
  label: 'Mascotas',
  keywords: ['veterinari', 'mascota', 'perro', 'gato', 'grooming', 'peluqueria canina', ' pet '],
  goal: 'appointments',
  recommended: ['warm_care', 'local_friendly', 'soft_beauty'],
  showcaseLine: 'Para mascotas lo que más convence es la confianza: algo cálido y cercano.',
  tagline: 'Cuidamos a tu mejor amigo como parte de la familia.'
},
{
  id: 'beauty',
  label: 'Belleza',
  keywords: ['belleza', 'salon', 'manicur', 'estetica', 'maquillaje', 'spa', 'peluqueria', 'cejas', 'pestanas'],
  goal: 'appointments',
  recommended: ['soft_beauty', 'editorial_luxury', 'minimal_premium'],
  showcaseLine: 'Para belleza buscaría algo suave y aspiracional, que se sienta como tu salón.',
  tagline: 'Belleza serena, hecha con detalle.'
},
{
  id: 'restaurant',
  label: 'Restaurante',
  keywords: ['restaurante', 'cafeteria', 'comida', 'cocina', 'bistro', 'pizzeria', 'cafe', 'bar ', 'restaurantes'],
  goal: 'reservations',
  recommended: ['food_story', 'local_friendly', 'editorial_luxury'],
  showcaseLine: 'Para un restaurante dejaría que la comida hable: fotos grandes y tu carta a mano.',
  tagline: 'Cocina hecha cada día, con calma.'
},
{
  id: 'jewelry',
  label: 'Joyería',
  keywords: ['joyeria', 'joyas', 'boutique', 'accesorios'],
  goal: 'sales',
  recommended: ['editorial_luxury', 'minimal_premium', 'soft_beauty'],
  showcaseLine: 'Para una joyería iría por algo editorial, con mucho aire y detalle.',
  tagline: 'Piezas finas, hechas para durar.'
},
{
  id: 'photographer',
  label: 'Fotografía',
  keywords: ['fotograf', 'fotos', 'camara'],
  goal: 'leads',
  recommended: ['visual_portfolio', 'minimal_premium', 'bold_creative'],
  showcaseLine: 'Para fotografía la página tiene que ser tu galería: tus imágenes primero.',
  tagline: 'Imágenes que cuentan dónde estuviste.'
},
{
  id: 'artist',
  label: 'Arte y diseño',
  keywords: ['artista', 'disenador', 'disenadora', 'ilustra', 'pintor', 'tatuaje', 'tatuador'],
  goal: 'leads',
  recommended: ['bold_creative', 'visual_portfolio', 'personal_brand'],
  showcaseLine: 'Para tu trabajo creativo buscaría algo expresivo que se sienta tuyo.',
  tagline: 'Color, oficio y encargos a medida.'
},
{
  id: 'professional',
  label: 'Servicios profesionales',
  keywords: ['abogad', 'consultor', 'contador', 'asesor', 'psicolog', 'doctor', 'dentist', 'servicios', 'nutricion', 'terapeuta'],
  goal: 'appointments',
  recommended: ['professional_trust', 'personal_brand', 'minimal_premium'],
  showcaseLine: 'Para servicios profesionales lo importante es transmitir confianza desde el primer vistazo.',
  tagline: 'Claridad y acompañamiento en cada paso.'
},
{
  id: 'studio',
  label: 'Estudio',
  keywords: ['arquitect', 'interiorismo', 'interiores', 'estudio'],
  goal: 'leads',
  recommended: ['minimal_premium', 'visual_portfolio', 'professional_trust'],
  showcaseLine: 'Para un estudio, menos es más: espacio, proyectos y contacto directo.',
  tagline: 'Espacios tranquilos, pensados al detalle.'
},
{
  id: 'personal',
  label: 'Marca personal',
  keywords: ['coach', 'creador', 'creadora', 'influencer', 'mentor', 'marca personal', 'profesional independiente', 'freelance'],
  goal: 'leads',
  recommended: ['personal_brand', 'professional_trust', 'bold_creative'],
  showcaseLine: 'Para una marca personal, tú eres el protagonista: cercano y seguro.',
  tagline: 'Te ayudo a dar el siguiente paso.'
},
{
  id: 'store',
  label: 'Tienda',
  keywords: ['tienda', 'producto', 'vendo', 'ropa', 'marca', 'emprendimiento'],
  goal: 'sales',
  recommended: ['product_spotlight', 'editorial_luxury', 'local_friendly'],
  showcaseLine: 'Para una tienda, el producto manda: imágenes claras y un botón para pedir.',
  tagline: 'Productos hechos con cuidado, listos para ti.'
},
{
  id: 'local',
  label: 'Negocio local',
  keywords: ['floreria', 'florist', 'flores', 'ferreteria', 'barrio', 'minimarket', 'negocio local', 'lavanderia'],
  goal: 'visits',
  recommended: ['local_friendly', 'warm_care', 'product_spotlight'],
  showcaseLine: 'Para un negocio de barrio funciona algo cercano y fácil de encontrar.',
  tagline: 'Tu lugar de confianza, a la vuelta de la esquina.'
},
{
  // No exact demo: detected from "soy…/me dedico a…". Families adapt to it.
  id: 'other',
  label: 'Negocio',
  keywords: [],
  goal: 'leads',
  recommended: ['professional_trust', 'local_friendly', 'personal_brand'],
  showcaseLine: 'Tengo un par de estilos que puedo adaptar muy bien a lo que haces',
  tagline: 'Lo que haces, explicado en un vistazo.'
}];


export const goals: {id: string;label: string;keywords: string[];}[] = [
{ id: 'orders', label: 'Recibir pedidos', keywords: ['pedido', 'encargo', 'ordenar'] },
{ id: 'bookings', label: 'Conseguir reservas', keywords: ['reserva', 'turno'] },
{ id: 'appointments', label: 'Agendar citas', keywords: ['cita', 'agendar', 'agenda', 'consulta'] },
{ id: 'reservations', label: 'Reservas de mesa', keywords: ['mesa'] },
{ id: 'sales', label: 'Vender más', keywords: ['vender', 'ventas', 'comprar'] },
{ id: 'leads', label: 'Conseguir clientes', keywords: ['clientes', 'contacten', 'contactos', 'contacto'] },
{ id: 'visits', label: 'Atraer visitas', keywords: ['visiten', 'visitas', 'lleguen'] },
{ id: 'showcase', label: 'Mostrar mi trabajo', keywords: ['mostrar propiedades', 'mostrar mis propiedades', 'mostrar mi trabajo', 'portafolio'] }];


export const channels: {id: ChannelId;label: string;keywords: string[];cta: string;}[] = [
{ id: 'whatsapp', label: 'WhatsApp', keywords: ['whatsapp', 'wsp', 'whats', 'wasap'], cta: 'Escríbenos por WhatsApp' },
{ id: 'instagram', label: 'Instagram', keywords: ['instagram', ' insta '], cta: 'Escríbenos en Instagram' },
{ id: 'phone', label: 'Teléfono', keywords: ['telefono', 'llamada', 'llamen', 'llamar', 'celular'], cta: 'Llámanos ahora' },
{ id: 'email', label: 'Email', keywords: ['email', 'correo', 'mail'], cta: 'Escríbenos un correo' }];


export const businessChips: ChatOption[] = [
{ label: 'Mascotas', message: 'Tengo un negocio de mascotas' },
{ label: 'Belleza', message: 'Tengo un salón de belleza' },
{ label: 'Restaurantes', message: 'Tengo un restaurante' },
{ label: 'Servicios', message: 'Ofrezco servicios profesionales' },
{ label: 'Tienda', message: 'Tengo una tienda' },
{ label: 'Profesional', message: 'Quiero una página para mi marca personal' }];


export const quickActions: ChatOption[] = [
{ label: '¿Qué es Cripqer?', message: '¿Qué es Cripqer?' },
{ label: '¿Qué puedo crear?', message: '¿Qué puedo crear?' },
{ label: 'Muéstrame un ejemplo', message: 'Muéstrame un ejemplo' },
{ label: 'Quiero crear mi página', message: 'Quiero crear mi página' }];


/** Contextual business-type options the assistant shows only when the type is unknown. */
export const businessOptions: ChatOption[] = [
{ label: 'Mascotas', message: 'Tengo un negocio de mascotas' },
{ label: 'Belleza', message: 'Tengo un salón de belleza' },
{ label: 'Restaurante', message: 'Tengo un restaurante' },
{ label: 'Servicios', message: 'Ofrezco servicios profesionales' },
{ label: 'Tienda', message: 'Tengo una tienda' },
{ label: 'Profesional', message: 'Quiero una página para mi marca personal' },
{ label: 'Otro', message: 'Es otro tipo de negocio' }];


export const channelOptions: ChatOption[] = [
{ label: 'WhatsApp', message: 'Por WhatsApp' },
{ label: 'Instagram', message: 'Por Instagram' },
{ label: 'Llamadas', message: 'Que me llamen por teléfono' },
{ label: 'Email', message: 'Por email' }];


export const conversationIdeas: string[] = [
'Muéstrame las plantillas que vi al principio',
'Me gustó la negra que vi al principio',
'Muéstrame algo más elegante',
'Muéstrame otra parecida',
'Ya, créamela'];