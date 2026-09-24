import React from 'react';
import { GlobeIcon, MailIcon, PhoneIcon } from 'lucide-react';
import type { SocialPlatform } from '../../types/editor';

interface SocialIconProps {
  platform: SocialPlatform;
  className?: string;
}

export function SocialIcon({ platform, className }: SocialIconProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true
  };
  switch (platform) {
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>);

    case 'youtube':
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10 9.3v5.4l4.6-2.7z" fill="currentColor" stroke="none" />
        </svg>);

    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 3c.5 2.6 2.4 4.4 5 4.6" />
        </svg>);

    case 'linkedin':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3.5" />
          <path d="M8 10.5V16M8 7.8v.01M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16" />
        </svg>);

    case 'whatsapp':
      return (
        <svg {...common}>
          <path d="M3.5 20.5l1.3-4.1a8.5 8.5 0 1 1 3.4 3.1z" />
          <path d="M9 8.8c0 3 2.9 6 6.2 6.2l.9-1.5-1.8-1-1 .9c-1-.4-2-1.4-2.4-2.4l.9-1-1-1.8z" fill="currentColor" stroke="none" />
        </svg>);

    case 'email':
      return <MailIcon className={className} strokeWidth={1.8} aria-hidden />;
    case 'phone':
      return <PhoneIcon className={className} strokeWidth={1.8} aria-hidden />;
    default:
      return <GlobeIcon className={className} strokeWidth={1.8} aria-hidden />;
  }
}