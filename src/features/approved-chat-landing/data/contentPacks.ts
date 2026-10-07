import { IMG } from './images';
import type { ContentPack } from '../types/cripqer';

/**
 * Replaceable content, keyed by business type.
 * A Template Family (visual language) + a Content Pack (business context) = a page.
 */
export const contentPacks: ContentPack[] = [
{
  id: 'pets',
  label: 'Veterinaria',
  content: {
    name: 'Luna Pet Care',
    role: 'Veterinaria y peluquería',
    eyebrow: 'Abierto hoy · 9:00 – 19:00',
    tagline: 'Cuidamos a quien siempre está contigo.',
    about: 'Consultas, vacunas, peluquería y bienestar con un equipo que conoce a cada paciente por su nombre.',
    cta: 'Reservar por WhatsApp',
    services: [
    { title: 'Veterinaria', detail: 'Consulta y control', price: 'Desde $25', icon: 'stethoscope' },
    { title: 'Peluquería', detail: 'Corte y uñas', price: 'Desde $30', icon: 'scissors' },
    { title: 'Baño y spa', detail: 'Sin estrés', price: 'Desde $18', icon: 'bath' },
    { title: 'Productos', detail: 'Alimento y accesorios', price: 'En tienda', icon: 'bag' }],

    reviews: [
    { quote: 'Atendieron a Luna con muchísimo cariño. Nos explicaron todo con calma.', author: 'Carolina M.' },
    { quote: 'Max ya no le tiene miedo al veterinario. El mejor equipo del barrio.', author: 'Javier R.' }],

    links: ['Reservar una cita', 'Ver servicios y precios', 'Cómo llegar'],
    imageCards: [
    { title: 'Consultas', detail: 'Lun – Sáb', image: IMG.vet },
    { title: 'Peluquería', detail: 'Con cita', image: IMG.puppy },
    { title: 'Gatos', detail: 'Sala tranquila', image: IMG.cat }],

    location: { address: 'Calle Los Robles 128', hours: 'Lun – Sáb · 9:00 – 19:00' },
    social: ['Instagram', 'WhatsApp', 'TikTok'],
    videoTitle: 'Un día en la clínica',
    images: { hero: IMG.vet, portrait: IMG.vet, gallery: [IMG.puppy, IMG.cat, IMG.vet] }
  }
},
{
  id: 'barbershop',
  label: 'Barbería',
  content: {
    name: 'Blackwood',
    role: 'Barber studio',
    eyebrow: 'Est. 2014',
    tagline: 'Más que un corte, es tu estilo.',
    about: 'Navaja, toalla caliente y tiempo para ti. Reserva tu silla en segundos.',
    cta: 'Reserva tu hora',
    services: [
    { title: 'Corte clásico', detail: '45 min · lavado incluido', price: '$15', icon: 'scissors' },
    { title: 'Barba premium', detail: '30 min · toalla caliente', price: '$12', icon: 'sparkles' },
    { title: 'Estilo personalizado', detail: '75 min · ritual completo', price: '$24', icon: 'star' }],

    reviews: [
    { quote: 'El mejor fade de la ciudad. Puntuales y con buena música.', author: 'Diego A.' },
    { quote: 'Salgo siempre como nuevo.', author: 'Matías P.' }],

    links: ['Reservar silla', 'Ver servicios', 'Gift card'],
    imageCards: [
    { title: 'El oficio', detail: 'Navaja y tijera', image: IMG.barberTools },
    { title: 'La casa', detail: 'Av. Central 455', image: IMG.barber },
    { title: 'Estilos', detail: 'Nuestro trabajo', image: IMG.barberPortrait }],

    location: { address: 'Av. Central 455', hours: 'Mar – Sáb · 10:00 – 21:00' },
    social: ['Instagram', 'TikTok', 'WhatsApp'],
    videoTitle: 'Detrás de la silla',
    images: { hero: IMG.barberPortrait, portrait: IMG.barberPortrait, gallery: [IMG.barber, IMG.barberTools, IMG.barberPortrait] }
  }
},
{
  id: 'beauty',
  label: 'Salón de belleza',
  content: {
    name: 'Atelier Rosé',
    role: 'Salón de belleza',
    eyebrow: 'Bienvenida',
    tagline: 'Belleza serena, hecha con detalle.',
    about: 'Un espacio tranquilo para cuidarte sin prisa: manos, rostro y peinado.',
    cta: 'Reservar mi cita',
    services: [
    { title: 'Manicure spa', detail: 'Semipermanente y nutrición', price: '$22', icon: 'sparkles' },
    { title: 'Peinado de evento', detail: 'Prueba previa incluida', price: '$40', icon: 'scissors' },
    { title: 'Facial luminoso', detail: 'Limpieza profunda, 60 min', price: '$35', icon: 'flower' }],

    reviews: [
    { quote: 'Salgo siempre sintiéndome otra. El lugar es precioso.', author: 'Paula V.' },
    { quote: 'Detallistas y puntuales.', author: 'Camila R.' }],

    links: ['Reservar cita', 'Ver servicios', 'Regalar una experiencia'],
    imageCards: [
    { title: 'Manos', detail: 'Manicure spa', image: IMG.manicure },
    { title: 'Rostro', detail: 'Faciales', image: IMG.beauty },
    { title: 'Detalles', detail: 'Eventos', image: IMG.jewelry }],

    location: { address: 'Pasaje Las Camelias 12', hours: 'Mar – Sáb · 10:00 – 20:00' },
    social: ['Instagram', 'WhatsApp'],
    videoTitle: 'Nuestro ritual',
    images: { hero: IMG.beauty, portrait: IMG.beauty, gallery: [IMG.manicure, IMG.beauty, IMG.jewelry] }
  }
},
{
  id: 'restaurant',
  label: 'Restaurante',
  content: {
    name: 'Casa Luca',
    role: 'Cucina italiana',
    eyebrow: 'Cocina de temporada',
    tagline: 'Auténtica cocina italiana en tu ciudad.',
    about: 'Ingredientes reales. Sabores que conectan. Pasta fresca hecha cada mañana.',
    cta: 'Pedir por WhatsApp',
    services: [
    { title: 'Pasta', detail: 'Hecha a mano', price: '$12', icon: 'utensils' },
    { title: 'Pizzas', detail: 'Horno de leña', price: '$11', icon: 'pizza' },
    { title: 'Vinos', detail: 'Selección italiana', price: '$6', icon: 'wine' },
    { title: 'Postres', detail: 'De la casa', price: '$7', icon: 'cake' }],

    reviews: [
    { quote: 'La pasta más honesta que he probado fuera de Italia.', author: 'Lucía F.' },
    { quote: 'Un lugar para volver cada semana.', author: 'Andrés T.' }],

    links: ['Ver menú', 'Reservar mesa', 'Pedir delivery'],
    imageCards: [
    { title: 'Pasta fresca', detail: 'Cada mañana', image: IMG.food },
    { title: 'Horno de leña', detail: 'Pizzas', image: IMG.pizza },
    { title: 'El salón', detail: 'Reservas', image: IMG.restaurant }],

    location: { address: 'Av. del Parque 214', hours: 'Mar – Dom · 12:00 – 23:00' },
    social: ['Instagram', 'WhatsApp', 'TikTok'],
    videoTitle: 'Así hacemos la pasta',
    images: { hero: IMG.food, portrait: IMG.restaurant, gallery: [IMG.restaurant, IMG.pizza, IMG.food] }
  },
  familyOverrides: {
    // Same restaurant, told in Local Friendly's neighbourhood voice — not the Food Story demo.
    local_friendly: {
      eyebrow: 'Abierto ahora · cierra 23:00',
      tagline: 'Auténtica cocina italiana cerca de ti.',
      about: 'Luca y su familia cocinan en el barrio desde 2009. Pasta fresca cada mañana, mesas al sol y siempre un saludo en la puerta.',
      cta: 'Reservar por WhatsApp',
      imageCards: [
      { title: 'Pasta fresca', detail: 'Cada mañana', image: IMG.food },
      { title: 'Pizzas', detail: 'Horno de leña', image: IMG.pizza }],

      reviews: [
      { quote: 'Te reciben como en casa. La lasaña del domingo es imperdible.', author: 'Vecina del barrio' },
      { quote: 'Reservé por WhatsApp en un minuto.', author: 'Andrés T.' }],

      images: { hero: IMG.trattoria, portrait: IMG.trattoriaOwner, gallery: [IMG.trattoria, IMG.food, IMG.pizza] }
    }
  }
},
{
  id: 'real_estate',
  label: 'Agente inmobiliaria',
  content: {
    name: 'Camila Rojas',
    role: 'Agente inmobiliaria · Santiago',
    eyebrow: 'Providencia · Ñuñoa · La Reina',
    tagline: 'Encuentra una propiedad que encaje contigo.',
    about: 'Te acompaño a comprar, vender o arrendar con información clara y visitas coordinadas en un solo mensaje.',
    cta: 'Escríbeme por WhatsApp',
    servicesTitle: 'Propiedades destacadas',
    services: [
    { title: 'Casa 4D 3B · La Reina', detail: '220 m² · jardín y quincho', price: 'UF 14.900', icon: 'building' },
    { title: 'Depto 2D 2B · Providencia', detail: '78 m² · vista despejada', price: 'UF 6.450', icon: 'building' },
    { title: 'Depto 1D · Ñuñoa', detail: 'Arriendo · cerca del metro', price: '$520.000', icon: 'building' }],

    reviews: [
    { quote: 'Vendimos en seis semanas y Camila nos explicó cada paso.', author: 'Familia Muñoz' },
    { quote: 'Encontré mi depto sin perder fines de semana en visitas inútiles.', author: 'Tomás R.' }],

    links: ['Ver propiedades', 'Agendar una visita', 'Tasar mi propiedad'],
    imageCards: [
    { title: 'Casa La Reina', detail: 'UF 14.900', image: IMG.house },
    { title: 'Depto Providencia', detail: 'UF 6.450', image: IMG.apartment },
    { title: 'Zonas que atiendo', detail: 'Providencia · Ñuñoa · La Reina', image: IMG.interior }],

    location: { address: 'Providencia, Santiago', hours: 'Visitas Lun – Sáb' },
    social: ['WhatsApp', 'Instagram', 'LinkedIn'],
    videoTitle: 'Recorrido: casa en La Reina',
    images: { hero: IMG.house, portrait: IMG.realtor, gallery: [IMG.house, IMG.apartment, IMG.interior] }
  }
},
{
  id: 'bakery',
  label: 'Pastelería',
  content: {
    name: 'Dulce Abril',
    role: 'Pastelería de autor',
    eyebrow: 'Pedidos con 48 h',
    tagline: 'Tortas personalizadas para cada celebración.',
    about: 'Hacemos tortas, tartas y mesas dulces a pedido, con ingredientes de verdad.',
    cta: 'Pedir por WhatsApp',
    services: [
    { title: 'Tortas', detail: 'Personalizadas', price: 'Desde $30', icon: 'cake' },
    { title: 'Tartas', detail: 'Frutas de temporada', price: 'Desde $18', icon: 'heart' },
    { title: 'Mesas dulces', detail: 'Eventos', price: 'Cotizar', icon: 'sparkles' },
    { title: 'Café', detail: 'Para acompañar', price: '$3', icon: 'coffee' }],

    reviews: [
    { quote: 'La torta de cumpleaños fue lo más comentado de la fiesta.', author: 'Fernanda L.' },
    { quote: 'Preciosa y deliciosa. Repetiré.', author: 'Rocío M.' }],

    links: ['Encargar una torta', 'Ver sabores', 'Mesas dulces'],
    imageCards: [
    { title: 'Tortas', detail: 'A pedido', image: IMG.cake },
    { title: 'Pastelería', detail: 'Todos los días', image: IMG.pastries },
    { title: 'Café', detail: 'En el local', image: IMG.coffeePour }],

    location: { address: 'Calle Abril 77', hours: 'Mar – Dom · 9:00 – 20:00' },
    social: ['Instagram', 'WhatsApp', 'TikTok'],
    videoTitle: 'Decorando una torta',
    images: { hero: IMG.cake, portrait: IMG.pastries, gallery: [IMG.pastries, IMG.cake, IMG.coffeePour] }
  }
},
{
  id: 'professional',
  label: 'Abogada',
  content: {
    name: 'Valeria Ortiz',
    role: 'Abogada laboral y de familia',
    eyebrow: 'Estudio jurídico',
    tagline: 'Claridad legal para decisiones importantes.',
    about: '15 años acompañando a familias y empresas con respuestas directas y honorarios claros desde la primera reunión.',
    cta: 'Agendar una consulta',
    services: [
    { title: 'Asesoría laboral', detail: 'Despidos, contratos y finiquitos', price: '01', icon: 'briefcase' },
    { title: 'Derecho de familia', detail: 'Divorcios, pensiones y tuición', price: '02', icon: 'scale' },
    { title: 'Contratos', detail: 'Redacción y revisión', price: '03', icon: 'file' }],

    reviews: [
    { quote: 'Me explicó cada paso sin tecnicismos. Resolvimos en semanas lo que creía imposible.', author: 'Andrés P., cliente' },
    { quote: 'Seria, cercana y muy clara.', author: 'Marcela D.' }],

    links: ['Agendar consulta', 'Áreas de práctica', 'Escribir por email'],
    imageCards: [
    { title: 'Laboral', detail: 'Empresas y personas', image: IMG.lawyer },
    { title: 'Familia', detail: 'Con cuidado', image: IMG.interior }],

    location: { address: 'Torre Norte, piso 9', hours: 'Lun – Vie · 9:00 – 18:00' },
    social: ['LinkedIn', 'Email', 'Teléfono'],
    videoTitle: 'Cómo trabajo',
    images: { hero: IMG.lawyer, portrait: IMG.lawyer, gallery: [IMG.interior, IMG.lawyer] }
  }
},
{
  id: 'personal',
  label: 'Coach',
  content: {
    name: 'Daniel Reyes',
    role: 'Coach & mentor',
    eyebrow: '@danielreyes',
    tagline: 'Una vida con más propósito es posible.',
    about: 'Te acompaño a crear hábitos, enfoque y una vida alineada con lo que realmente te importa.',
    cta: 'Trabaja conmigo',
    services: [
    { title: 'Coaching personal', detail: 'Sesiones 1:1', price: '$80', icon: 'users' },
    { title: 'Hábitos', detail: 'Programa 8 semanas', price: '$640', icon: 'leaf' },
    { title: 'Bienestar emocional', detail: 'Talleres', price: '$40', icon: 'heart' }],

    reviews: [
    { quote: 'Cambió cómo organizo mi semana y mi energía.', author: 'Marta S.' },
    { quote: 'Directo, humano y muy práctico.', author: 'Iván C.' }],

    links: ['Agenda una sesión 1:1', 'Programa Hábitos en 8 semanas', 'Podcast: Vivir con intención'],
    imageCards: [
    { title: 'Sesiones 1:1', detail: 'Online', image: IMG.coach },
    { title: 'Talleres', detail: 'Presenciales', image: IMG.interior }],

    location: { address: 'Online y en Santiago', hours: 'Lun – Vie' },
    social: ['Instagram', 'YouTube', 'LinkedIn', 'TikTok'],
    videoTitle: 'Mi método en 2 minutos',
    images: { hero: IMG.coach, portrait: IMG.coach, gallery: [IMG.coach, IMG.interior] }
  }
},
{
  id: 'store',
  label: 'Marca de café',
  content: {
    name: 'Tostado Sur',
    role: 'Café de especialidad',
    eyebrow: 'Nuevo lote',
    tagline: 'Café de especialidad, tostado esta semana.',
    about: 'Granos de origen único, tostados en pequeños lotes y despachados el mismo día.',
    cta: 'Pedir por WhatsApp',
    services: [
    { title: 'Origen Huila', detail: '250 g · panela', price: '$12', icon: 'coffee' },
    { title: 'Blend Casa', detail: '250 g · chocolate', price: '$10', icon: 'package' },
    { title: 'Suscripción', detail: 'Cada 15 días', price: '$20', icon: 'leaf' }],

    reviews: [
    { quote: 'Cambió mis mañanas. El Huila es increíble.', author: 'Tomás G.' },
    { quote: 'Llega rapidísimo y fresco.', author: 'Sofía K.' }],

    links: ['Ver productos', 'Suscripción', 'Venta mayorista'],
    imageCards: [
    { title: 'Origen Huila', detail: '$12 · 250 g', image: IMG.coffee },
    { title: 'Barra', detail: 'Métodos', image: IMG.coffeePour },
    { title: 'Para acompañar', detail: 'Pastelería', image: IMG.pastries }],

    location: { address: 'Envíos a todo el país', hours: 'Despacho en 24 h' },
    social: ['Instagram', 'TikTok', 'WhatsApp'],
    videoTitle: 'Del grano a tu taza',
    images: { hero: IMG.coffee, portrait: IMG.coffeePour, gallery: [IMG.coffeePour, IMG.coffee, IMG.pastries] }
  }
},
{
  id: 'studio',
  label: 'Estudio de arquitectura',
  content: {
    name: 'Estudio Lumen',
    role: 'Arquitectura e interiores',
    eyebrow: 'Est. 2011',
    tagline: 'Diseñamos espacios tranquilos, pensados para quedarse.',
    about: 'Trabajamos pocos proyectos al año para dedicar a cada uno el tiempo que merece: vivienda, hospitalidad y espacios de trabajo.',
    cta: 'Conversemos tu proyecto',
    services: [
    { title: 'Vivienda', detail: 'Obra nueva', price: '', icon: 'building' },
    { title: 'Interiores', detail: 'Remodelación', price: '', icon: 'palette' }],

    reviews: [{ quote: 'Entendieron la casa antes que nosotros.', author: 'Familia Soto' }],
    links: ['Proyectos', 'Estudio', 'Contacto'],
    imageCards: [
    { title: 'Casa Ladera', detail: '2025', image: IMG.architecture },
    { title: 'Depto. Lastarria', detail: '2024', image: IMG.interior }],

    location: { address: 'Barrio Italia, Santiago', hours: 'Con cita previa' },
    social: ['Instagram', 'Email', 'LinkedIn'],
    videoTitle: 'Casa Ladera, recorrido',
    images: { hero: IMG.architecture, portrait: IMG.interior, gallery: [IMG.interior, IMG.architecture, IMG.landscape] }
  }
},
{
  id: 'artist',
  label: 'Artista',
  content: {
    name: 'Mara Quintero',
    role: 'Pintora & ilustradora',
    eyebrow: 'Nueva serie 2026',
    tagline: 'Pinto en grande y en azul.',
    about: 'Murales, obra sobre tela y encargos para marcas con algo que decir.',
    cta: 'Pedir un encargo',
    services: [
    { title: 'Murales', detail: 'Interior y exterior', price: '', icon: 'brush' },
    { title: 'Obra', detail: 'Sobre tela', price: '', icon: 'palette' }],

    reviews: [{ quote: 'Transformó por completo nuestra oficina.', author: 'Estudio Norte' }],
    links: ['Ver obra', 'Encargos', 'Prensa'],
    imageCards: [
    { title: 'Serie Azul', detail: '2026', image: IMG.artist },
    { title: 'Murales', detail: 'Encargos', image: IMG.landscape }],

    location: { address: 'Taller abierto los sábados', hours: '11:00 – 15:00' },
    social: ['Instagram', 'TikTok', 'Email'],
    videoTitle: 'Pintando Serie Azul',
    images: { hero: IMG.artist, portrait: IMG.artist, gallery: [IMG.artist, IMG.landscape, IMG.bouquet] }
  }
},
{
  id: 'local',
  label: 'Florería de barrio',
  content: {
    name: 'Flores Doña Rosa',
    role: 'Florería de barrio',
    eyebrow: 'Abierto ahora · cierra 19:00',
    tagline: 'Ramos frescos todos los días, a la vuelta de tu casa.',
    about: 'Desde 1998 armamos ramos para cumpleaños, aniversarios y para el martes porque sí. Pásate a saludar o encarga el tuyo.',
    cta: 'Encargar un ramo',
    services: [
    { title: 'Ramos', detail: 'Del día', price: 'Desde $15', icon: 'flower' },
    { title: 'Plantas', detail: 'Interior', price: 'Desde $8', icon: 'leaf' }],

    reviews: [
    { quote: 'Siempre aciertan. El ramo llegó perfecto y a tiempo.', author: 'Vecina feliz' },
    { quote: 'La mejor atención del barrio.', author: 'Jorge V.' }],

    links: ['Encargar ramo', 'Ver flores del día'],
    imageCards: [
    { title: 'Ramos del día', detail: 'Desde $15', image: IMG.bouquet },
    { title: 'La tienda', detail: 'Maipú 342', image: IMG.florist }],

    location: { address: 'Calle Maipú 342, esquina Prat', hours: 'Lun – Sáb · 8:30 – 19:00' },
    social: ['WhatsApp', 'Instagram'],
    videoTitle: 'Armando un ramo',
    images: { hero: IMG.florist, portrait: IMG.florist, gallery: [IMG.bouquet, IMG.florist] }
  }
},
{
  id: 'jewelry',
  label: 'Joyería',
  content: {
    name: 'Auría',
    role: 'Jewelry',
    eyebrow: 'Colección Otoño · N.º 12',
    tagline: 'Detalles que cuentan tu historia.',
    about: 'Joyería atemporal para momentos reales. Oro de 18k terminado a mano.',
    cta: 'Ver colección',
    services: [
    { title: 'Anillos', detail: 'Oro 18k', price: 'Desde $140', icon: 'gem' },
    { title: 'Collares', detail: 'Oro 18k', price: 'Desde $180', icon: 'sparkles' }],

    reviews: [{ quote: 'Una pieza para toda la vida. Impecable.', author: 'Isabel L.' }],
    links: ['Ver colección', 'Agendar visita al showroom'],
    imageCards: [
    { title: 'Anillo Soleil', detail: '$140', image: IMG.rings },
    { title: 'Collar Lune', detail: '$180', image: IMG.jewelry },
    { title: 'Edición Rosé', detail: '$120', image: IMG.beauty }],

    location: { address: 'Showroom con cita', hours: 'Lun – Vie' },
    social: ['Instagram', 'WhatsApp'],
    videoTitle: 'Hecho a mano',
    images: { hero: IMG.jewelry, portrait: IMG.jewelry, gallery: [IMG.rings, IMG.jewelry, IMG.beauty] }
  }
},
{
  id: 'photographer',
  label: 'Fotógrafo',
  content: {
    name: 'Andrés Vela',
    role: 'Fotografía de paisaje',
    eyebrow: 'Portfolio',
    tagline: 'Luz de montaña, paciencia y lugares que pocos ven.',
    about: 'Disponible para encargos editoriales y proyectos de turismo.',
    cta: 'Escribir a Andrés',
    services: [{ title: 'Editorial', detail: 'Revistas y marcas', price: '', icon: 'camera' }],
    reviews: [{ quote: 'Sus imágenes hicieron nuestra campaña.', author: 'Revista Altura' }],
    links: ['Ver series', 'Prints', 'Contacto'],
    imageCards: [
    { title: 'Cordillera', detail: '2025', image: IMG.landscape },
    { title: 'Arquitectura', detail: '2024', image: IMG.architecture }],

    location: { address: 'Basado en Puerto Varas', hours: '' },
    social: ['Instagram', 'Email', 'Web'],
    videoTitle: 'Patagonia, 4K',
    images: { hero: IMG.landscape, portrait: IMG.landscape, gallery: [IMG.architecture, IMG.interior, IMG.restaurant, IMG.bouquet] }
  }
}];


/** Discover-screen category chips → business type / content pack. */
export const discoverCategories: {id: string;label: string;typeId: string | null;icon: string;}[] = [
{ id: 'all', label: 'Todos', typeId: null, icon: 'grid' },
{ id: 'pets', label: 'Mascotas', typeId: 'pets', icon: 'paw' },
{ id: 'beauty', label: 'Belleza', typeId: 'beauty', icon: 'flower' },
{ id: 'restaurant', label: 'Restaurantes', typeId: 'restaurant', icon: 'utensils' },
{ id: 'professional', label: 'Servicios', typeId: 'professional', icon: 'briefcase' },
{ id: 'store', label: 'Tienda', typeId: 'store', icon: 'bag' },
{ id: 'personal', label: 'Profesional', typeId: 'personal', icon: 'users' }];