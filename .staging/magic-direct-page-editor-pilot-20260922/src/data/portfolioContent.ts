import { images } from './images';
import type { SocialPlatform } from '../types/editor';

export const pfProfile = {
  studio: 'Olmo Estudio',
  place: 'Madrid — 2026',
  kicker: 'Andrés Olmo · Fotografía de arquitectura e interiores',
  title: 'Luz, materia\ny silencio.',
  cta: 'Ver proyectos'
};

export const pfStatement = {
  label: 'Estudio',
  body: 'Fotografío espacios que se entienden en silencio: cómo entra la luz, qué pesa la materia, cuánto tarda una sombra en cruzar un muro.',
  sub: 'Trabajo con estudios de arquitectura, interioristas y editoriales en España y Portugal. Encargos a partir de noviembre.'
};

export const pfGallery = [images.pfArch, images.pfVilla, images.pfStair, images.bioStill];

export const pfProjects = [
{ title: 'Casa Albar', meta: 'Vivienda unifamiliar · Menorca', year: '2026', img: images.pfVilla },
{ title: 'Estudio Cal', meta: 'Interiorismo · Madrid', year: '2025', img: images.pfArch },
{ title: 'Escalera Norte', meta: 'Detalle arquitectónico · Bilbao', year: '2025', img: images.pfStair }];


export const pfContact = {
  title: '¿Tienes un proyecto en mente?',
  sub: 'Cuéntame el espacio, los plazos y el uso de las imágenes. Respondo en 48 horas.',
  cta: 'Solicitar presupuesto',
  cta2: 'Descargar portfolio (PDF)'
};

export const pfSocials: {platform: SocialPlatform;href: string;}[] = [
{ platform: 'instagram', href: 'https://instagram.com/olmoestudio' },
{ platform: 'linkedin', href: 'https://linkedin.com/in/andresolmo' },
{ platform: 'email', href: 'mailto:estudio@olmo.photo' },
{ platform: 'web', href: 'https://olmo.photo' }];