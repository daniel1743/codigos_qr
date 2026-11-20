import React from 'react';

interface CripqerMarkProps {
  size?: number;
  className?: string;
}

export function CripqerMark({ size = 28, className = '' }: CripqerMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden>
      <path d="M78.3 21.7 A40 40 0 1 0 78.3 78.3" fill="none" stroke="#0D4AA1" strokeWidth="15" />
      <circle cx="53" cy="50" r="17" fill="none" stroke="#D4AF37" strokeWidth="9.5" />
      <path d="M59 57 L72 70" stroke="#D4AF37" strokeWidth="10" />
    </svg>);

}

export function CripqerLogo() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 sm:gap-2.5" aria-label="Cripqer">
      <CripqerMark size={28} className="h-7 w-7 sm:h-[30px] sm:w-[30px]" />
      <span className="font-display text-[17px] font-bold leading-none tracking-[0.02em] text-brand-blue sm:text-[19px]">
        CRIP<span className="text-brand-gold">Q</span>ER
      </span>
    </span>);

}