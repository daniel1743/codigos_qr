import React from 'react';

interface PanelSectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

export function PanelSection({ title, hint, children }: PanelSectionProps) {
  return (
    <section className="space-y-2.5 [&+&]:mt-5">
      <div>
        <h4 className="text-[12.5px] font-semibold text-ink">{title}</h4>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-mute">{hint}</p>}
      </div>
      {children}
    </section>);

}