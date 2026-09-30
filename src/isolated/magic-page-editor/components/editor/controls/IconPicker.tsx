import React, { useMemo, useState } from 'react';
import { SearchIcon, CheckIcon, CalendarDaysIcon, MailIcon, PhoneIcon, MapPinIcon, MessageCircleIcon, InstagramIcon, YoutubeIcon, LinkedinIcon, GlobeIcon, StoreIcon, ShoppingBagIcon, HeartIcon, StarIcon, SparklesIcon, HomeIcon, UserRoundIcon, PawPrintIcon, UtensilsIcon, StethoscopeIcon, WrenchIcon, ZapIcon, BriefcaseBusinessIcon, BookOpenIcon, CameraIcon, GiftIcon, CircleHelpIcon, type LucideIcon } from 'lucide-react';
import { cx } from '../../../utils/cx';

export type IconId = 'calendar' | 'mail' | 'phone' | 'location' | 'whatsapp' | 'instagram' | 'youtube' | 'linkedin' | 'web' | 'store' | 'shopping' | 'heart' | 'star' | 'sparkles' | 'home' | 'user' | 'pets' | 'food' | 'health' | 'services' | 'electricity' | 'business' | 'book' | 'camera' | 'gift' | 'help';
export const iconLibrary: { id: IconId; label: string; category: string; Icon: LucideIcon; keywords: string }[] = [
  ['calendar', 'Calendario', 'Calendario', CalendarDaysIcon, 'cita reserva fecha'], ['mail', 'Email', 'Contacto', MailIcon, 'correo email contacto'], ['phone', 'Teléfono', 'Contacto', PhoneIcon, 'llamar teléfono'], ['location', 'Ubicación', 'Ubicación', MapPinIcon, 'mapa dirección ubicación'], ['whatsapp', 'WhatsApp', 'Contacto', MessageCircleIcon, 'whatsapp mensaje'],
  ['instagram', 'Instagram', 'Redes', InstagramIcon, 'social instagram'], ['youtube', 'YouTube', 'Redes', YoutubeIcon, 'social vídeo'], ['linkedin', 'LinkedIn', 'Redes', LinkedinIcon, 'social profesional'], ['web', 'Web', 'Redes', GlobeIcon, 'web enlace internet'],
  ['store', 'Tienda', 'Comercio', StoreIcon, 'tienda comercio'], ['shopping', 'Compra', 'Comercio', ShoppingBagIcon, 'comprar comercio'], ['heart', 'Favorito', 'General', HeartIcon, 'amor favorito'], ['star', 'Destacado', 'General', StarIcon, 'estrella destacado'], ['sparkles', 'Brillos', 'Belleza', SparklesIcon, 'belleza brillo'], ['home', 'Casa', 'Servicios', HomeIcon, 'hogar casa'], ['user', 'Persona', 'General', UserRoundIcon, 'persona perfil'], ['pets', 'Mascotas', 'Mascotas', PawPrintIcon, 'mascotas animales'], ['food', 'Comida', 'Comida', UtensilsIcon, 'comida restaurante'], ['health', 'Salud', 'Salud', StethoscopeIcon, 'salud médico'], ['services', 'Herramientas', 'Servicios', WrenchIcon, 'servicio herramienta'], ['electricity', 'Electricidad', 'Electricidad/Hogar', ZapIcon, 'electricidad energía hogar'], ['business', 'Negocio', 'Negocios', BriefcaseBusinessIcon, 'negocio trabajo'], ['book', 'Guía', 'General', BookOpenIcon, 'libro guía'], ['camera', 'Cámara', 'General', CameraIcon, 'foto cámara'], ['gift', 'Regalo', 'Comercio', GiftIcon, 'regalo'], ['help', 'Ayuda', 'General', CircleHelpIcon, 'ayuda información']
].map(([id, label, category, Icon, keywords]) => ({ id: id as IconId, label: label as string, category: category as string, Icon: Icon as LucideIcon, keywords: keywords as string }));

export function iconForId(id: string | undefined): LucideIcon { return iconLibrary.find((item) => item.id === id)?.Icon ?? CircleHelpIcon; }

export function IconPicker({ value = 'sparkles', onChange }: { value?: string; onChange: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => iconLibrary.filter((item) => `${item.label} ${item.category} ${item.keywords}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <div className="space-y-3">
    <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar icono" aria-label="Buscar icono" className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[12.5px] outline-none focus:border-select" /></div>
    <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5" role="radiogroup" aria-label="Biblioteca de iconos">
      {filtered.map(({ id, label, Icon }) => <button key={id} type="button" role="radio" aria-label={label} aria-checked={value === id} onClick={() => onChange(id)} className={cx('flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border text-[10px]', value === id ? 'border-select bg-select-soft text-select' : 'border-line text-mute hover:bg-canvas')}><span className="relative"><Icon className="h-5 w-5" />{value === id && <CheckIcon className="absolute -right-3 -top-2 h-3 w-3" />}</span><span>{label}</span></button>)}
    </div>
  </div>;
}
