import React, { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import {
  SearchIcon, CheckIcon, CalendarDaysIcon, MailIcon, PhoneIcon, MapPinIcon,
  MessageCircleIcon, InstagramIcon, YoutubeIcon, LinkedinIcon, GlobeIcon,
  StoreIcon, ShoppingBagIcon, HeartIcon, StarIcon, SparklesIcon, HomeIcon,
  UserRoundIcon, PawPrintIcon, UtensilsIcon, StethoscopeIcon, WrenchIcon,
  ZapIcon, BriefcaseBusinessIcon, BookOpenIcon, CameraIcon, GiftIcon,
  CircleHelpIcon, FacebookIcon, Music2Icon, HammerIcon, PencilIcon, EyeIcon,
  ExternalLinkIcon, type LucideIcon,
} from 'lucide-react';
import { cx } from '../../../utils/cx';

export type IconId = string;
type PickerIcon = LucideIcon;
type ExtraIconDefinition = readonly [string, string, string, string, string];

function lazyIcon(name: string): PickerIcon {
  const exportName = `${name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Icon`;
  return (LucideIcons as unknown as Record<string, PickerIcon>)[exportName] ?? CircleHelpIcon;
}

/** Expanded Lucide catalogue. Extra icons are lazy-loaded one SVG at a time. */
const extraIconDefinitions: readonly ExtraIconDefinition[] = [
  ['accessibility', 'Accesibilidad', 'Personas', 'accessibility', 'accesible inclusión'],
  ['activity', 'Actividad', 'General', 'activity', 'movimiento actividad'],
  ['alarm', 'Alarma', 'Tiempo', 'alarm-clock', 'alarma aviso'],
  ['archive', 'Archivo', 'Organización', 'archive', 'guardar archivo'],
  ['award', 'Premio', 'General', 'award', 'premio reconocimiento'],
  ['badge', 'Insignia', 'General', 'badge-check', 'badge verificado'],
  ['banknote', 'Billete', 'Finanzas', 'banknote', 'dinero pago'],
  ['bell', 'Campana', 'General', 'bell', 'notificación aviso'],
  ['bike', 'Bicicleta', 'Transporte', 'bike', 'ciclismo bicicleta'],
  ['bluetooth', 'Bluetooth', 'Tecnología', 'bluetooth', 'conexión'],
  ['briefcase', 'Maletín', 'Negocios', 'briefcase', 'trabajo profesional'],
  ['building', 'Edificio', 'Negocios', 'building-2', 'empresa oficina edificio'],
  ['bus', 'Bus', 'Transporte', 'bus', 'autobús transporte'],
  ['cake', 'Pastel', 'Comida', 'cake', 'cumpleaños celebración'],
  ['calculator', 'Calculadora', 'Finanzas', 'calculator', 'contabilidad números'],
  ['car', 'Auto', 'Transporte', 'car', 'coche vehículo'],
  ['check', 'Confirmado', 'General', 'check', 'correcto hecho'],
  ['money', 'Dinero', 'Finanzas', 'circle-dollar-sign', 'precio dinero dólar'],
  ['clipboard', 'Portapapeles', 'Organización', 'clipboard-list', 'lista tareas'],
  ['cloud', 'Nube', 'Tecnología', 'cloud', 'cloud online'],
  ['code', 'Código', 'Tecnología', 'code-2', 'programar desarrollo'],
  ['coffee', 'Café', 'Comida', 'coffee', 'café cafetería'],
  ['compass', 'Brújula', 'Viajes', 'compass', 'orientación explorar'],
  ['contact', 'Contacto', 'Personas', 'contact', 'persona contacto'],
  ['card', 'Tarjeta', 'Finanzas', 'credit-card', 'pago tarjeta'],
  ['database', 'Base de datos', 'Tecnología', 'database', 'datos sistema'],
  ['dog', 'Perro', 'Mascotas', 'dog', 'animal perro'],
  ['dumbbell', 'Entrenamiento', 'Deporte', 'dumbbell', 'gimnasio fitness deporte'],
  ['factory', 'Fábrica', 'Negocios', 'factory', 'industria fábrica'],
  ['file', 'Archivo de texto', 'Documentos', 'file-text', 'documento archivo'],
  ['file-check', 'Documento aprobado', 'Documentos', 'file-check-2', 'validado aprobado'],
  ['file-image', 'Imagen', 'Documentos', 'file-image', 'imagen foto'],
  ['film', 'Película', 'Contenido', 'film', 'cine vídeo'],
  ['fingerprint', 'Huella', 'Seguridad', 'fingerprint', 'identidad seguridad'],
  ['flag', 'Bandera', 'General', 'flag', 'país objetivo'],
  ['flower', 'Flor', 'Naturaleza', 'flower-2', 'flor naturaleza'],
  ['fuel', 'Combustible', 'Transporte', 'fuel', 'gasolina coche'],
  ['gamepad', 'Videojuegos', 'Ocio', 'gamepad-2', 'juegos gaming'],
  ['gem', 'Joya', 'Comercio', 'gem', 'joyería lujo'],
  ['graduation', 'Graduación', 'Educación', 'graduation-cap', 'universidad estudios'],
  ['helping-hand', 'Ayuda', 'Servicios', 'hand-helping', 'ayuda apoyo'],
  ['hard-hat', 'Obra', 'Servicios', 'hard-hat', 'construcción casco albañil'],
  ['headphones', 'Auriculares', 'Contenido', 'headphones', 'audio música'],
  ['hospital', 'Hospital', 'Salud', 'hospital', 'hospital clínica'],
  ['id-card', 'Identificación', 'Personas', 'id-card', 'identidad documento'],
  ['image', 'Imagen', 'Contenido', 'image', 'foto imagen'],
  ['key', 'Llave', 'Servicios', 'key-round', 'llave acceso'],
  ['laptop', 'Ordenador', 'Tecnología', 'laptop', 'computadora trabajo'],
  ['landmark', 'Institución', 'Negocios', 'landmark', 'banco institución'],
  ['languages', 'Idiomas', 'Educación', 'languages', 'idioma traducción'],
  ['leaf', 'Hoja', 'Naturaleza', 'leaf', 'ecología natural'],
  ['library', 'Biblioteca', 'Educación', 'library', 'libros biblioteca'],
  ['lifebuoy', 'Soporte', 'Servicios', 'life-buoy', 'ayuda soporte'],
  ['lightbulb', 'Idea', 'General', 'lightbulb', 'idea consejo'],
  ['link', 'Enlace', 'Redes', 'link-2', 'link enlace'],
  ['checklist', 'Checklist', 'Organización', 'list-checks', 'lista checklist'],
  ['lock', 'Candado', 'Seguridad', 'lock-keyhole', 'privado seguro'],
  ['login', 'Acceso', 'Seguridad', 'log-in', 'entrar iniciar sesión'],
  ['map', 'Mapa', 'Viajes', 'map', 'mapa ubicación'],
  ['map-pin', 'Marcador', 'Viajes', 'map-pinned', 'ubicación lugar'],
  ['megaphone', 'Megáfono', 'Marketing', 'megaphone', 'publicidad anuncio'],
  ['microphone', 'Micrófono', 'Contenido', 'mic-2', 'podcast voz'],
  ['monitor', 'Pantalla', 'Tecnología', 'monitor', 'monitor ordenador'],
  ['mountain', 'Montaña', 'Viajes', 'mountain', 'naturaleza aventura'],
  ['navigation', 'Navegación', 'Viajes', 'navigation', 'ruta dirección'],
  ['newspaper', 'Noticias', 'Contenido', 'newspaper', 'prensa noticias'],
  ['package', 'Paquete', 'Comercio', 'package', 'envío entrega'],
  ['palette', 'Paleta', 'Creatividad', 'palette', 'diseño arte color'],
  ['party', 'Celebración', 'Ocio', 'party-popper', 'fiesta evento'],
  ['pen', 'Pluma', 'Creatividad', 'pen-tool', 'escribir diseño'],
  ['chart', 'Gráfico', 'Negocios', 'pie-chart', 'analítica estadísticas'],
  ['plane', 'Avión', 'Viajes', 'plane', 'vuelo viajar'],
  ['podcast', 'Podcast', 'Contenido', 'podcast', 'audio podcast'],
  ['presentation', 'Presentación', 'Negocios', 'presentation', 'presentación charla'],
  ['printer', 'Impresora', 'Tecnología', 'printer', 'imprimir'],
  ['receipt', 'Recibo', 'Finanzas', 'receipt', 'factura recibo'],
  ['rocket', 'Cohete', 'Negocios', 'rocket', 'lanzamiento startup'],
  ['route', 'Ruta', 'Viajes', 'route', 'camino recorrido'],
  ['salad', 'Ensalada', 'Comida', 'salad', 'comida saludable'],
  ['school', 'Escuela', 'Educación', 'school', 'colegio escuela'],
  ['send', 'Enviar', 'Contacto', 'send', 'enviar compartir'],
  ['shield', 'Escudo', 'Seguridad', 'shield-check', 'seguridad confianza'],
  ['shirt', 'Ropa', 'Comercio', 'shirt', 'moda ropa'],
  ['cart', 'Carrito', 'Comercio', 'shopping-cart', 'comprar tienda'],
  ['smartphone', 'Móvil', 'Tecnología', 'smartphone', 'teléfono móvil'],
  ['smile', 'Sonrisa', 'Personas', 'smile', 'feliz bienestar'],
  ['sparkle', 'Destello', 'Creatividad', 'sparkle', 'brillo premium'],
  ['sun', 'Sol', 'Naturaleza', 'sun', 'sol verano'],
  ['tablet', 'Tablet', 'Tecnología', 'tablet', 'dispositivo'],
  ['tags', 'Etiquetas', 'Comercio', 'tags', 'categorías etiquetas'],
  ['target', 'Objetivo', 'Negocios', 'target', 'meta objetivo'],
  ['ticket', 'Entrada', 'Ocio', 'ticket', 'evento entrada'],
  ['timer', 'Temporizador', 'Tiempo', 'timer', 'tiempo reloj'],
  ['train', 'Tren', 'Transporte', 'train', 'tren viaje'],
  ['trophy', 'Trofeo', 'Deporte', 'trophy', 'ganador premio'],
  ['truck', 'Camión', 'Transporte', 'truck', 'transporte reparto'],
  ['tv', 'Televisión', 'Contenido', 'tv', 'televisión pantalla'],
  ['umbrella', 'Paraguas', 'Viajes', 'umbrella', 'lluvia playa'],
  ['upload', 'Subir', 'Tecnología', 'upload', 'cargar subir'],
  ['wallet', 'Cartera', 'Finanzas', 'wallet-cards', 'dinero cartera'],
  ['watch', 'Reloj', 'Tiempo', 'watch', 'reloj tiempo'],
  ['wifi', 'Wi-Fi', 'Tecnología', 'wifi', 'internet conexión'],
  ['close', 'Cerrar', 'General', 'x', 'cerrar cancelar'],
  ['zoom', 'Ampliar', 'General', 'zoom-in', 'ver ampliar'],
  ['clock', 'Reloj', 'Tiempo', 'clock', 'hora horario'],
  ['crown', 'Corona', 'Premium', 'crown', 'premium destacado'],
  ['flame', 'Fuego', 'General', 'flame', 'popular tendencia'],
  ['globe', 'Globo', 'Viajes', 'globe-2', 'mundo global'],
  ['handshake', 'Acuerdo', 'Negocios', 'handshake', 'colaboración acuerdo'],
  ['house-plus', 'Añadir casa', 'Hogar', 'house-plus', 'casa vivienda'],
  ['notebook', 'Cuaderno', 'Educación', 'notebook-tabs', 'notas apuntes'],
  ['paintbrush', 'Pincel', 'Creatividad', 'paintbrush', 'pintura arte'],
  ['panels', 'Paneles', 'Tecnología', 'panels-top-left', 'dashboard interfaz'],
  ['power', 'Energía', 'Tecnología', 'power', 'encender energía'],
  ['quote', 'Cita', 'Contenido', 'quote', 'frase testimonio'],
  ['ribbon', 'Cinta', 'General', 'ribbon', 'reconocimiento'],
  ['scan', 'Escanear', 'Tecnología', 'scan', 'qr escanear'],
  ['scroll', 'Texto largo', 'Documentos', 'scroll-text', 'documento texto'],
  ['settings', 'Ajustes', 'Tecnología', 'settings-2', 'configuración'],
  ['suitcase', 'Maleta', 'Viajes', 'luggage', 'viaje equipaje'],
  ['thumbs-up', 'Me gusta', 'General', 'thumbs-up', 'like aprobación'],
  ['toolbox', 'Caja de herramientas', 'Servicios', 'tool-case', 'herramientas reparación'],
  ['tree', 'Árbol', 'Naturaleza', 'tree-pine', 'naturaleza bosque'],
  ['user-check', 'Usuario verificado', 'Personas', 'user-round-check', 'perfil verificado'],
  ['video', 'Vídeo', 'Contenido', 'video', 'vídeo cámara'],
  ['wallet-money', 'Billetera', 'Finanzas', 'wallet', 'dinero pago'],
  ['wine', 'Vino', 'Comida', 'wine', 'vino restaurante'],
];

const staticIconDefinitions: readonly (readonly [string, string, string, PickerIcon, string])[] = [
  ['calendar', 'Calendario', 'Calendario', CalendarDaysIcon, 'cita reserva fecha'], ['mail', 'Email', 'Contacto', MailIcon, 'correo email contacto'],
  ['phone', 'Teléfono', 'Contacto', PhoneIcon, 'llamar teléfono'], ['location', 'Ubicación', 'Ubicación', MapPinIcon, 'mapa dirección ubicación'],
  ['whatsapp', 'WhatsApp', 'Contacto', MessageCircleIcon, 'whatsapp mensaje'], ['instagram', 'Instagram', 'Redes', InstagramIcon, 'social instagram'],
  ['youtube', 'YouTube', 'Redes', YoutubeIcon, 'social vídeo'], ['linkedin', 'LinkedIn', 'Redes', LinkedinIcon, 'social profesional'],
  ['web', 'Web', 'Redes', GlobeIcon, 'web enlace internet'], ['store', 'Tienda', 'Comercio', StoreIcon, 'tienda comercio'],
  ['shopping', 'Compra', 'Comercio', ShoppingBagIcon, 'comprar comercio'], ['heart', 'Favorito', 'General', HeartIcon, 'amor favorito'],
  ['star', 'Destacado', 'General', StarIcon, 'estrella destacado'], ['sparkles', 'Brillos', 'Belleza', SparklesIcon, 'belleza brillo'],
  ['home', 'Casa', 'Servicios', HomeIcon, 'hogar casa'], ['user', 'Persona', 'General', UserRoundIcon, 'persona perfil'],
  ['pets', 'Mascotas', 'Mascotas', PawPrintIcon, 'mascotas animales'], ['food', 'Comida', 'Comida', UtensilsIcon, 'comida restaurante'],
  ['health', 'Salud', 'Salud', StethoscopeIcon, 'salud médico'], ['services', 'Herramientas', 'Servicios', WrenchIcon, 'servicio herramienta'],
  ['electricity', 'Electricidad', 'Electricidad/Hogar', ZapIcon, 'electricidad energía hogar'], ['business', 'Negocio', 'Negocios', BriefcaseBusinessIcon, 'negocio trabajo'],
  ['book', 'Guía', 'General', BookOpenIcon, 'libro guía'], ['camera', 'Cámara', 'General', CameraIcon, 'foto cámara'],
  ['gift', 'Regalo', 'Comercio', GiftIcon, 'regalo'], ['help', 'Ayuda', 'General', CircleHelpIcon, 'ayuda información'],
  ['facebook', 'Facebook', 'Redes', FacebookIcon, 'social facebook fb'], ['tiktok', 'TikTok', 'Redes', Music2Icon, 'social tiktok tik tok video'],
  ['carpentry', 'Carpintería', 'Servicios', HammerIcon, 'carpintería madera martillo'], ['write', 'Escribir', 'Contacto', PencilIcon, 'escribir lápiz redacción'],
  ['eye', 'Ver', 'General', EyeIcon, 'ver ojo mirar'], ['external', 'Enlace', 'Redes', ExternalLinkIcon, 'visitar enlace externo'],
];

const staticIcons: { id: string; label: string; category: string; Icon: PickerIcon; keywords: string }[] = staticIconDefinitions.map(([id, label, category, Icon, keywords]) => ({ id, label, category, Icon, keywords }));

export const iconLibrary: { id: string; label: string; category: string; Icon: PickerIcon; keywords: string }[] = [
  ...staticIcons,
  ...extraIconDefinitions.map(([id, label, category, lucideName, keywords]) => ({ id: id!, label: label!, category: category!, Icon: lazyIcon(lucideName!), keywords: keywords! })),
];

export function iconForId(id: string | undefined): PickerIcon {
  return iconLibrary.find((item) => item.id === id)?.Icon ?? CircleHelpIcon;
}

function normalizeQuery(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function IconPicker({ value = 'sparkles', onChange }: { value?: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return iconLibrary;
    return iconLibrary.filter((item) => normalizeQuery(`${item.label} ${item.category} ${item.keywords}`).includes(normalizedQuery));
  }, [query]);

  return <div className="space-y-3">
    <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entre más de 120 iconos" aria-label="Buscar icono" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[12.5px] outline-none focus:border-select" /></div>
    <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5" role="radiogroup" aria-label="Biblioteca de iconos">
      {filtered.map(({ id, label, Icon }) => <button key={id} type="button" role="radio" aria-label={label} aria-checked={value === id} onClick={() => onChange(id)} className={cx('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border text-[10px]', value === id ? 'border-select bg-select-soft text-select' : 'border-line text-mute hover:bg-canvas')}><span className="relative"><Icon className="h-5 w-5" />{value === id && <CheckIcon className="absolute -right-3 -top-2 h-3 w-3" />}</span><span>{label}</span></button>)}
    </div>
    {filtered.length === 0 && <p className="px-2 text-[11px] text-mute">No encontramos ese icono. Prueba otra palabra.</p>}
  </div>;
}
