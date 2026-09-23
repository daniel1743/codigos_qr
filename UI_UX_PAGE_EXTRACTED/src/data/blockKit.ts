import {
  AlignLeftIcon,
  AtSignIcon,
  CircleUserRoundIcon,
  ImageIcon,
  ImagesIcon,
  LayoutPanelTopIcon,
  LayoutGridIcon,
  MapPinIcon,
  MousePointerClickIcon,
  PlayCircleIcon } from
'lucide-react';
import type { BlockKitItem, BlockType } from '../types/editor';

export const blockKit: BlockKitItem[] = [
{ type: 'hero', label: 'Portada', description: 'Imagen, título y presentación', icon: LayoutPanelTopIcon },
{ type: 'profile', label: 'Perfil', description: 'Avatar, nombre y descripción', icon: CircleUserRoundIcon },
{ type: 'text', label: 'Texto', description: 'Título y párrafo', icon: AlignLeftIcon },
{ type: 'links', label: 'Enlaces / CTA', description: 'Botones y bloques de acción', icon: MousePointerClickIcon },
{ type: 'social', label: 'Redes sociales', description: 'Iconos a tus perfiles', icon: AtSignIcon },
{ type: 'image', label: 'Imagen', description: 'Una imagen destacada', icon: ImageIcon },
{ type: 'gallery', label: 'Galería', description: 'Varias imágenes juntas', icon: ImagesIcon },
{ type: 'video', label: 'Vídeo', description: 'YouTube, Vimeo o archivo', icon: PlayCircleIcon },
{ type: 'collection', label: 'Colección', description: 'Servicios, productos, proyectos…', icon: LayoutGridIcon },
{ type: 'location', label: 'Ubicación', description: 'Mapa y dirección', icon: MapPinIcon }];


export const blockLabels: Record<BlockType, string> = {
  hero: 'Portada',
  profile: 'Perfil',
  text: 'Texto',
  links: 'Enlaces',
  social: 'Redes',
  image: 'Imagen',
  gallery: 'Galería',
  video: 'Vídeo',
  collection: 'Colección',
  location: 'Ubicación'
};