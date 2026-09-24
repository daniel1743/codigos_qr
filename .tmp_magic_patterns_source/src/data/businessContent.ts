import { images } from './images';
import type { SocialPlatform } from '../types/editor';

export const bizProfile = {
  brand: 'Áurea · estética avanzada',
  title: 'Tu piel, en las mejores manos.',
  text: 'Tratamientos faciales y corporales pensados para realzar tu piel con naturalidad, criterio médico y un trato cercano.',
  cta: 'Reservar valoración',
  cta2: 'Ver tratamientos',
  byline: 'Dra. Carmen Vidal · Directora médica'
};

export const bizSocials: {platform: SocialPlatform;href: string;}[] = [
{ platform: 'instagram', href: 'https://instagram.com/clinicaaurea' },
{ platform: 'whatsapp', href: 'https://wa.me/34910000000' },
{ platform: 'web', href: 'https://clinicaaurea.es' }];


export const bizServices = [
{ title: 'Valoración personalizada', desc: 'Analizamos tu piel y diseñamos un plan a tu medida. La primera visita es gratuita.', cta: 'Reservar', price: 'Gratuita', img: images.bizPortrait, icon: 'calendar' },
{ title: 'Tratamientos faciales', desc: 'Hidratación profunda, luminosidad y firmeza con aparatología de última generación.', cta: 'Ver tratamientos', price: 'desde 90 €', img: images.bizFacial, icon: 'sparkles' },
{ title: 'La clínica', desc: 'Un espacio sereno en el barrio de Salamanca, pensado para que desconectes.', cta: 'Conócenos', price: 'Madrid', img: images.bizClinic, icon: 'home' },
{ title: 'Rutina en casa', desc: 'Cosmética seleccionada por nuestro equipo para prolongar tus resultados.', cta: 'Ver productos', price: 'desde 34 €', img: images.bizProducts, icon: 'droplet' }];


export const bizCta = {
  title: 'Tu primera valoración es gratuita',
  sub: 'Reserva en un minuto por WhatsApp. Te respondemos el mismo día.',
  secondary: [
  { label: 'Llamar a la clínica', sub: '910 000 000', icon: 'phone' },
  { label: 'Escribir un email', sub: 'hola@clinicaaurea.es', icon: 'mail' }]

};

export const bizResults = [images.bizResult, images.bizFacial, images.bizProducts];

export const bizLocation = {
  title: 'Visítanos',
  name: 'Clínica Áurea',
  address: 'Calle de Serrano 48, 2º · 28001 Madrid',
  hours: 'Lunes a viernes 10:00–20:00 · Sábados 10:00–14:00'
};