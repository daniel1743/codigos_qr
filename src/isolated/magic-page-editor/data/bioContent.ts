import { images } from './images';
import type { SocialPlatform } from '../types/editor';

export const bioProfile = {
  name: 'Marina Solé',
  role: 'Creadora · Viajes lentos · Barcelona',
  bio: 'Comparto lugares, recetas y rutinas sencillas para vivir con más calma. Guías, colaboraciones y todo lo que hago, en un solo sitio.',
  script: 'Menos prisa, más lugar'
};

export const bioSocials: {platform: SocialPlatform;href: string;}[] = [
{ platform: 'instagram', href: 'https://instagram.com/marinasole' },
{ platform: 'tiktok', href: 'https://tiktok.com/@marinasole' },
{ platform: 'youtube', href: 'https://youtube.com/@marinasole' },
{ platform: 'whatsapp', href: 'https://wa.me/34600000000' },
{ platform: 'email', href: 'mailto:hola@marinasole.com' }];


export const bioLinks = [
{ label: 'Colaboremos', sub: 'Marcas, hoteles y proyectos editoriales', href: 'https://marinasole.com/colaborar', icon: 'calendar' },
{ label: 'Guía: Costa Brava en 5 días', sub: 'Descarga gratuita en PDF', href: 'https://marinasole.com/guia', icon: 'book' },
{ label: 'Carta de los domingos', sub: 'Mi newsletter semanal, sin prisa', href: 'https://marinasole.com/carta', icon: 'mail' },
{ label: 'Escríbeme por WhatsApp', sub: 'Respondo en 24 h', href: 'https://wa.me/34600000000', icon: 'chat' }];


export const bioFeatured = [
{ tag: 'Guía', title: 'Lugares tranquilos', desc: 'Rincones del Mediterráneo sin multitudes.', img: images.bioStreet },
{ tag: 'Recetas', title: 'Mesa lenta', desc: 'Desayunos sencillos de temporada.', img: images.bioTable }];


export const bioMoments = [images.bioStill, images.bioHero, images.bioStreet];