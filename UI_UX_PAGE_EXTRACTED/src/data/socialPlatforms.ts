import type { SocialPlatform } from '../types/editor';

export const socialPlatforms: {id: SocialPlatform;label: string;placeholder: string;}[] = [
{ id: 'instagram', label: 'Instagram', placeholder: 'instagram.com/usuario' },
{ id: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@usuario' },
{ id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@canal' },
{ id: 'whatsapp', label: 'WhatsApp', placeholder: 'wa.me/34600000000' },
{ id: 'email', label: 'Email', placeholder: 'hola@tudominio.com' },
{ id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/usuario' },
{ id: 'web', label: 'Web', placeholder: 'tudominio.com' },
{ id: 'phone', label: 'Teléfono', placeholder: '+34 600 000 000' }];


export const socialLabel = (id: SocialPlatform): string => socialPlatforms.find((p) => p.id === id)?.label ?? 'Red social';